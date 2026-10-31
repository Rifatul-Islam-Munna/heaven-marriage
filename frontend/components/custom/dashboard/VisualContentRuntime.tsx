'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, Eye, Globe2, Pencil, RotateCcw, Save, Send, X } from 'lucide-react';
import VisualPublishDialog from './VisualPublishDialog';
import {
  applyVisualValue, originalValue, restoreVisualValue, safeVisualPage,
  targetValue, visualTarget,
  type VisualTarget, type VisualEntries, type AdminVisualPage, type PublicVisualPage,
} from '@/lib/visual-content';

const getGroup = (target: VisualTarget): 'global' | 'page' =>
  target.scope === '@global' ? 'global' : 'page';
function differs(a: VisualEntries = {}, b: VisualEntries = {}) {
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].some(key => a[key] !== b[key]);
}
function findTargets(): VisualTarget[] {
  const targets: VisualTarget[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent?.trim() && !node.parentElement?.classList.contains('visual-current-selection')) {
        return NodeFilter.FILTER_REJECT;
      }
      if (node.parentElement?.closest('[data-visual-editor-ui],script,style,noscript,svg,textarea,pre,code,[contenteditable],[data-visual-noedit]')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node: Node | null;
  while ((node = walker.nextNode()) && targets.length < 4000) {
    const target = visualTarget(node as Text, 'text');
    if (target) targets.push(target);
  }
  document.querySelectorAll<HTMLElement>('[placeholder],[aria-label],img[alt]').forEach(el => {
    if (targets.length >= 4000) return;
    for (const kind of ['placeholder', 'aria', 'alt'] as const) {
      const attr = kind === 'aria' ? 'aria-label' : kind;
      if (el.hasAttribute(attr)) {
        const target = visualTarget(el, kind);
        if (target) targets.push(target);
      }
    }
  });
  return targets;
}
function targetAtPoint(event: MouseEvent, deepSearch = false) {
  const element = event.target instanceof Element ? event.target : null;
  if (!element) return null;
  // Precise text selection in headings containing multiple spans / text nodes.
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const textNode = doc.caretPositionFromPoint?.(event.clientX, event.clientY)?.offsetNode ||
    doc.caretRangeFromPoint?.(event.clientX, event.clientY)?.startContainer;
  if (textNode?.nodeType === Node.TEXT_NODE && element.contains(textNode)) {
    const target = visualTarget(textNode as Text, 'text');
    if (target) return target;
  }
  let current: Element | null = element;
  while (current && current !== document.body) {
    if (current instanceof HTMLElement && current.hasAttribute('placeholder')) {
      const target = visualTarget(current, 'placeholder');
      if (target) return target;
    }
    if (current instanceof HTMLImageElement && current.hasAttribute('alt')) {
      const target = visualTarget(current, 'alt');
      if (target) return target;
    }
    for (const child of current.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        const target = visualTarget(child as Text, 'text');
        if (target) return target;
      }
    }
    current = current.parentElement;
  }
  if (element instanceof HTMLElement && element.hasAttribute('aria-label')) {
    return visualTarget(element, 'aria');
  }
  return deepSearch ? findTargets().find(target => element.contains(target.element)) || null : null;
}

