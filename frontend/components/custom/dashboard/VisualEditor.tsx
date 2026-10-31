'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check, ChevronsUpDown, ExternalLink, Globe2, Layers, Loader2, Monitor, MousePointerClick,
  RefreshCw, RotateCcw, Save, Search, Send, Smartphone, Tablet, TriangleAlert, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { visualPageCatalog } from '@/lib/visual-page-catalog';
import {
  safeVisualPage, type AdminVisualPage, type VisualDoc, type VisualEntries, type VisualKind,
} from '@/lib/visual-content';
import {
  postToFrame, readBridgeMessage, type FrameToEditor, type VisualSelection,
} from '@/lib/visual-editor-bridge';
import { cn } from '@/lib/utils';
import VisualPublishDialog from './VisualPublishDialog';
import {
  DashboardHeader, DashboardPage, DashButton, KpiCard, KpiRow, Panel, PlainHeader, Segmented,
  SortHeader, StatusPill, fieldClass, formatWhen, type SortState,
} from './dashboard-kit';

type SavedPage = {
  scope: string; edits: number; published: number;
  hasUnpublishedChanges: boolean; updatedAt: string | null;
};
type Device = 'desktop' | 'tablet' | 'mobile';
type RowStatus = 'pending' | 'live' | 'original' | 'address';
type PageRow = {
  path: string; label: string; dynamic: boolean; edits: number; live: number;
  status: RowStatus; updatedAt: string | null;
};
type SortKey = 'page' | 'edits' | 'status' | 'updated';
type TableFilter = 'all' | 'pending' | 'live' | 'original';

const GLOBAL = '@global';
const MAX_TEXT = 10000;
const DEVICE_WIDTH: Record<Device, number> = { desktop: 1280, tablet: 834, mobile: 390 };
const KIND_LABEL: Record<VisualKind, string> = {
  text: 'Text', placeholder: 'Input placeholder', alt: 'Image description', aria: 'Accessibility label',
};
const STATUS_ORDER: Record<RowStatus, number> = { pending: 0, live: 1, original: 2, address: 3 };
const catalogLabels = new Map(visualPageCatalog.map(page => [page.path, page.label]));
const editHref = (path: string) => path + '?visualEdit=1';
const darkLink = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-white/20 bg-white/10 px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
const lightLink = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-[#dee2e6] bg-white px-3 py-2 text-[13px] font-medium text-[#212529] transition-colors hover:bg-[#f1f3f5]';

function unionKeys(doc?: VisualDoc) {
  return [...new Set([...Object.keys(doc?.draft || {}), ...Object.keys(doc?.published || {})])];
}
function countChanges(doc?: VisualDoc) {
  const draft: VisualEntries = doc?.draft || {}, live: VisualEntries = doc?.published || {};
  return unionKeys(doc).filter(key => draft[key] !== live[key]).length;
}
function parseAddress(raw: string): string | null {
  let candidate = raw.trim();
  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      if (url.origin !== window.location.origin) return null;
      candidate = url.pathname;
    } catch { return null; }
  }
  if (candidate && !candidate.startsWith('/')) candidate = '/' + candidate;
  return safeVisualPage(candidate);
}
function rowStatus(record: SavedPage | undefined, dynamic: boolean): RowStatus {
  if (dynamic) return 'address';
  if (!record) return 'original';
  if (record.hasUnpublishedChanges) return 'pending';
  return record.edits || record.published ? 'live' : 'original';
}
const STATUS_DOT: Record<RowStatus, [string, string]> = {
  pending: ['bg-amber-500', 'Draft waiting to publish'],
  live: ['bg-emerald-500', 'Custom text is live'],
  original: ['bg-[#ced4da]', 'Original text'],
  address: ['bg-sky-400', 'Needs a specific address'],
};
function StatusDot({ status }: { status: RowStatus }) {
  const [color, title] = STATUS_DOT[status];
  return <span role="img" aria-label={title} title={title} className={cn('inline-block size-2 shrink-0 rounded-full', color)} />;
}
function RowStatusPill({ status }: { status: RowStatus }) {
  if (status === 'pending') return <StatusPill tone="warning">Draft waiting</StatusPill>;
  if (status === 'live') return <StatusPill tone="positive"><Check size={11} /> Live</StatusPill>;
  if (status === 'address') return <StatusPill tone="info">Needs address</StatusPill>;
  return <StatusPill tone="neutral">Original text</StatusPill>;
}

