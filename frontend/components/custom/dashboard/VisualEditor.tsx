'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, Check, CircleHelp, ExternalLink, FileText, Globe2,
  LayoutTemplate, RefreshCw, Search, Send, ShieldCheck, Sparkles,
} from 'lucide-react';
import { visualPageCatalog } from '@/lib/visual-page-catalog';
import { safeVisualPage, type AdminVisualPage, type VisualEntries } from '@/lib/visual-content';

type SavedPage = {
  scope: string; edits: number; published: number;
  hasUnpublishedChanges: boolean; updatedAt: string | null;
};
function differs(a: VisualEntries = {}, b: VisualEntries = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].some(key => a[key] !== b[key]);
}
const editHref = (path: string) => path + '?visualEdit=1';

export default function VisualEditor() {
  const [path, setPath] = useState('/');
  const [custom, setCustom] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<AdminVisualPage | null>(null);
  const [saved, setSaved] = useState<SavedPage[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const pages = useMemo(() => visualPageCatalog.filter(page =>
    page.path.toLowerCase().includes(search.toLowerCase()) ||
    page.label.toLowerCase().includes(search.toLowerCase())
  ), [search]);

  async function reloadList() {
    try {
      const r = await fetch('/api/visual-content?mode=list', { cache: 'no-store' });
      if (r.ok) setSaved(await r.json() as SavedPage[]);
    } catch { /* Status remains optional while the content service is offline. */ }
  }

  useEffect(() => { void reloadList(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoadError('');
    setData(null);
    const run = async () => {
      try {
        const r = await fetch('/api/visual-content?mode=admin&path=' + encodeURIComponent(path), {
          cache: 'no-store', signal: controller.signal,
        });
        if (!r.ok) throw Error('Unable to load edits for this page.');
        setData(await r.json() as AdminVisualPage);
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Loading failed');
      }
    };
    void run();
    return () => controller.abort();
  }, [path]);

  async function refresh() {
    setData(null);
    setMessage('');
    const r = await fetch('/api/visual-content?mode=admin&path=' + encodeURIComponent(path), { cache: 'no-store' });
    if (r.ok) setData(await r.json() as AdminVisualPage);
    else setLoadError('Content server unavailable.');
    await reloadList();
  }
  async function publish(scope: string) {
    if (!window.confirm('Publish all saved draft changes in ' + (scope === '@global' ? 'the shared header/footer' : path) + '?')) return;
    setBusy(true); setMessage('');
    try {
      const r = await fetch('/api/visual-content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      if (!r.ok) {
        const error = await r.json();
        throw Error(error.message || 'Publish failed');
      }
      await refresh();
      setMessage('Published! The public content cache was invalidated.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Publish failed'); }
    finally { setBusy(false); }
  }
  function pickCustom() {
    const raw = custom.trim();
    let candidate = raw;
    if (raw.startsWith('http:') || raw.startsWith('https:')) {
      try {
        const parsed = new URL(raw);
        if (parsed.origin !== window.location.origin) throw Error('Wrong site');
        candidate = parsed.pathname;
      } catch { setMessage('Enter a path or an address on this website.'); return; }
    }
    const valid = safeVisualPage(candidate);
    if (!valid) { setMessage('Use an existing page path, for example /biodata/507f1f77bcf86cd799439011'); return; }
    setPath(valid);
    setMessage('');
  }
  async function restore(scope: string, key: string) {
    if (!window.confirm('Remove this text override from the draft and restore the original JSX text when published?')) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/visual-content', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, key }),
      });
      if (!response.ok) throw Error('Could not restore default text');
      await refresh();
      setMessage('Original text restored in the draft. Publish to update visitors.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reset failed');
    } finally { setBusy(false); }
  }
  const summaries = [
    { kind: 'page' as const, name: 'Selected page', description: 'Only this URL', scope: path },
    { kind: 'global' as const, name: 'Shared navigation & footer', description: 'Every page across the site', scope: '@global' },
  ];
  const savedByScope = new Map(saved.map(row => [row.scope, row]));
  const ready = !!safeVisualPage(path);
  return <div className="min-h-screen bg-[#faf8f7] px-4 py-7 text-[#29232b] md:px-7 md:py-10">
    <div className="mx-auto max-w-7xl space-y-7">
      <div className="relative overflow-hidden rounded-[24px] bg-[#241a24] px-7 py-8 text-white shadow-xl md:px-10 md:py-10">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#da6480]/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[#efb4c2]"><Sparkles size={15}/> Niqaha · Content Studio</p>
            <h1 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">Edit your website, visually.</h1>
            <p className="mt-4 text-sm leading-7 text-[#f1e6ec]">Choose any page. Open the real website, click the text you want to edit, save a draft and publish when it looks right. Your current design and text always remain the fallback.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white"><ShieldCheck size={16}/> Admin only</div>
        </div>
        <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/10 p-4"><div className="text-2xl font-semibold">{visualPageCatalog.length}</div><p className="mt-1 text-xs text-white/70">Routes discovered automatically</p></div>
          <div className="rounded-xl border border-white/10 bg-white/10 p-4"><div className="text-2xl font-semibold">{saved.filter(row => row.scope !== '@global').length}</div><p className="mt-1 text-xs text-white/70">Pages with saved content</p></div>
          <div className="rounded-xl border border-white/10 bg-white/10 p-4"><div className="text-2xl font-semibold">20 min</div><p className="mt-1 text-xs text-white/70">Backend content cache per page</p></div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-[20px] border border-[#ede3e6] bg-white shadow-sm">
          <div className="border-b border-[#f0e7ea] p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold"><LayoutTemplate size={19} className="text-rose-600"/> All website pages</h2>
              <span className="rounded-full bg-[#f9edf0] px-2.5 py-1 text-xs font-semibold text-[#a23e57]">{pages.length}</span>
            </div>
            <label className="relative mt-4 block">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8288]"/>
              <span className="sr-only">Search pages</span>
              <input value={search} onChange={event => setSearch(event.target.value)}
                placeholder="Search pages..." className="w-full rounded-xl border border-[#e8dfe2] bg-[#fcfafb] py-3 pl-10 pr-3 text-sm outline-rose-500"/>
            </label>
          </div>
          <div className="max-h-[590px] space-y-1 overflow-auto p-2">
            {pages.map(page => {
              const selected = path === page.path;
              const record = savedByScope.get(page.path);
              return <div key={page.path} className={`group rounded-xl border px-3 py-3 transition-colors ${selected ? 'border-rose-200 bg-rose-50' : 'border-transparent hover:border-[#eee6e9] hover:bg-[#fcf9fa]'}`}>
                <div className="flex items-center gap-3">
                  <button onClick={() => {
                    if (page.dynamic) {
                      setCustom(page.path.replace(/\[[^\]]+\]/g, ''));
                      setMessage('This is a dynamic route. Enter an actual URL in the field on the right.');
                    } else { setPath(page.path); setMessage(''); }
                  }} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-bold">{page.label}</span>
                    <span className="mt-1 block truncate font-mono text-[11px] text-[#8f8089]">{page.path}</span>
                  </button>
                  {page.dynamic ? <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">URL needed</span> :
                    <a href={editHref(page.path)} target="_blank" rel="noopener noreferrer"
                      aria-label={`Edit ${page.label}`} title="Open visual editor"
                      className="rounded-lg border border-[#ead8df] bg-white p-2 text-rose-600 hover:bg-rose-50"><ArrowUpRight size={16}/></a>}
                </div>
                {!!record && <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#89777f]">
                  <span className={`inline-block size-1.5 rounded-full ${record.hasUnpublishedChanges ? 'bg-amber-500' : 'bg-emerald-500'}`}/>
                  {record.edits} text edits · {record.hasUnpublishedChanges ? 'Unpublished draft' : 'Published'}
                </div>}
              </div>;
            })}
            {!pages.length && <p className="p-5 text-center text-sm text-[#887b83]">No matching pages.</p>}
          </div>
        </section>
        <div className="space-y-6">
          <section className="rounded-[20px] border border-[#ede3e6] bg-white p-6 shadow-sm md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="mb-1 text-xs font-bold uppercase tracking-wider text-rose-600">STEP 01 · SELECT AND EDIT</p><h2 className="font-serif text-3xl font-semibold">Your page</h2></div>
              <button type="button" disabled={busy} onClick={() => void refresh()} className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-[#fbf6f8]"><RefreshCw size={14} className="mr-1 inline"/> Refresh</button>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[#efeaec] bg-[#fcfafb] p-4">
              <div className="min-w-0"><p className="text-[11px] font-semibold text-[#84727b]">CURRENT PAGE</p><p className="truncate font-mono text-base font-semibold">{path}</p></div>
              <Globe2 className="shrink-0 text-rose-500" size={22}/>
            </div>
            <a href={editHref(path)} target="_blank" rel="noopener noreferrer" aria-disabled={!ready}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-4 text-sm font-bold text-white shadow-sm hover:bg-rose-700">
              <ExternalLink size={17}/> Open visual editor
            </a>
            <p className="mt-3 text-xs leading-6 text-[#8a7a83]">A new tab opens your actual page. Click any eligible text, button label, placeholder or image alt text to modify it.</p>
            <div className="mt-6 border-t border-[#f0e7ea] pt-5">
              <div className="flex items-center gap-2 text-sm font-semibold"><CircleHelp className="text-rose-500" size={17}/> Dynamic or newly added page?</div>
              <p className="mt-2 text-xs leading-5 text-[#877b82]">For URLs such as /biodata/123, enter a specific existing path. Each exact URL has its own saved copy.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input value={custom} onChange={event => setCustom(event.target.value)}
                  onKeyDown={event => { if (event.key === 'Enter') pickCustom(); }}
                  aria-label="Custom page path" placeholder="/policies/privacy"
                  className="min-w-0 flex-1 rounded-lg border border-[#eadfe3] px-3 py-2.5 text-sm outline-rose-500"/>
                <button onClick={pickCustom} className="rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">Select URL</button>
              </div>
            </div>
          </section>
          <section className="rounded-[20px] border border-[#ede3e6] bg-white p-6 shadow-sm md:p-7">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-rose-600">STEP 02 · PUBLISH</p>
            <h2 className="font-serif text-3xl font-semibold">Saved content</h2>
            <p className="mt-2 text-sm text-[#82757b]">Editing never changes the public site until you publish.</p>
            <div className="mt-5 grid gap-3">
              {summaries.map(item => {
                const doc = data?.[item.kind];
                const hasDraft = differs(doc?.draft, doc?.published);
                return <div key={item.scope} className="rounded-xl border border-[#eee8ea] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold"><FileText size={16} className="text-rose-500"/>{item.name}</p>
                      <p className="mt-1 text-xs text-[#988b92]">{item.description} · {Object.keys(doc?.draft || {}).length} edits</p>
                      <p className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${hasDraft ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {hasDraft ? '● Draft has unpublished changes' : <><Check size={13}/> Everything published</>}
                      </p>
                    </div>
                    <button disabled={!hasDraft || busy || !doc} onClick={() => void publish(item.scope)}
                      className="flex items-center gap-2 rounded-lg bg-[#29222a] px-4 py-2.5 text-xs font-bold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-35">
                      <Send size={14}/> Publish
                    </button>
                  </div>
                  <details className="mt-3 border-t border-[#f1ebed] pt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-[#9c4f66]">View saved text · Restore any default</summary>
                    <div className="mt-3 max-h-48 space-y-2 overflow-auto">
                      {Object.entries({ ...(doc?.published || {}), ...(doc?.draft || {}) }).map(([key, text]) =>
                        <div key={key} className="flex items-start justify-between gap-3 rounded-lg bg-[#faf7f8] p-3">
                          <div className="min-w-0">
                            <p dir="auto" className="break-words text-sm">{text || '(blank text)'}</p>
                            <p className="mt-1 truncate font-mono text-[10px] text-[#998994]">{key}</p>
                          </div>
                          <button disabled={busy || doc?.draft?.[key] === undefined}
                            onClick={() => void restore(item.scope, key)}
                            className="shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-white disabled:opacity-35">
                            {doc?.draft?.[key] === undefined ? 'Restore pending' : 'Restore'}
                          </button>
                        </div>
                      )}
                      {!Object.keys(doc?.draft || {}).length && !Object.keys(doc?.published || {}).length &&
                        <p className="text-xs text-[#8f7e86]">No overrides yet. All text uses your original website copy.</p>}
                    </div>
                  </details>
                </div>;
              })}
            </div>
            {loadError && <p className="mt-4 text-xs text-red-700">{loadError}</p>}
            {message && <p role="status" className="mt-4 rounded-lg border border-[#ead5dd] bg-[#fff7f9] p-3 text-sm">{message}</p>}
          </section>
          <div className="flex gap-3 rounded-xl border border-rose-100 bg-[#fff4f6] p-4 text-xs leading-6 text-[#724f5e]">
            <ShieldCheck size={20} className="mt-1 shrink-0 text-rose-600"/>
            <div><strong>Safe fallback and caching.</strong> Nothing is overwritten in your JSX source. Unedited text stays exactly as it is now. Published overrides are saved in MongoDB, and Next.js caches their public response for 1,200 seconds, invalidated when an admin publishes.</div>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