export default function VisualContentRuntime() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const path = safeVisualPage(pathname);
  const editMode = !!path && searchParams.get('visualEdit') === '1';
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<AdminVisualPage | null>(null);
  const [selected, setSelected] = useState<VisualTarget | null>(null);
  const [value, setValue] = useState('');
  const [message, setMessage] = useState('');
  const [pendingPublishScope, setPendingPublishScope] = useState<string | null>(null);
  const contents = useRef<{ page: VisualEntries; global: VisualEntries }>({ page: {}, global: {} });
  const changed = useRef(new Set<Node>());
  const selectedRef = useRef<VisualTarget | null>(null);
  const hoveredRef = useRef<HTMLElement | null>(null);

  const refresh = useCallback(() => {
    const entries = contents.current;
    for (const target of findTargets()) {
      const next = entries[getGroup(target)][target.key];
      if (next !== undefined) {
        applyVisualValue(target, next);
        changed.current.add(target.node);
      } else if (changed.current.has(target.node) && selectedRef.current?.node !== target.node) {
        restoreVisualValue(target);
        changed.current.delete(target.node);
      }
    }
  }, []);

  const closeSelection = useCallback(() => {
    const selected = selectedRef.current;
    if (selected) {
      const next = contents.current[getGroup(selected)][selected.key];
      if (next !== undefined) applyVisualValue(selected, next);
      else restoreVisualValue(selected);
      selected.element.classList.remove('visual-current-selection');
    }
    selectedRef.current = null;
    setSelected(null);
  }, []);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    const controller = new AbortController();
    setIsAdmin(false);
    setDocs(null);
    setSelected(null);
    selectedRef.current?.element.classList.remove('visual-current-selection');
    selectedRef.current = null;
    contents.current = { page: {}, global: {} };
    refresh(); // Drop stale overrides when navigating to another page.
    async function load() {
      try {
        let adminData: AdminVisualPage | null = null;
        if (editMode) {
          const r = await fetch('/api/visual-content?mode=admin&path=' + encodeURIComponent(path!), {
            cache: 'no-store', signal: controller.signal,
          });
          if (r.ok) adminData = await r.json() as AdminVisualPage;
        }
        if (!alive) return;
        let page: VisualEntries, global: VisualEntries;
        if (adminData) {
          setIsAdmin(true);
          setDocs(adminData);
          // Draft is the complete snapshot, NOT published+draft. Deleting a key
          // must show the original JSX immediately, before publishing the reset.
          page = adminData.page.draft;
          global = adminData.global.draft;
        } else {
          const r = await fetch('/api/visual-content?path=' + encodeURIComponent(path!), {
            cache: 'no-store', signal: controller.signal,
          });
          if (!r.ok) return;
          const publicData = await r.json() as PublicVisualPage;
          page = publicData.page;
          global = publicData.global;
        }
        if (!alive) return;
        contents.current = { page, global };
        requestAnimationFrame(refresh);
      } catch {
        // Retain current JSX text when backend/content cache is unavailable.
      }
    }
    void load();
    return () => { alive = false; controller.abort(); };
  }, [path, editMode, refresh]);

  useEffect(() => {
    if (!path) return;
    let frame = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(refresh);
    });
    // React can re-render text nodes without replacing their parent element.
    observer.observe(document.body, {
      childList: true, characterData: true, attributes: true,
      attributeFilter: ['placeholder', 'alt', 'aria-label'], subtree: true,
    });
    refresh();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [path, refresh]);

  useEffect(() => {
    if (!isAdmin || !editMode) return;
    const click = (event: MouseEvent) => {
      if (pendingPublishScope) return;
      if ((event.target as Element | null)?.closest?.('[data-visual-editor-ui]')) return;
      // Do not navigate, submit forms, buy anything or interact with live data
      // while the admin is merely choosing page copy to edit.
      event.preventDefault();
      event.stopPropagation();
      const target = targetAtPoint(event, true);
      if (!target) { setMessage('Choose a heading, paragraph, button label or editable attribute.'); return; }
      const previous = selectedRef.current;
      if (previous) {
        const saved = contents.current[getGroup(previous)][previous.key];
        if (saved !== undefined) applyVisualValue(previous, saved);
        else restoreVisualValue(previous);
        previous.element.classList.remove('visual-current-selection');
      }
      selectedRef.current = target;
      target.element.classList.add('visual-current-selection');
      setSelected(target);
      setValue(contents.current[getGroup(target)][target.key] ?? originalValue(target));
      setMessage('');
    };
    const move = (event: MouseEvent) => {
      if (pendingPublishScope) {
        hoveredRef.current?.classList.remove('visual-hover-selection');
        hoveredRef.current = null;
        return;
      }
      if ((event.target as Element | null)?.closest?.('[data-visual-editor-ui]')) {
        hoveredRef.current?.classList.remove('visual-hover-selection');
        hoveredRef.current = null;
        return;
      }
      const target = targetAtPoint(event);
      const el = target?.element || null;
      if (hoveredRef.current === el) return;
      hoveredRef.current?.classList.remove('visual-hover-selection');
      hoveredRef.current = el;
      el?.classList.add('visual-hover-selection');
    };
    const submit = (event: SubmitEvent) => {
      if (!(event.target as Element)?.closest('[data-visual-editor-ui]')) event.preventDefault();
    };
    document.addEventListener('click', click, true);
    document.addEventListener('mousemove', move, true);
    document.addEventListener('submit', submit, true);
    document.documentElement.classList.add('visual-editing-mode');
    return () => {
      document.removeEventListener('click', click, true);
      document.removeEventListener('mousemove', move, true);
      document.removeEventListener('submit', submit, true);
      document.documentElement.classList.remove('visual-editing-mode');
      hoveredRef.current?.classList.remove('visual-hover-selection');
      selectedRef.current?.element.classList.remove('visual-current-selection');
    };
  }, [isAdmin, editMode, pendingPublishScope]);

  function preview(next: string) {
    setValue(next);
    if (selectedRef.current) {
      applyVisualValue(selectedRef.current, next);
      changed.current.add(selectedRef.current.node);
    }
  }

  async function save(method: 'PATCH' | 'DELETE') {
    const target = selectedRef.current;
    if (!target) return;
    setLoading(true); setMessage('');
    try {
      const response = await fetch('/api/visual-content', {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: target.scope, key: target.key, ...(method === 'PATCH' ? { value } : {}) }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw Error(typeof error.message === 'string' ? error.message : 'Save failed');
      }
      const group = getGroup(target);
      const next = { ...contents.current[group] };
      if (method === 'DELETE') delete next[target.key];
      else next[target.key] = value;
      contents.current = { ...contents.current, [group]: next };
      setDocs(previous => previous ? { ...previous,
        [group]: { ...previous[group], draft: next },
      } : previous);
      if (method === 'DELETE') {
        restoreVisualValue(target);
        changed.current.delete(target.node);
        setValue(targetValue(target));
      } else {
        applyVisualValue(target, value);
        changed.current.add(target.node);
      }
      setMessage(method === 'PATCH'
        ? 'Draft saved to MongoDB. Publish when ready.'
        : 'Override removed from draft. Publish to restore default for visitors.');
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed');
    } finally { setLoading(false); }
  }

  async function publish(scope: string) {
    setPendingPublishScope(null);
    setLoading(true); setMessage('');
    try {
      const response = await fetch('/api/visual-content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw Error(error.message || 'Publish failed');
      }
      const r = await fetch('/api/visual-content?mode=admin&path=' + encodeURIComponent(path!), {
        cache: 'no-store',
      });
      if (r.ok) setDocs(await r.json() as AdminVisualPage);
      setMessage('Published! Public cache invalidated; visitors see the new text.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Publish failed'); }
    finally { setLoading(false); }
  }

  if (!isAdmin || !editMode) return null;
  const pageDirty = differs(docs?.page.draft, docs?.page.published);
  const globalDirty = differs(docs?.global.draft, docs?.global.published);
  return <div data-visual-editor-ui="true" className="pointer-events-none fixed inset-0 z-[99999] font-sans text-[#2b252a]">
    <div className="pointer-events-auto absolute left-3 top-20 w-[min(370px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-[#ead5dd] bg-white/95 shadow-2xl backdrop-blur-xl md:left-5">
      <div className="bg-[#251c26] p-4 text-white">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-rose-200"><Pencil size={14}/> Niqaha · Live editor</p>
        <h2 className="mt-2 text-xl font-semibold">Click text to edit</h2>
        <p className="mt-1 text-xs leading-5 text-white/70">Select any static copy. Type in the panel; your edits preview instantly.</p>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2 rounded-lg bg-[#fcf4f6] px-3 py-2 text-xs font-semibold text-[#9c445b]"><Globe2 size={14}/> <span className="truncate">{pathname}</span></div>
        <div className="flex flex-wrap gap-2">
          <a href="/dashboard/visual-editor" className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-neutral-50"><ChevronLeft size={13}/> All pages</a>
          <a href={pathname || '/'} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-neutral-50"><Eye size={13}/> Exit editor</a>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={loading || !pageDirty} onClick={() => setPendingPublishScope(path!)}
            className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-35"><Send size={13}/> Publish page {pageDirty ? '●' : ''}</button>
          <button disabled={loading || !globalDirty} onClick={() => setPendingPublishScope('@global')}
            className="flex items-center gap-1 rounded-lg bg-[#332833] px-3 py-2 text-xs font-semibold text-white disabled:opacity-35"><Send size={13}/> Publish shared {globalDirty ? '●' : ''}</button>
        </div>
        {!selected && message && <p role="status" className="text-xs text-rose-700">{message}</p>}
      </div>
    </div>

    {selected && <aside role="dialog" aria-label="Visual text editor" className="pointer-events-auto absolute bottom-3 right-3 max-h-[min(78vh,580px)] w-[min(440px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-[#ead5dd] bg-white p-5 shadow-2xl md:bottom-5 md:right-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-rose-600">{selected.scope === '@global' ? 'Shared copy · All pages' : 'Page copy'}</p>
          <h3 className="mt-1 text-lg font-bold">Edit {selected.kind === 'text' ? 'text' : selected.kind === 'alt' ? 'image description' : selected.kind === 'aria' ? 'accessibility label' : 'placeholder'}</h3>
        </div>
        <button onClick={closeSelection} aria-label="Close text editor" className="rounded-md border p-1.5 hover:bg-rose-50"><X size={18}/></button>
      </div>
      <div className="mt-4 rounded-lg bg-[#faf7f8] p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8e7883]">Original website text</p>
        <p dir="auto" className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-[#6b6268]">{originalValue(selected) || '(empty)'}</p>
      </div>
      <label htmlFor="visual-text-value" className="mt-4 block text-xs font-bold text-[#64535f]">New text · Arabic, Bangla or English</label>
      <textarea id="visual-text-value" autoFocus dir="auto" value={value} onChange={e => preview(e.target.value)}
        rows={5} maxLength={10000}
        className="mt-2 w-full resize-y rounded-xl border border-[#e3cfd6] px-3 py-3 text-base leading-relaxed outline-rose-500"
        placeholder="Write the new text here..." />
      <p className="mt-1 text-[11px] text-[#8a7d84]">العربية · বাংলা · English. Typography and layout stay in place.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={loading} onClick={() => void save('PATCH')}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-40"><Save size={16}/> Save draft</button>
        <button disabled={loading} onClick={() => void save('DELETE')}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-40"><RotateCcw size={15}/> Restore default</button>
      </div>
      {message && <p role="status" className="mt-3 flex items-start gap-1.5 rounded-lg bg-[#faf0f4] p-3 text-xs leading-5 text-[#884157]"><Check size={14} className="shrink-0"/>{message}</p>}
      <p className="mt-3 text-[10px] text-[#92858c]">Drafts are private. Click Publish page (top left) to update visitors.</p>
    </aside>}
    <VisualPublishDialog
      scope={pendingPublishScope}
      busy={loading}
      onClose={() => setPendingPublishScope(null)}
      onConfirm={scope => void publish(scope)}
      aboveEditor
    />
  </div>;
}