function PagePicker({ path, records, onOpen, request }: {
  path: string; records: Map<string, SavedPage>; onOpen: (next: string) => boolean;
  request: { template: string; n: number } | null;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!request) return;
    setOpen(true);
    setAddress(request.template);
    setError('Add the real ID or name to the end of this address.');
    const timer = window.setTimeout(() => addressRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [request]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!boxRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, [open]);

  const pages = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visualPageCatalog.filter(page => !q || page.label.toLowerCase().includes(q) || page.path.toLowerCase().includes(q));
  }, [query]);
  const submit = () => {
    const valid = parseAddress(address);
    if (!valid) { setError('Use an address on this site, for example /policies/privacy'); return; }
    if (onOpen(valid)) { setOpen(false); setAddress(''); setError(''); setQuery(''); }
  };

  return <div ref={boxRef} className="relative min-w-0 flex-1 sm:flex-none">
    <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(value => !value)}
      className="flex w-full min-w-0 items-center gap-2 rounded-md border border-[#dee2e6] bg-white px-3 py-1.5 text-left hover:bg-[#f8f9fa] focus-visible:outline-2 focus-visible:outline-rose-600 sm:w-[320px]">
      <Globe2 size={15} className="shrink-0 text-[#6c757d]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{catalogLabels.get(path) || 'Specific address'}</span>
        <span className="block truncate font-mono text-[11px] text-[#6c757d]">{path}</span>
      </span>
      <ChevronsUpDown size={15} className="shrink-0 text-[#6c757d]" />
    </button>
    {open && <div role="dialog" aria-label="Choose a page"
      className="absolute left-0 top-full z-30 mt-1 w-[min(420px,calc(100vw-2rem))] rounded-lg border border-[#dee2e6] bg-white shadow-xl">
      <div className="border-b border-[#f0f0f0] p-2">
        <label className="relative block">
          <span className="sr-only">Search pages</span>
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#adb5bd]" />
          <input autoFocus value={query} onChange={event => setQuery(event.target.value)}
            placeholder="Search pages" className={cn(fieldClass, 'py-1.5 pl-8 text-[13px]')} />
        </label>
      </div>
      <ul aria-label="Pages" className="max-h-72 overflow-y-auto p-1">
        {pages.map(page => {
          const active = page.path === path;
          return <li key={page.path}>
            <button type="button" aria-current={active ? 'page' : undefined} onClick={() => {
              if (page.dynamic) {
                setAddress(page.path.replace(/\[[^\]]+\]/g, ''));
                setError('Add the real ID or name to the end of this address.');
                addressRef.current?.focus();
                return;
              }
              if (onOpen(page.path)) { setOpen(false); setQuery(''); }
            }} className={cn('flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left', active ? 'bg-rose-50' : 'hover:bg-[#f8f9fa]')}>
              <StatusDot status={rowStatus(records.get(page.path), page.dynamic)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{page.label}</span>
                <span className="block truncate font-mono text-[11px] text-[#6c757d]">{page.path}</span>
              </span>
              {active && <Check size={14} className="shrink-0 text-rose-600" />}
            </button>
          </li>;
        })}
        {!pages.length && <li className="px-3 py-6 text-center text-[13px] text-[#6c757d]">No page matches “{query}”.</li>}
      </ul>
      <div className="border-t border-[#f0f0f0] p-3">
        <label htmlFor="ve-address" className="mb-1.5 block text-[12px] font-semibold text-[#495057]">Open a specific address</label>
        <div className="flex gap-2">
          <input id="ve-address" ref={addressRef} value={address}
            onChange={event => { setAddress(event.target.value); setError(''); }}
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); submit(); } }}
            placeholder="/biodata/507f1f77bcf86cd799439011" aria-describedby="ve-address-help" aria-invalid={!!error}
            className={cn(fieldClass, 'py-1.5 font-mono text-[12px]')} />
          <DashButton tone="dark" onClick={submit}>Open</DashButton>
        </div>
        <p id="ve-address-help" className={cn('mt-1.5 text-[11px]', error ? 'text-amber-700' : 'text-[#6c757d]')}>
          {error || 'Each exact address keeps its own saved text.'}
        </p>
      </div>
    </div>}
  </div>;
}

function PublishRow({ title, note, changes, busy, onPublish }: {
  title: string; note?: string; changes: number; busy: boolean; onPublish: () => void;
}) {
  return <div className="flex items-center justify-between gap-3 py-2.5">
    <div className="min-w-0">
      <p className="text-[13px] font-medium">{title}{note && <span className="ml-1.5 text-[11px] font-normal text-[#6c757d]">{note}</span>}</p>
      <p className={cn('text-[12px]', changes ? 'text-amber-700' : 'text-[#6c757d]')}>
        {changes ? `${changes} change${changes === 1 ? '' : 's'} waiting to publish` : 'Everything is live'}
      </p>
    </div>
    <DashButton tone={changes ? 'primary' : 'secondary'} disabled={!changes || busy} onClick={onPublish} className="px-2.5 py-1.5 text-[12px]">
      <Send size={12} /> Publish
    </DashButton>
  </div>;
}

function ChangeGroup({ title, note, scope, doc, busy, confirmKey, setConfirmKey, onRestore }: {
  title: string; note: string; scope: string; doc?: VisualDoc; busy: boolean;
  confirmKey: string | null; setConfirmKey: (key: string | null) => void;
  onRestore: (scope: string, key: string) => void;
}) {
  const draft: VisualEntries = doc?.draft || {}, live: VisualEntries = doc?.published || {};
  const keys = unionKeys(doc);
  return <div>
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="text-[13px] font-semibold">{title}</h3>
      <span className="truncate font-mono text-[11px] text-[#6c757d]">{note}</span>
    </div>
    {!keys.length
      ? <p className="mt-2 rounded-md bg-[#f8f9fa] px-3 py-3 text-[12px] text-[#6c757d]">No changes yet. The original text is showing.</p>
      : <ul className="mt-2 space-y-1.5">
        {keys.map(key => {
          const draftValue = draft[key], liveValue = live[key];
          const removing = draftValue === undefined;
          const state = removing ? 'Restore pending' : liveValue === undefined ? 'New' : draftValue !== liveValue ? 'Changed' : 'Live';
          const confirming = confirmKey === scope + '|' + key;
          return <li key={key} className="rounded-md border border-[#e9ecef] px-3 py-2">
            <div className="flex items-start gap-2">
              <p dir="auto" className={cn('min-w-0 flex-1 break-words text-[13px] leading-5', removing && 'text-[#6c757d] line-through')}>
                {(draftValue ?? liveValue) || '(empty text)'}
              </p>
              <StatusPill tone={state === 'Live' ? 'positive' : state === 'Restore pending' ? 'neutral' : 'warning'}>{state}</StatusPill>
            </div>
            {!removing && <div className="mt-1.5 flex justify-end">
              <button type="button" disabled={busy} onClick={() => {
                if (confirming) { setConfirmKey(null); onRestore(scope, key); } else setConfirmKey(scope + '|' + key);
              }} className={cn('inline-flex items-center gap-1 rounded px-2 py-1 text-[12px] font-medium transition-colors disabled:opacity-40',
                confirming ? 'bg-red-600 text-white hover:bg-red-700' : 'text-[#6c757d] hover:bg-[#f1f3f5] hover:text-[#212529]')}>
                <RotateCcw size={12} /> {confirming ? 'Click again to confirm' : 'Use original'}
              </button>
            </div>}
          </li>;
        })}
      </ul>}
  </div>;
}

export default function VisualEditor({ canEditSeo = false }: { canEditSeo?: boolean }) {
  const [path, setPath] = useState('/');
  const [data, setData] = useState<AdminVisualPage | null>(null);
  const [saved, setSaved] = useState<SavedPage[]>([]);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingPublishScope, setPendingPublishScope] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>('desktop');
  const [frameKey, setFrameKey] = useState(0);
  const [frameState, setFrameState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [frameNote, setFrameNote] = useState('');
  const [selection, setSelection] = useState<VisualSelection | null>(null);
  const [draft, setDraft] = useState('');
  const [frameBusy, setFrameBusy] = useState(false);
  const [hint, setHint] = useState('');
  const [tab, setTab] = useState<'edit' | 'changes'>('edit');
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [pickerRequest, setPickerRequest] = useState<{ template: string; n: number } | null>(null);
  const [stage, setStage] = useState({ width: 0, height: 720 });
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'status', dir: 'asc' });
  const [tableQuery, setTableQuery] = useState('');
  const [tableFilter, setTableFilter] = useState<TableFilter>('all');
  const frameRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);
  const readyTimer = useRef<number | undefined>(undefined);
  const pendingSave = useRef('');

  const loadPage = useCallback(async (target: string, signal?: AbortSignal) => {
    const response = await fetch('/api/visual-content?mode=admin&path=' + encodeURIComponent(target), { cache: 'no-store', signal });
    if (!response.ok) throw Error('Could not load the saved text for this page.');
    return await response.json() as AdminVisualPage;
  }, []);
  const reloadList = useCallback(async () => {
    try {
      const response = await fetch('/api/visual-content?mode=list', { cache: 'no-store' });
      if (response.ok) setSaved(await response.json() as SavedPage[]);
    } catch { /* The page list still works while the content service is offline. */ }
  }, []);
  const refreshData = useCallback(async () => {
    try { setData(await loadPage(path)); setLoadError(''); }
    catch (error) { setLoadError(error instanceof Error ? error.message : 'Loading failed'); }
    await reloadList();
  }, [loadPage, path, reloadList]);
  const refreshRef = useRef(refreshData);
  useEffect(() => { refreshRef.current = refreshData; }, [refreshData]);

  useEffect(() => { void reloadList(); }, [reloadList]);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setLoadError('');
    loadPage(path, controller.signal).then(setData).catch(error => {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Loading failed');
    });
    return () => controller.abort();
  }, [path, loadPage]);

  // A new page or a reload starts a fresh editing session in the frame.
  useEffect(() => {
    readyRef.current = false;
    setSelection(null);
    setFrameState('loading');
    setFrameNote('');
    setHint('');
    setFrameBusy(false);
    return () => window.clearTimeout(readyTimer.current);
  }, [path, frameKey]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = readBridgeMessage<FrameToEditor>(event, frameRef.current?.contentWindow);
      if (!message) return;
      switch (message.type) {
        case 'ready':
          readyRef.current = true;
          window.clearTimeout(readyTimer.current);
          setFrameState('ready');
          setFrameNote('');
          break;
        case 'select':
          setSelection(message.selection);
          setDraft(message.selection.value);
          setHint('');
          setTab('edit');
          break;
        case 'deselect': setSelection(null); break;
        case 'busy': setFrameBusy(message.busy); break;
        case 'saved':
          if (!message.removed) setSelection(current => current && current.key === message.key && current.scope === message.scope
            ? { ...current, value: pendingSave.current } : current);
          toast.success(message.removed ? 'Original text restored in the draft' : 'Draft saved');
          void refreshRef.current();
          break;
        case 'error': toast.error(message.message); break;
        case 'hint': setHint(message.message); break;
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const measure = () => setStage({
      width: element.clientWidth,
      height: Math.max(520, Math.min(920, window.innerHeight - 210)),
    });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  useEffect(() => {
    if (!confirmKey) return;
    const timer = window.setTimeout(() => setConfirmKey(null), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmKey]);

  const unsaved = !!selection && draft !== selection.value;
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  function onFrameLoad() {
    window.clearTimeout(readyTimer.current);
    let landed = path;
    try { landed = frameRef.current?.contentWindow?.location.pathname || path; } catch { /* keep expected path */ }
    const normalized = landed === '/' ? '/' : landed.replace(/\/$/, '');
    if (normalized !== path) {
      setFrameState('failed');
      setFrameNote(`This address opened ${normalized} instead. It may need a login, or the page may not exist.`);
      return;
    }
    readyTimer.current = window.setTimeout(() => {
      if (readyRef.current) return;
      setFrameState('failed');
      setFrameNote('The page loaded, but editing didn’t start. Reload the preview or open the page in a new tab.');
    }, 12000);
  }
  function openPage(next: string) {
    if (next === path) return true;
    if (unsaved && !window.confirm('You have text that isn’t saved yet. Leave it?')) return false;
    setPath(next);
    setTab('edit');
    return true;
  }
  function scrollToWorkspace() {
    window.requestAnimationFrame(() => workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  function previewDraft(value: string) {
    setDraft(value);
    postToFrame(frameRef.current, { type: 'preview', value });
  }
  function saveDraft() {
    if (!selection) return;
    pendingSave.current = draft;
    postToFrame(frameRef.current, { type: 'save', value: draft });
  }
  function cancelSelection() {
    postToFrame(frameRef.current, { type: 'deselect' });
    setSelection(null);
  }
  async function publish(scope: string) {
    setPendingPublishScope(null);
    setBusy(true);
    try {
      const response = await fetch('/api/visual-content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { message?: string };
        throw Error(error.message || 'Publish failed');
      }
      await refreshData();
      toast.success(scope === GLOBAL ? 'Header & footer published on every page' : 'Published. Visitors now see the new text.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Publish failed');
    } finally { setBusy(false); }
  }
  async function restoreKey(scope: string, key: string) {
    setBusy(true);
    try {
      const response = await fetch('/api/visual-content', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope, key }),
      });
      if (!response.ok) throw Error('Could not bring back the original text');
      await refreshData();
      setFrameKey(value => value + 1);
      toast.success('Original text is back in the draft. Publish to update visitors.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Restore failed');
    } finally { setBusy(false); }
  }

  const records = useMemo(() => new Map(saved.map(row => [row.scope, row])), [saved]);
  const rows = useMemo<PageRow[]>(() => {
    const list: PageRow[] = [];
    const shared = records.get(GLOBAL);
    list.push({ path: GLOBAL, label: 'Header & footer', dynamic: false, edits: shared?.edits ?? 0,
      live: shared?.published ?? 0, status: rowStatus(shared, false), updatedAt: shared?.updatedAt ?? null });
    for (const page of visualPageCatalog) {
      const record = records.get(page.path);
      list.push({ path: page.path, label: page.label, dynamic: page.dynamic, edits: record?.edits ?? 0,
        live: record?.published ?? 0, status: rowStatus(record, page.dynamic), updatedAt: record?.updatedAt ?? null });
    }
    for (const record of saved) {
      if (record.scope === GLOBAL || catalogLabels.has(record.scope)) continue;
      list.push({ path: record.scope, label: 'Specific address', dynamic: false, edits: record.edits,
        live: record.published, status: rowStatus(record, false), updatedAt: record.updatedAt });
    }
    return list;
  }, [records, saved]);
  const visibleRows = useMemo(() => {
    const q = tableQuery.trim().toLowerCase();
    const direction = sort.dir === 'asc' ? 1 : -1;
    return rows
      .filter(row => (tableFilter === 'all' || row.status === tableFilter) &&
        (!q || row.label.toLowerCase().includes(q) || row.path.toLowerCase().includes(q)))
      .sort((a, b) => {
        let diff = 0;
        if (sort.key === 'page') diff = a.label.localeCompare(b.label);
        else if (sort.key === 'edits') diff = a.edits - b.edits;
        else if (sort.key === 'status') diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        else diff = (a.updatedAt ? Date.parse(a.updatedAt) : 0) - (b.updatedAt ? Date.parse(b.updatedAt) : 0);
        return diff * direction || a.label.localeCompare(b.label);
      });
  }, [rows, tableQuery, tableFilter, sort]);

  const pageChanges = countChanges(data?.page);
  const globalChanges = countChanges(data?.global);
  const entryCount = unionKeys(data?.page).length + unionKeys(data?.global).length;
  const selectionGroup = selection?.scope === GLOBAL ? 'global' : 'page';
  const hasOverride = !!selection && data?.[selectionGroup]?.draft?.[selection.key] !== undefined;
  const deviceWidth = DEVICE_WIDTH[device];
  const scale = stage.width ? Math.min(1, Math.max(0.25, (stage.width - 32) / deviceWidth)) : 1;
  const viewHeight = stage.height - 32;
  const editedPages = saved.filter(row => row.scope !== GLOBAL && (row.edits || row.published)).length;
  const pendingCount = saved.filter(row => row.hasUnpublishedChanges).length;
  const sharedRecord = records.get(GLOBAL);
  const dynamicCount = visualPageCatalog.filter(page => page.dynamic).length;
  const currentLabel = catalogLabels.get(path) || 'Specific address';
  const smallButton = 'px-2.5 py-1 text-[12px]';

  return <DashboardPage>
    <DashboardHeader
      title="Visual editor"
      description="Click any text on a page to change it. Changes stay in a private draft until you publish, and the original text is always kept as a fallback."
      meta={pendingCount ? <StatusPill tone="warning">{pendingCount} waiting to publish</StatusPill> : null}
      actions={<>
        {canEditSeo && <a href={'/dashboard/seo?path=' + encodeURIComponent(path)} className={darkLink}><Search size={14} /> SEO for this page</a>}
        <a href={editHref(path)} target="_blank" rel="noopener noreferrer" className={darkLink}><ExternalLink size={14} /> Open full screen</a>
        <DashButton tone="ghost-dark" onClick={() => { void refreshData(); setFrameKey(value => value + 1); }}><RefreshCw size={14} /> Refresh</DashButton>
      </>}
    />

    <KpiRow>
      <KpiCard label="Pages" value={visualPageCatalog.length} icon={<Layers size={16} />} hint={`${dynamicCount} need a specific address`} />
      <KpiCard label="Pages with edits" value={editedPages} hint={editedPages ? 'Showing your custom text' : 'All pages show original text'} />
      <KpiCard label="Waiting to publish" value={pendingCount} tone={pendingCount ? 'warning' : 'positive'}
        hint={pendingCount ? 'Drafts visitors can’t see yet' : 'Everything is live'} />
      <KpiCard label="Header & footer edits" value={sharedRecord?.edits ?? 0} hint="Shown on every page" />
    </KpiRow>

    {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
      <span>{loadError}</span>
      <DashButton onClick={() => void refreshData()}>Try again</DashButton>
    </div>}

    <div ref={workspaceRef} className="grid scroll-mt-4 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section aria-label="Live page" className="min-w-0 rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#f0f0f0] px-3 py-2.5">
          <PagePicker path={path} records={records} onOpen={openPage} request={pickerRequest} />
          <div className="ml-auto flex items-center gap-2">
            <Segmented label="Preview size" size="sm" value={device} onChange={setDevice} options={[
              { value: 'desktop', label: <span className="hidden sm:inline">Desktop</span>, icon: <Monitor size={14} />, title: 'Desktop, 1280px wide' },
              { value: 'tablet', label: <span className="hidden sm:inline">Tablet</span>, icon: <Tablet size={14} />, title: 'Tablet, 834px wide' },
              { value: 'mobile', label: <span className="hidden sm:inline">Mobile</span>, icon: <Smartphone size={14} />, title: 'Mobile, 390px wide' },
            ]} />
            <span className="w-10 text-right text-[12px] tabular-nums text-[#6c757d]" title="Preview zoom">{Math.round(scale * 100)}%</span>
            <DashButton className="px-2" title="Reload preview" aria-label="Reload preview" onClick={() => setFrameKey(value => value + 1)}>
              <RefreshCw size={14} />
            </DashButton>
          </div>
        </div>
        <div ref={stageRef} className="relative overflow-hidden rounded-b-lg bg-[#e9ecef] p-4" style={{ height: stage.height }}>
          <div className="mx-auto overflow-hidden rounded-md bg-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-[width] duration-200"
            style={{ width: Math.round(deviceWidth * scale), height: viewHeight }}>
            <iframe key={path + ':' + frameKey} ref={frameRef} src={editHref(path)} title={'Live preview of ' + currentLabel}
              onLoad={onFrameLoad}
              style={{ width: deviceWidth, height: viewHeight / scale, transform: `scale(${scale})`, transformOrigin: '0 0', border: 0, display: 'block' }} />
          </div>
          {frameState === 'loading' && <div className="pointer-events-none absolute inset-x-0 top-7 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#1a1a2e] px-3 py-1.5 text-[12px] font-medium text-white shadow-lg">
              <Loader2 size={14} className="animate-spin" /> Loading the page editor…
            </span>
          </div>}
          {frameState === 'failed' && <div className="absolute inset-0 flex items-center justify-center bg-[#e9ecef]/90 p-6">
            <div role="alert" className="max-w-sm rounded-lg bg-white p-5 text-center shadow-lg">
              <TriangleAlert size={22} className="mx-auto text-amber-500" />
              <p className="mt-2 text-[14px] font-semibold">Editing couldn’t start on this page</p>
              <p className="mt-1 text-[13px] leading-5 text-[#6c757d]">{frameNote}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <DashButton tone="primary" onClick={() => setFrameKey(value => value + 1)}><RefreshCw size={14} /> Reload preview</DashButton>
                <a href={editHref(path)} target="_blank" rel="noopener noreferrer" className={lightLink}><ExternalLink size={14} /> New tab</a>
              </div>
            </div>
          </div>}
        </div>
      </section>

      <aside aria-label="Inspector" className="min-w-0 rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] xl:sticky xl:top-4">
        <div className="border-b border-[#f0f0f0] px-4 py-3">
          <p className="truncate text-[14px] font-semibold">{currentLabel}</p>
          <p className="truncate font-mono text-[11px] text-[#6c757d]">{path}</p>
        </div>
        <div className="divide-y divide-[#f0f0f0] border-b border-[#f0f0f0] px-4">
          <PublishRow title="This page" changes={pageChanges} busy={busy || !data} onPublish={() => setPendingPublishScope(path)} />
          <PublishRow title="Header & footer" note="every page" changes={globalChanges} busy={busy || !data} onPublish={() => setPendingPublishScope(GLOBAL)} />
        </div>
        <div className="px-4 pt-3">
          <Segmented label="Inspector view" size="sm" value={tab} onChange={setTab} options={[
            { value: 'edit', label: 'Edit text' },
            { value: 'changes', label: `All changes (${entryCount})` },
          ]} />
        </div>
        <div className="p-4">
          {tab === 'changes' ? <div className="space-y-5">
            <ChangeGroup title="This page" note={path} scope={path} doc={data?.page} busy={busy}
              confirmKey={confirmKey} setConfirmKey={setConfirmKey} onRestore={(scope, key) => void restoreKey(scope, key)} />
            <ChangeGroup title="Header & footer" note="every page" scope={GLOBAL} doc={data?.global} busy={busy}
              confirmKey={confirmKey} setConfirmKey={setConfirmKey} onRestore={(scope, key) => void restoreKey(scope, key)} />
          </div> : selection ? <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusPill tone={selection.scope === GLOBAL ? 'info' : 'neutral'}>
                {selection.scope === GLOBAL ? 'Header & footer · every page' : 'This page only'}
              </StatusPill>
              <span className="text-[12px] text-[#6c757d]">{KIND_LABEL[selection.kind]}</span>
            </div>
            <div>
              <p className="mb-1 text-[12px] font-semibold text-[#495057]">Original text</p>
              <p dir="auto" className="max-h-28 overflow-y-auto whitespace-pre-wrap rounded-md bg-[#f8f9fa] px-3 py-2 text-[13px] leading-5 text-[#495057]">
                {selection.original || '(empty)'}
              </p>
            </div>
            <div>
              <label htmlFor="ve-text" className="mb-1 block text-[12px] font-semibold text-[#495057]">New text</label>
              <textarea key={selection.scope + selection.key} id="ve-text" dir="auto" rows={6} maxLength={MAX_TEXT} autoFocus
                value={draft} onChange={event => previewDraft(event.target.value)}
                onKeyDown={event => {
                  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); if (unsaved && !frameBusy) saveDraft(); }
                  if (event.key === 'Escape') { event.preventDefault(); cancelSelection(); }
                }}
                placeholder="Write the new text" className={cn(fieldClass, 'resize-y text-[15px] leading-6')} />
              <div className="mt-1 flex justify-between gap-2 text-[11px] text-[#adb5bd]">
                <span>Ctrl + Enter saves · Esc closes</span>
                <span className="tabular-nums">{draft.length.toLocaleString()}/{MAX_TEXT.toLocaleString()}</span>
              </div>
            </div>
            {!draft.trim() && <p className="rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800">Saving empty text hides it on the page.</p>}
            <div className="flex flex-wrap gap-2">
              <DashButton tone="primary" disabled={!unsaved || frameBusy} onClick={saveDraft}>
                {frameBusy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save draft
              </DashButton>
              <DashButton disabled={!hasOverride || frameBusy} title={hasOverride ? undefined : 'This text has no saved change'}
                onClick={() => postToFrame(frameRef.current, { type: 'restore' })}>
                <RotateCcw size={14} /> Use original
              </DashButton>
              <DashButton className="ml-auto" onClick={cancelSelection}><X size={14} /> Close</DashButton>
            </div>
            <p className="text-[11px] leading-4 text-[#6c757d]">
              Drafts are private. Visitors see this after you publish {selection.scope === GLOBAL ? 'the header & footer' : 'this page'}.
            </p>
          </div> : <div className="py-6 text-center">
            <MousePointerClick size={28} className="mx-auto text-rose-500" />
            <p className="mt-3 text-[14px] font-semibold">Click any text in the preview</p>
            <p className="mx-auto mt-1 max-w-[280px] text-[13px] leading-5 text-[#6c757d]">
              Headings, paragraphs, button labels, input placeholders and image descriptions can all be changed. Links and buttons won’t navigate while you edit.
            </p>
            {frameState !== 'ready' && frameState !== 'failed' && <p className="mt-3 text-[12px] text-[#6c757d]">The editor is starting…</p>}
            {hint && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800">{hint}</p>}
          </div>}
        </div>
      </aside>
    </div>

    <Panel title="All pages" description="Every page you can edit, with its draft and live status." bodyClassName="p-0"
      actions={<>
        <label className="relative">
          <span className="sr-only">Search pages</span>
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#adb5bd]" />
          <input value={tableQuery} onChange={event => setTableQuery(event.target.value)} placeholder="Search pages"
            className={cn(fieldClass, 'w-48 py-1.5 pl-8 text-[13px]')} />
        </label>
        <Segmented label="Filter by status" size="sm" value={tableFilter} onChange={setTableFilter} options={[
          { value: 'all', label: 'All' }, { value: 'pending', label: 'Waiting' },
          { value: 'live', label: 'Live' }, { value: 'original', label: 'Original' },
        ]} />
      </>}>
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              <SortHeader label="Page" sortKey="page" sort={sort} onSort={setSort} />
              <SortHeader label="Draft edits" sortKey="edits" sort={sort} onSort={setSort} />
              <PlainHeader label="Live edits" />
              <SortHeader label="Status" sortKey="status" sort={sort} onSort={setSort} />
              <SortHeader label="Updated" sortKey="updated" sort={sort} onSort={setSort} />
              <PlainHeader label="Actions" className="text-right" />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(row => {
              const current = row.path === path;
              return <tr key={row.path} className={cn('border-b border-[#f0f0f0] last:border-0 hover:bg-[#f8f9fa]', current && 'bg-rose-50/60')}>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <StatusDot status={row.status} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.label}{current && <span className="ml-2 text-[11px] font-normal text-rose-700">Open now</span>}</p>
                      <p className="truncate font-mono text-[11px] text-[#6c757d]">{row.path === GLOBAL ? 'Shown on every page' : row.path}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 tabular-nums">{row.edits}</td>
                <td className="px-3 py-2.5 tabular-nums">{row.live}</td>
                <td className="px-3 py-2.5"><RowStatusPill status={row.status} /></td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[#6c757d]">{formatWhen(row.updatedAt)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1.5">
                    {row.status === 'pending' && <DashButton tone="primary" className={smallButton} disabled={busy}
                      onClick={() => setPendingPublishScope(row.path)}><Send size={12} /> Publish</DashButton>}
                    {row.path === GLOBAL
                      ? <DashButton className={smallButton} onClick={() => { setTab('changes'); scrollToWorkspace(); }}>Review</DashButton>
                      : row.dynamic
                        ? <DashButton className={smallButton} onClick={() => {
                          setPickerRequest({ template: row.path.replace(/\[[^\]]+\]/g, ''), n: Date.now() });
                          scrollToWorkspace();
                        }}>Choose address</DashButton>
                        : <DashButton className={smallButton} disabled={current} onClick={() => { if (openPage(row.path)) scrollToWorkspace(); }}>Edit</DashButton>}
                  </div>
                </td>
              </tr>;
            })}
            {!visibleRows.length && <tr><td colSpan={6} className="px-3 py-10 text-center text-[13px] text-[#6c757d]">
              No pages match.{' '}
              <button type="button" className="font-medium text-rose-700 underline" onClick={() => { setTableQuery(''); setTableFilter('all'); }}>Clear filters</button>
            </td></tr>}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[#f0f0f0] px-4 py-2 text-[12px] text-[#6c757d]">Showing {visibleRows.length} of {rows.length}</p>
    </Panel>

    <VisualPublishDialog
      scope={pendingPublishScope}
      busy={busy}
      onClose={() => setPendingPublishScope(null)}
      onConfirm={scope => void publish(scope)}
    />
  </DashboardPage>;
}
