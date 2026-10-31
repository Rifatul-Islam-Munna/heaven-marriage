'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Check, CheckCircle2, ChevronsUpDown, Code2, ExternalLink, FileSearch, Globe, Image as ImageIcon, Info,
  Loader2, LockKeyhole, RotateCcw, Save, Search, Send, Settings2, TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { visualPageCatalog } from '@/lib/visual-page-catalog';
import {
  SITE_ORIGIN, isPrivateSeoPath, validSeoPath, type SeoAdminDoc, type SeoListItem, type SeoSettings,
} from '@/lib/seo-settings-types';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DashboardHeader, DashboardPage, DashButton, KpiCard, KpiRow, Panel, PlainHeader, Segmented, SortHeader,
  StatusPill, Toggle, fieldClass, formatWhen, labelClass, type SortState,
} from './dashboard-kit';

type Tab = 'search' | 'social' | 'indexing' | 'schema' | 'site';
type Group = 'robots' | 'openGraph' | 'twitter' | 'sitemap' | 'verification';
type RowStatus = 'pending' | 'live' | 'original';
type SortKey = 'page' | 'status' | 'updated';
type TableFilter = 'all' | 'pending' | 'live' | 'original' | 'private';
type CheckState = 'good' | 'warn' | 'bad' | 'info';
type HealthCheck = { label: string; state: CheckState; detail: string };
type Row = { path: string; label: string; status: RowStatus; isPrivate: boolean; updatedAt: string | null };

const SITE = '@site';
const catalogLabels = new Map(visualPageCatalog.map(page => [page.path, page.label]));
const scopeLabel = (scope: string) => scope === SITE ? 'Site-wide settings' : catalogLabels.get(scope) || 'Specific address';
const STATUS_ORDER: Record<RowStatus, number> = { pending: 0, live: 1, original: 2 };
const darkLink = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-white/20 bg-white/10 px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

function parseLanguages(source: string) {
  const result: Record<string, string> = {};
  for (const line of source.split('\n').map(value => value.trim()).filter(Boolean)) {
    const match = line.match(/^([a-z]{2,3}(?:-[a-zA-Z]{2,4})?|x-default):\s*(.+)$/);
    if (match) result[match[1]] = match[2].trim();
  }
  return result;
}
const languageText = (value?: Record<string, string>) => Object.entries(value || {}).map(([key, url]) => key + ': ' + url).join('\n');
function jsonState(text?: string): 'empty' | 'valid' | 'invalid' {
  if (!text?.trim()) return 'empty';
  try { JSON.parse(text); return 'valid'; } catch { return 'invalid'; }
}
const statusOf = (item?: SeoListItem): RowStatus => !item ? 'original' : item.hasUnpublishedChanges ? 'pending' : item.published ? 'live' : 'original';
function updatedOf(item?: SeoListItem) {
  const raw = (item as unknown as Record<string, unknown> | undefined)?.updatedAt;
  return typeof raw === 'string' ? raw : null;
}
const looksLikeTag = (value?: string) => !!value && /[<>]|content=/i.test(value);

function Field({ id, label, hint, children }: { id: string; label: string; hint?: ReactNode; children: ReactNode }) {
  return <div className="min-w-0">
    <label htmlFor={id} className={labelClass}>{label}</label>
    {children}
    {hint && <div className="mt-1 text-[11px] leading-4 text-[#6c757d]">{hint}</div>}
  </div>;
}
function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="border-b border-[#f0f0f0] pb-1.5 text-[13px] font-semibold text-[#212529]">{children}</h3>;
}
function LengthHint({ length, min, max, empty }: { length: number; min: number; max: number; empty: string }) {
  const state = !length ? 'empty' : length < min ? 'short' : length > max ? 'long' : 'good';
  return <div className="mt-1.5">
    <div className="h-1 overflow-hidden rounded-full bg-[#e9ecef]">
      <div className={cn('h-full rounded-full transition-[width]', state === 'good' ? 'bg-emerald-500' : state === 'empty' ? 'bg-transparent' : 'bg-amber-500')}
        style={{ width: Math.min(100, (length / max) * 100) + '%' }} />
    </div>
    <p className="mt-1 flex justify-between gap-2 text-[11px]">
      <span className={state === 'good' ? 'text-emerald-700' : state === 'empty' ? 'text-[#6c757d]' : 'text-amber-700'}>
        {state === 'empty' ? empty : state === 'short' ? `A bit short. Aim for ${min}–${max} characters.`
          : state === 'long' ? `May get cut off. Aim for ${min}–${max} characters.` : 'Good length'}
      </span>
      <span className="tabular-nums text-[#adb5bd]">{length}</span>
    </p>
  </div>;
}
function PreviewImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState('');
  if (!src || failed === src) return <div className={cn('flex items-center justify-center bg-[#f0f2f5] text-[#adb5bd]', className)}>
    <ImageIcon size={26} aria-hidden /><span className="sr-only">No image</span>
  </div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} onError={() => setFailed(src)} className={cn('object-cover', className)} />;
}

function ScopePicker({ scope, records, onOpen }: {
  scope: string; records: Map<string, SeoListItem>; onOpen: (next: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
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
  const choose = (path: string) => { if (onOpen(path)) { setOpen(false); setQuery(''); } };
  const submit = () => {
    let path = address.trim();
    if (/^https?:\/\//i.test(path)) {
      try {
        const url = new URL(path);
        if (url.origin !== SITE_ORIGIN && url.origin !== window.location.origin) throw Error();
        path = url.pathname;
      } catch { setError('Use a Niqaha.com address, not another website.'); return; }
    }
    if (path && !path.startsWith('/')) path = '/' + path;
    path = path === '/' ? path : path.replace(/\/$/, '');
    if (!validSeoPath(path) || path === SITE) { setError('Enter a valid address such as /policies/privacy.'); return; }
    if (onOpen(path)) { setOpen(false); setAddress(''); setError(''); }
  };
  const dot = (item?: SeoListItem) => {
    const status = statusOf(item);
    return <span role="img" aria-label={status === 'pending' ? 'Draft waiting' : status === 'live' ? 'Custom SEO live' : 'Original metadata'}
      className={cn('inline-block size-2 shrink-0 rounded-full', status === 'pending' ? 'bg-amber-500' : status === 'live' ? 'bg-emerald-500' : 'bg-[#ced4da]')} />;
  };
  return <div ref={boxRef} className="relative min-w-0 flex-1 sm:flex-none">
    <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(value => !value)}
      className="flex w-full min-w-0 items-center gap-2 rounded-md border border-[#dee2e6] bg-white px-3 py-1.5 text-left hover:bg-[#f8f9fa] focus-visible:outline-2 focus-visible:outline-rose-600 sm:w-[320px]">
      {scope === SITE ? <Settings2 size={15} className="shrink-0 text-rose-600" /> : isPrivateSeoPath(scope)
        ? <LockKeyhole size={15} className="shrink-0 text-[#6c757d]" /> : <Globe size={15} className="shrink-0 text-[#6c757d]" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{scopeLabel(scope)}</span>
        <span className="block truncate font-mono text-[11px] text-[#6c757d]">{scope === SITE ? 'Applies to every page' : scope}</span>
      </span>
      <ChevronsUpDown size={15} className="shrink-0 text-[#6c757d]" />
    </button>
    {open && <div role="dialog" aria-label="Choose a page"
      className="absolute left-0 top-full z-30 mt-1 w-[min(420px,calc(100vw-2rem))] rounded-lg border border-[#dee2e6] bg-white shadow-xl">
      <div className="space-y-2 border-b border-[#f0f0f0] p-2">
        <button type="button" onClick={() => choose(SITE)} className={cn('flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left',
          scope === SITE ? 'bg-rose-50' : 'hover:bg-[#f8f9fa]')}>
          <Settings2 size={15} className="shrink-0 text-rose-600" />
          <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium">Site-wide settings</span>
            <span className="block text-[11px] text-[#6c757d]">Site name, default image, Search Console</span></span>
          {dot(records.get(SITE))}
        </button>
        <label className="relative block">
          <span className="sr-only">Search pages</span>
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#adb5bd]" />
          <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search pages"
            className={cn(fieldClass, 'py-1.5 pl-8 text-[13px]')} />
        </label>
      </div>
      <ul aria-label="Pages" className="max-h-64 overflow-y-auto p-1">
        {pages.map(page => {
          const active = page.path === scope;
          return <li key={page.path}>
            <button type="button" aria-current={active ? 'page' : undefined} onClick={() => choose(page.path)}
              className={cn('flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left', active ? 'bg-rose-50' : 'hover:bg-[#f8f9fa]')}>
              {dot(records.get(page.path))}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 truncate text-[13px] font-medium">
                  {page.label}{isPrivateSeoPath(page.path) && <LockKeyhole size={11} className="shrink-0 text-[#adb5bd]" aria-label="Private page" />}
                </span>
                <span className="block truncate font-mono text-[11px] text-[#6c757d]">{page.path}</span>
              </span>
              {active && <Check size={14} className="shrink-0 text-rose-600" />}
            </button>
          </li>;
        })}
        {!pages.length && <li className="px-3 py-6 text-center text-[13px] text-[#6c757d]">No page matches “{query}”.</li>}
      </ul>
      <div className="border-t border-[#f0f0f0] p-3">
        <label htmlFor="seo-address" className="mb-1.5 block text-[12px] font-semibold text-[#495057]">Open a specific address</label>
        <div className="flex gap-2">
          <input id="seo-address" value={address} onChange={event => { setAddress(event.target.value); setError(''); }}
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); submit(); } }}
            placeholder="/policies/privacy" aria-describedby="seo-address-help" aria-invalid={!!error}
            className={cn(fieldClass, 'py-1.5 font-mono text-[12px]')} />
          <DashButton tone="dark" onClick={submit}>Open</DashButton>
        </div>
        <p id="seo-address-help" className={cn('mt-1.5 text-[11px]', error ? 'text-amber-700' : 'text-[#6c757d]')}>
          {error || 'Templates like /policies/[kind] set shared settings; an exact address overrides only that page.'}
        </p>
      </div>
    </div>}
  </div>;
}

export default function SeoManager() {
  const [scope, setScope] = useState('/');
  const [tab, setTab] = useState<Tab>('search');
  const [doc, setDoc] = useState<SeoAdminDoc | null>(null);
  const [form, setForm] = useState<SeoSettings>({});
  const [saved, setSaved] = useState<SeoListItem[]>([]);
  const [langInput, setLangInput] = useState('');
  const [keywordText, setKeywordText] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [network, setNetwork] = useState<'facebook' | 'x'>('facebook');
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'status', dir: 'asc' });
  const [tableQuery, setTableQuery] = useState('');
  const [tableFilter, setTableFilter] = useState<TableFilter>('all');
  const workspaceRef = useRef<HTMLDivElement>(null);

  const isSite = scope === SITE;
  const isPrivate = !isSite && isPrivateSeoPath(scope);
  const languageDirty = !isSite && langInput !== languageText(doc?.draft.languages);
  const dirty = !!doc && (JSON.stringify(form) !== JSON.stringify(doc.draft || {}) || languageDirty);

  const reloadList = useCallback(async () => {
    try {
      const response = await fetch('/api/seo-settings?list=1', { cache: 'no-store' });
      if (response.ok) setSaved(await response.json() as SeoListItem[]);
    } catch { /* The page list still works while the SEO service is offline. */ }
  }, []);
  useEffect(() => { void reloadList(); }, [reloadList]);
  useEffect(() => {
    const chosen = new URLSearchParams(window.location.search).get('path');
    if (chosen && validSeoPath(chosen)) { setScope(chosen); setTab(chosen === SITE ? 'site' : 'search'); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setDoc(null); setForm({}); setLangInput(''); setKeywordText(''); setLoadError('');
    void (async () => {
      try {
        const response = await fetch('/api/seo-settings?admin=1&path=' + encodeURIComponent(scope), { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw Error((await response.json().catch(() => ({}))).message || 'Unable to load SEO settings');
        const next = await response.json() as SeoAdminDoc;
        if (controller.signal.aborted) return;
        setDoc(next);
        setForm(next.draft);
        setLangInput(languageText(next.draft.languages));
        setKeywordText((next.draft.keywords || []).join(', '));
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Loading failed');
      }
    })();
    return () => controller.abort();
  }, [scope]);
  useEffect(() => {
    if (!confirmReset) return;
    const timer = window.setTimeout(() => setConfirmReset(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmReset]);

  const change = (key: keyof SeoSettings, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));
  const nested = (group: Group, key: string, value: string | number | boolean | undefined) =>
    setForm(prev => ({ ...prev, [group]: { ...(prev[group] || {}), [key]: value } }));
  const openScope = (next: string) => {
    if (next === scope) return true;
    if (dirty && !window.confirm('You have unsaved SEO changes. Leave them?')) return false;
    setScope(next);
    setTab(next === SITE ? 'site' : 'search');
    return true;
  };

  async function save() {
    if (!doc || busy || !dirty) return;
    setBusy(true);
    try {
      if (jsonState(form.structuredData) === 'invalid') throw Error('Structured data isn’t valid JSON. Fix it in the Structured data tab.');
      const langs = parseLanguages(langInput);
      if (!isSite && langInput.split('\n').filter(line => line.trim()).length !== Object.keys(langs).length)
        throw Error('Hreflang needs one “language: URL” pair on each line.');
      const settings = { ...form, ...(isSite ? {} : { languages: langs }) };
      const response = await fetch('/api/seo-settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, revision: doc.revision, settings }),
      });
      const payload = await response.json();
      if (!response.ok) throw Error(Array.isArray(payload.message) ? payload.message.join(', ') : payload.message || 'Unable to save SEO');
      setDoc(payload);
      setForm(payload.draft);
      setLangInput(languageText(payload.draft.languages));
      setKeywordText((payload.draft.keywords || []).join(', '));
      toast.success('Draft saved. Publish to make it live.');
      await reloadList();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally { setBusy(false); }
  }
  async function publish() {
    setConfirmPublish(false);
    if (!doc || busy || dirty) return;
    setBusy(true);
    try {
      const response = await fetch('/api/seo-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, revision: doc.revision }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.message || 'Publish failed');
      setDoc(result);
      toast.success('Published. Search metadata and the sitemap were refreshed.');
      await reloadList();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Publish failed');
    } finally { setBusy(false); }
  }
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void saveRef.current(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // Preview values fall back the same way the live site does.
  const defaultTitle = catalogLabels.has(scope) ? `${catalogLabels.get(scope)} | Niqaha.com` : 'Niqaha.com';
  const shownTitle = form.title?.trim() || defaultTitle;
  const shownDescription = form.description?.trim() || '';
  const pageUrl = isSite ? SITE_ORIGIN : form.canonical?.trim() || SITE_ORIGIN + (scope === '/' ? '' : scope);
  let crumb = pageUrl;
  try { const url = new URL(pageUrl, SITE_ORIGIN); crumb = [url.host, ...url.pathname.split('/').filter(Boolean)].join(' › '); } catch { /* show raw */ }
  const ogImage = form.openGraph?.image?.trim() || '/opengraph-image';
  const ogTitle = form.openGraph?.title?.trim() || shownTitle;
  const ogDescription = form.openGraph?.description?.trim() || shownDescription;
  const xImage = form.twitter?.image?.trim() || ogImage;
  const xTitle = form.twitter?.title?.trim() || ogTitle;
  const xDescription = form.twitter?.description?.trim() || ogDescription;
  const indexBlocked = isPrivate || form.robots?.index === false;
  const canonical = form.canonical?.trim() || '';
  const canonicalBad = !!canonical && !canonical.startsWith('/') && !canonical.startsWith(SITE_ORIGIN);
  const schemaState = jsonState(form.structuredData);
  const hreflangLines = langInput.split('\n').filter(line => line.trim()).length;
  const hreflangBad = !isSite && hreflangLines !== Object.keys(parseLanguages(langInput)).length;

  const checks = useMemo<HealthCheck[]>(() => {
    if (isSite) return [
      { label: 'Site name', state: form.siteName?.trim() ? 'good' : 'warn', detail: form.siteName?.trim() ? form.siteName.trim() : 'Not set. The built-in name is used.' },
      { label: 'Default share image', state: form.openGraph?.image?.trim() ? 'good' : 'info', detail: form.openGraph?.image?.trim() ? 'Custom image set' : 'Using the built-in image' },
      { label: 'Google Search Console', state: looksLikeTag(form.verification?.google) ? 'bad' : form.verification?.google?.trim() ? 'good' : 'info',
        detail: looksLikeTag(form.verification?.google) ? 'Paste only the token, not the whole tag' : form.verification?.google?.trim() ? 'Verification token added' : 'Not connected' },
      { label: 'Bing Webmaster Tools', state: looksLikeTag(form.verification?.bing) ? 'bad' : form.verification?.bing?.trim() ? 'good' : 'info',
        detail: looksLikeTag(form.verification?.bing) ? 'Paste only the token, not the whole tag' : form.verification?.bing?.trim() ? 'Verification token added' : 'Not connected' },
      { label: 'Structured data', state: schemaState === 'invalid' ? 'bad' : schemaState === 'valid' ? 'good' : 'info',
        detail: schemaState === 'invalid' ? 'Invalid JSON' : schemaState === 'valid' ? 'Valid JSON-LD' : 'None added (optional)' },
    ];
    const titleLength = form.title?.trim().length || 0, descriptionLength = form.description?.trim().length || 0;
    return [
      { label: 'Title', state: !titleLength ? 'info' : titleLength < 30 || titleLength > 60 ? 'warn' : 'good',
        detail: !titleLength ? 'Using the page’s built-in title' : titleLength < 30 ? 'Short, aim for 30–60 characters' : titleLength > 60 ? 'Long, may get cut off' : `${titleLength} characters` },
      { label: 'Description', state: !descriptionLength ? 'warn' : descriptionLength < 70 || descriptionLength > 160 ? 'warn' : 'good',
        detail: !descriptionLength ? 'Not written, Google picks text itself' : descriptionLength < 70 ? 'Short, aim for 70–160 characters' : descriptionLength > 160 ? 'Long, may get cut off' : `${descriptionLength} characters` },
      { label: 'Google indexing', state: isPrivate ? 'info' : form.robots?.index === false ? 'bad' : 'good',
        detail: isPrivate ? 'Private page, always hidden from search' : form.robots?.index === false ? 'Hidden from Google (noindex)' : 'Google can show this page' },
      { label: 'Sitemap', state: isPrivate ? 'info' : indexBlocked || form.sitemap?.include === false ? 'warn' : 'good',
        detail: isPrivate ? 'Private pages are never listed' : indexBlocked || form.sitemap?.include === false ? 'Not listed in sitemap.xml' : 'Listed in sitemap.xml' },
      { label: 'Canonical address', state: canonicalBad ? 'bad' : 'good', detail: canonicalBad ? 'Must be a niqaha.com address' : canonical ? canonical : 'Uses this page’s own address' },
      { label: 'Share image', state: form.openGraph?.image?.trim() ? 'good' : 'info', detail: form.openGraph?.image?.trim() ? 'Custom image set' : 'Using the default site image' },
      { label: 'Structured data', state: schemaState === 'invalid' ? 'bad' : schemaState === 'valid' ? 'good' : 'info',
        detail: schemaState === 'invalid' ? 'Invalid JSON' : schemaState === 'valid' ? 'Valid JSON-LD' : 'None added (optional)' },
      ...(hreflangBad ? [{ label: 'Hreflang', state: 'bad' as const, detail: 'Each line needs “language: URL”' }] : []),
    ];
  }, [isSite, isPrivate, form, schemaState, indexBlocked, canonical, canonicalBad, hreflangBad]);
  const goodChecks = checks.filter(check => check.state === 'good').length;
  const badChecks = checks.filter(check => check.state === 'bad').length;

  const records = useMemo(() => new Map(saved.map(item => [item.scope, item])), [saved]);
  const rows = useMemo<Row[]>(() => {
    const list: Row[] = [{ path: SITE, label: 'Site-wide settings', status: statusOf(records.get(SITE)), isPrivate: false, updatedAt: updatedOf(records.get(SITE)) }];
    for (const page of visualPageCatalog) {
      const item = records.get(page.path);
      list.push({ path: page.path, label: page.label, status: statusOf(item), isPrivate: isPrivateSeoPath(page.path), updatedAt: updatedOf(item) });
    }
    for (const item of saved) {
      if (item.scope === SITE || catalogLabels.has(item.scope)) continue;
      list.push({ path: item.scope, label: 'Specific address', status: statusOf(item), isPrivate: isPrivateSeoPath(item.scope), updatedAt: updatedOf(item) });
    }
    return list;
  }, [records, saved]);
  const visibleRows = useMemo(() => {
    const q = tableQuery.trim().toLowerCase();
    const direction = sort.dir === 'asc' ? 1 : -1;
    return rows.filter(row => (tableFilter === 'all' || (tableFilter === 'private' ? row.isPrivate : row.status === tableFilter)) &&
      (!q || row.label.toLowerCase().includes(q) || row.path.toLowerCase().includes(q)))
      .sort((a, b) => {
        let diff = 0;
        if (sort.key === 'page') diff = a.label.localeCompare(b.label);
        else if (sort.key === 'status') diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        else diff = (a.updatedAt ? Date.parse(a.updatedAt) : 0) - (b.updatedAt ? Date.parse(b.updatedAt) : 0);
        return diff * direction || a.label.localeCompare(b.label);
      });
  }, [rows, tableQuery, tableFilter, sort]);

  const privateCount = visualPageCatalog.filter(page => isPrivateSeoPath(page.path)).length;
  const liveCount = saved.filter(item => item.published).length;
  const pendingCount = saved.filter(item => item.hasUnpublishedChanges).length;
  const tabs: { value: Tab; label: string; icon: ReactNode }[] = isSite
    ? [{ value: 'site', label: 'Site identity', icon: <Settings2 size={13} /> }, { value: 'schema', label: 'Structured data', icon: <Code2 size={13} /> }]
    : [{ value: 'search', label: 'Search', icon: <FileSearch size={13} /> }, { value: 'social', label: 'Social sharing', icon: <ImageIcon size={13} /> },
      { value: 'indexing', label: 'Indexing', icon: <Globe size={13} /> }, { value: 'schema', label: 'Structured data', icon: <Code2 size={13} /> }];
  const activeTab = tabs.some(item => item.value === tab) ? tab : tabs[0].value;
  const canPublish = !!doc && !busy && !dirty && !!doc.hasUnpublishedChanges;
  const pageRecord = records.get(scope);
  const statusPill = dirty ? <StatusPill tone="warning">Unsaved changes</StatusPill>
    : doc?.hasUnpublishedChanges ? <StatusPill tone="warning">Draft waiting to publish</StatusPill>
      : pageRecord?.published ? <StatusPill tone="positive"><Check size={11} /> Live</StatusPill>
        : <StatusPill tone="neutral">Original metadata</StatusPill>;
  const smallButton = 'px-2.5 py-1 text-[12px]';
  const checkIcon = (state: CheckState) => state === 'good' ? <CheckCircle2 size={15} className="text-emerald-600" />
    : state === 'info' ? <Info size={15} className="text-[#adb5bd]" />
      : <TriangleAlert size={15} className={state === 'bad' ? 'text-red-600' : 'text-amber-500'} />;

  return <DashboardPage>
    <DashboardHeader
      title="SEO"
      description="Control how each page appears in Google and when it’s shared on social media. Changes stay in a draft until you publish, and the built-in metadata is always the fallback."
      meta={doc ? statusPill : null}
      actions={<>
        {!isSite && !scope.includes('[') && <a href={scope} target="_blank" rel="noopener noreferrer" className={darkLink}><ExternalLink size={14} /> View page</a>}
        <DashButton tone="ghost-dark" title="Save draft (Ctrl+S)" disabled={!doc || busy || !dirty} onClick={() => void save()}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save draft
        </DashButton>
        <DashButton tone="primary" disabled={!canPublish} title={dirty ? 'Save your changes first' : undefined} onClick={() => setConfirmPublish(true)}>
          <Send size={14} /> Publish
        </DashButton>
      </>}
    />

    <KpiRow>
      <KpiCard label="Pages" value={visualPageCatalog.length} icon={<FileSearch size={16} />} hint={`${visualPageCatalog.length - privateCount} public, ${privateCount} private`} />
      <KpiCard label="Custom SEO live" value={liveCount} tone="positive" hint="Using your published settings" />
      <KpiCard label="Waiting to publish" value={pendingCount} tone={pendingCount ? 'warning' : 'positive'}
        hint={pendingCount ? 'Drafts search engines can’t see yet' : 'Everything is live'} />
      <KpiCard label="Private pages" value={privateCount} icon={<LockKeyhole size={16} />} hint="Always hidden from search" />
    </KpiRow>

    {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
      <span>{loadError}</span>
      <DashButton onClick={() => { const current = scope; setScope(SITE === current ? '/' : SITE); window.setTimeout(() => setScope(current), 0); }}>Try again</DashButton>
    </div>}

    <div ref={workspaceRef} className="grid scroll-mt-4 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-label="SEO settings" className="min-w-0 rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#f0f0f0] px-3 py-2.5">
          <ScopePicker scope={scope} records={records} onOpen={openScope} />
          <div className="ml-auto max-w-full">
            <Segmented label="Settings section" size="sm" value={activeTab} onChange={setTab}
              options={tabs.map(item => ({ value: item.value, label: item.label, icon: item.icon }))} />
          </div>
        </div>

        {!doc ? <div className="flex items-center justify-center gap-2 py-24 text-[13px] text-[#6c757d]">
          {loadError ? 'Settings couldn’t be loaded.' : <><Loader2 size={16} className="animate-spin" /> Loading settings…</>}
        </div> : <div className="space-y-5 p-4">
          {isPrivate && <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2.5 text-[12px] leading-5 text-amber-900">
            <LockKeyhole size={14} className="mt-0.5 shrink-0" /> This is a private account page. You can change its title, but it always stays hidden from search and out of the sitemap.
          </p>}

          {activeTab === 'search' && <>
            <Field id="seo-title" label="Title in search results">
              <input id="seo-title" dir="auto" value={form.title || ''} onChange={event => change('title', event.target.value)}
                placeholder={defaultTitle} className={fieldClass} />
              <LengthHint length={form.title?.trim().length || 0} min={30} max={60} empty="Empty: the page’s built-in title is used." />
            </Field>
            <Field id="seo-description" label="Description in search results">
              <textarea id="seo-description" dir="auto" rows={3} value={form.description || ''} onChange={event => change('description', event.target.value)}
                placeholder="A clear, honest summary of what this page offers." className={cn(fieldClass, 'resize-y leading-6')} />
              <LengthHint length={form.description?.trim().length || 0} min={70} max={160} empty="Empty: Google chooses text from the page." />
            </Field>
            <Field id="seo-canonical" label="Canonical address"
              hint={canonicalBad ? <span className="text-red-600">Use a niqaha.com address, or leave it empty.</span> : 'Leave empty to use this page’s own address. Set it only when another page is the preferred version.'}>
              <input id="seo-canonical" value={form.canonical || ''} onChange={event => change('canonical', event.target.value)}
                placeholder={SITE_ORIGIN + (scope === '/' ? '' : scope)} aria-invalid={canonicalBad}
                className={cn(fieldClass, 'font-mono text-[13px]', canonicalBad && 'border-red-400')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="seo-keywords" label="Keywords (optional)" hint="Separate with commas. Google mostly ignores this tag.">
                <input id="seo-keywords" dir="auto" value={keywordText}
                  onChange={event => { setKeywordText(event.target.value); change('keywords', event.target.value.split(',').map(word => word.trim()).filter(Boolean)); }}
                  placeholder="marriage, biodata" className={fieldClass} />
              </Field>
              <Field id="seo-author" label="Author (optional)">
                <input id="seo-author" dir="auto" value={form.author || ''} onChange={event => change('author', event.target.value)} className={fieldClass} />
              </Field>
            </div>
          </>}

          {activeTab === 'social' && <>
            <p className="text-[12px] text-[#6c757d]">Empty fields fall back to the search title and description. Share images work best at about 1200 × 630 px and must be publicly reachable.</p>
            <SubHeading>Facebook, Messenger and LinkedIn</SubHeading>
            <Field id="og-title" label="Share title">
              <input id="og-title" dir="auto" value={form.openGraph?.title || ''} onChange={event => nested('openGraph', 'title', event.target.value)} placeholder={shownTitle} className={fieldClass} />
            </Field>
            <Field id="og-description" label="Share description">
              <textarea id="og-description" dir="auto" rows={2} value={form.openGraph?.description || ''} onChange={event => nested('openGraph', 'description', event.target.value)}
                placeholder={shownDescription || 'Falls back to the search description'} className={cn(fieldClass, 'resize-y')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="og-image" label="Share image URL">
                <input id="og-image" value={form.openGraph?.image || ''} onChange={event => nested('openGraph', 'image', event.target.value)} placeholder="/opengraph-image" className={cn(fieldClass, 'font-mono text-[13px]')} />
              </Field>
              <Field id="og-alt" label="Image description">
                <input id="og-alt" dir="auto" value={form.openGraph?.imageAlt || ''} onChange={event => nested('openGraph', 'imageAlt', event.target.value)} className={fieldClass} />
              </Field>
              <Field id="og-type" label="Page type">
                <select id="og-type" value={form.openGraph?.type || 'website'} onChange={event => nested('openGraph', 'type', event.target.value)} className={fieldClass}>
                  <option value="website">Website</option><option value="article">Article</option>
                </select>
              </Field>
              <Field id="og-locale" label="Language and region">
                <input id="og-locale" value={form.openGraph?.locale || ''} onChange={event => nested('openGraph', 'locale', event.target.value)} placeholder="bn_BD" className={fieldClass} />
              </Field>
            </div>
            <SubHeading>X (Twitter)</SubHeading>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="x-card" label="Card style">
                <select id="x-card" value={form.twitter?.card || 'summary_large_image'} onChange={event => nested('twitter', 'card', event.target.value)} className={fieldClass}>
                  <option value="summary_large_image">Large image</option><option value="summary">Small image</option>
                </select>
              </Field>
              <Field id="x-image" label="Image URL">
                <input id="x-image" value={form.twitter?.image || ''} onChange={event => nested('twitter', 'image', event.target.value)} placeholder="Uses the share image" className={cn(fieldClass, 'font-mono text-[13px]')} />
              </Field>
            </div>
            <Field id="x-title" label="Title">
              <input id="x-title" dir="auto" value={form.twitter?.title || ''} onChange={event => nested('twitter', 'title', event.target.value)} placeholder={ogTitle} className={fieldClass} />
            </Field>
            <Field id="x-description" label="Description">
              <textarea id="x-description" dir="auto" rows={2} value={form.twitter?.description || ''} onChange={event => nested('twitter', 'description', event.target.value)}
                placeholder={ogDescription || 'Falls back to the share description'} className={cn(fieldClass, 'resize-y')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="x-site" label="Site account">
                <input id="x-site" value={form.twitter?.site || ''} onChange={event => nested('twitter', 'site', event.target.value)} placeholder="@niqaha" className={fieldClass} />
              </Field>
              <Field id="x-creator" label="Creator account">
                <input id="x-creator" value={form.twitter?.creator || ''} onChange={event => nested('twitter', 'creator', event.target.value)} className={fieldClass} />
              </Field>
            </div>
          </>}

          {activeTab === 'indexing' && <>
            <SubHeading>Search engines</SubHeading>
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle id="robots-index" label="Show in Google" description={isPrivate ? 'Private pages are always hidden' : 'Turning this off adds noindex'}
                checked={!isPrivate && form.robots?.index !== false} disabled={isPrivate} onChange={value => nested('robots', 'index', value)} />
              <Toggle id="robots-follow" label="Follow links on this page" description="Lets search engines discover linked pages"
                checked={!isPrivate && form.robots?.follow !== false} disabled={isPrivate} onChange={value => nested('robots', 'follow', value)} />
              <Toggle id="robots-snippet" label="Hide the text snippet" description="Results show the title only"
                checked={form.robots?.nosnippet === true} onChange={value => nested('robots', 'nosnippet', value)} />
              <Toggle id="robots-images" label="Keep images out of image search" description="Adds noimageindex"
                checked={form.robots?.noimageindex === true} onChange={value => nested('robots', 'noimageindex', value)} />
              <Toggle id="robots-archive" label="No cached copy" description="Adds noarchive (rarely needed)"
                checked={form.robots?.noarchive === true} onChange={value => nested('robots', 'noarchive', value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="robots-snippet-length" label="Longest text snippet" hint="Characters. Leave empty for no limit, or -1 for any length.">
                <input id="robots-snippet-length" type="number" min={-1} max={10000} value={form.robots?.maxSnippet ?? ''} placeholder="No limit"
                  onChange={event => nested('robots', 'maxSnippet', event.target.value === '' ? undefined : Number(event.target.value))} className={fieldClass} />
              </Field>
              <Field id="robots-image-preview" label="Image preview size">
                <select id="robots-image-preview" value={form.robots?.maxImagePreview || 'large'} onChange={event => nested('robots', 'maxImagePreview', event.target.value)} className={fieldClass}>
                  <option value="large">Large</option><option value="standard">Standard</option><option value="none">None</option>
                </select>
              </Field>
            </div>
            <SubHeading>Sitemap</SubHeading>
            <Toggle id="sitemap-include" label="List in sitemap.xml" description="Only public pages that Google may show are listed"
              checked={!isPrivate && form.sitemap?.include !== false} disabled={isPrivate} onChange={value => nested('sitemap', 'include', value)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="sitemap-frequency" label="How often it changes">
                <select id="sitemap-frequency" value={form.sitemap?.changeFrequency || 'monthly'} onChange={event => nested('sitemap', 'changeFrequency', event.target.value)} className={fieldClass}>
                  {['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'].map(value =>
                    <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
                </select>
              </Field>
              <Field id="sitemap-priority" label="Priority (0 to 1)" hint="Leave empty for the default.">
                <input id="sitemap-priority" type="number" step={0.1} min={0} max={1} value={form.sitemap?.priority ?? ''} placeholder="Default"
                  onChange={event => nested('sitemap', 'priority', event.target.value === '' ? undefined : Number(event.target.value))} className={fieldClass} />
              </Field>
            </div>
          </>}

          {activeTab === 'site' && <>
            <Field id="site-name" label="Site name">
              <input id="site-name" dir="auto" value={form.siteName || ''} onChange={event => change('siteName', event.target.value)} placeholder="Niqaha.com" className={fieldClass} />
            </Field>
            <Field id="site-image" label="Default share image URL" hint="Used whenever a page has no share image of its own.">
              <input id="site-image" value={form.openGraph?.image || ''} onChange={event => nested('openGraph', 'image', event.target.value)} placeholder="/opengraph-image" className={cn(fieldClass, 'font-mono text-[13px]')} />
            </Field>
            <SubHeading>Search Console verification</SubHeading>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="verify-google" label="Google token"
                hint={looksLikeTag(form.verification?.google) ? <span className="text-red-600">Paste only the token value, not the whole meta tag.</span> : 'Only the token, without the meta tag.'}>
                <input id="verify-google" value={form.verification?.google || ''} onChange={event => nested('verification', 'google', event.target.value)}
                  aria-invalid={looksLikeTag(form.verification?.google)} className={cn(fieldClass, 'font-mono text-[13px]')} />
              </Field>
              <Field id="verify-bing" label="Bing token"
                hint={looksLikeTag(form.verification?.bing) ? <span className="text-red-600">Paste only the token value, not the whole meta tag.</span> : undefined}>
                <input id="verify-bing" value={form.verification?.bing || ''} onChange={event => nested('verification', 'bing', event.target.value)}
                  aria-invalid={looksLikeTag(form.verification?.bing)} className={cn(fieldClass, 'font-mono text-[13px]')} />
              </Field>
            </div>
          </>}

          {activeTab === 'schema' && <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] text-[#6c757d]">schema.org JSON-LD that truthfully describes what’s on {isSite ? 'the site' : 'this page'}. Scripts aren’t accepted, and rich results are never guaranteed.</p>
              <div className="flex gap-1.5">
                {schemaState === 'empty' && <DashButton className={smallButton} onClick={() => change('structuredData', JSON.stringify({
                  '@context': 'https://schema.org', '@type': isSite ? 'Organization' : 'WebPage',
                  name: isSite ? form.siteName?.trim() || 'Niqaha.com' : shownTitle, url: pageUrl,
                }, null, 2))}>Insert a starter</DashButton>}
                {schemaState === 'valid' && <DashButton className={smallButton} onClick={() => change('structuredData', JSON.stringify(JSON.parse(form.structuredData || '{}'), null, 2))}>Tidy formatting</DashButton>}
              </div>
            </div>
            <div>
              <label htmlFor="seo-schema" className="sr-only">Structured data JSON-LD</label>
              <textarea id="seo-schema" spellCheck={false} value={form.structuredData || ''} onChange={event => change('structuredData', event.target.value)}
                placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "Niqaha"\n}'}
                className={cn(fieldClass, 'min-h-64 resize-y font-mono text-[12px] leading-5', schemaState === 'invalid' && 'border-red-400')} />
              <p className={cn('mt-1 text-[11px]', schemaState === 'invalid' ? 'text-red-600' : schemaState === 'valid' ? 'text-emerald-700' : 'text-[#6c757d]')}>
                {schemaState === 'invalid' ? 'This isn’t valid JSON yet. Saving stays blocked until it is.' : schemaState === 'valid' ? 'Valid JSON' : 'Optional.'}
              </p>
            </div>
            {!isSite && <Field id="seo-hreflang" label="Translated versions (hreflang)"
              hint={hreflangBad ? <span className="text-red-600">Write one “language: URL” pair per line, for example bn: /</span> : 'One real translated page per line, as “language: URL”. Don’t list pages that don’t exist.'}>
              <textarea id="seo-hreflang" rows={3} value={langInput} onChange={event => setLangInput(event.target.value)} placeholder={'bn: /\nen: /en'}
                aria-invalid={hreflangBad} className={cn(fieldClass, 'resize-y font-mono text-[12px]', hreflangBad && 'border-red-400')} />
            </Field>}
          </>}
        </div>}

        {doc && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f0f0] px-4 py-3">
          <button type="button" onClick={() => {
            if (!confirmReset) { setConfirmReset(true); return; }
            setConfirmReset(false);
            setForm({}); setLangInput(''); setKeywordText('');
            toast('Original metadata selected. Save and publish to apply it.');
          }} className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors',
            confirmReset ? 'bg-red-600 text-white hover:bg-red-700' : 'text-[#6c757d] hover:bg-[#f1f3f5] hover:text-[#212529]')}>
            <RotateCcw size={13} /> {confirmReset ? 'Click again to clear every custom field' : 'Use original metadata'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#adb5bd]">Revision {doc.revision ?? 0}</span>
            <DashButton tone="dark" disabled={busy || !dirty} onClick={() => void save()}><Save size={14} /> Save draft</DashButton>
            <DashButton tone="primary" disabled={!canPublish} onClick={() => setConfirmPublish(true)}><Send size={14} /> Publish</DashButton>
          </div>
        </div>}
      </section>

      <aside aria-label="Previews and checks" className="min-w-0 space-y-4 xl:sticky xl:top-4">
        {!isSite && <Panel title="Google preview" description="Google may rewrite titles and snippets.">
          <div className="relative rounded-md border border-[#e9ecef] bg-white p-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f1f3f4] text-[12px] font-bold text-rose-600" aria-hidden>N</span>
              <div className="min-w-0 leading-tight">
                <p className="text-[13px] text-[#202124]">Niqaha.com</p>
                <p className="truncate text-[12px] text-[#4d5156]">{crumb}</p>
              </div>
            </div>
            <p dir="auto" className="mt-2 line-clamp-2 text-[18px] leading-snug text-[#1a0dab]">{shownTitle}</p>
            <p dir="auto" className="mt-1 line-clamp-2 text-[13px] leading-5 text-[#4d5156]">
              {form.robots?.nosnippet ? <span className="italic text-[#9aa0a6]">No snippet: only the title shows.</span>
                : shownDescription || <span className="italic text-[#9aa0a6]">Google picks text from the page.</span>}
            </p>
            {indexBlocked && <div className="absolute inset-0 flex items-center justify-center rounded-md bg-white/85 p-4 text-center">
              <p className="flex items-center gap-2 text-[12px] font-medium text-[#495057]"><LockKeyhole size={14} /> Hidden from Google, so this result won’t appear.</p>
            </div>}
          </div>
        </Panel>}

        <Panel title={isSite ? 'Default share card' : 'Share preview'}
          actions={<Segmented size="sm" label="Network" value={network} onChange={setNetwork}
            options={[{ value: 'facebook', label: 'Facebook' }, { value: 'x', label: 'X' }]} />}>
          {network === 'facebook' ? <div className="overflow-hidden rounded-md border border-[#dadde1]">
            <PreviewImage src={ogImage} alt={form.openGraph?.imageAlt || ''} className="aspect-[1.91/1] w-full" />
            <div className="border-t border-[#dadde1] bg-[#f0f2f5] px-3 py-2">
              <p className="text-[11px] uppercase text-[#606770]">niqaha.com</p>
              <p dir="auto" className="line-clamp-1 text-[14px] font-semibold text-[#1d2129]">{ogTitle}</p>
              {ogDescription && <p dir="auto" className="line-clamp-1 text-[12px] text-[#606770]">{ogDescription}</p>}
            </div>
          </div> : form.twitter?.card === 'summary' ? <div className="flex overflow-hidden rounded-2xl border border-[#cfd9de]">
            <PreviewImage src={xImage} alt="" className="size-[100px] shrink-0" />
            <div className="min-w-0 border-l border-[#cfd9de] px-3 py-2">
              <p className="text-[12px] text-[#536471]">niqaha.com</p>
              <p dir="auto" className="line-clamp-1 text-[14px] text-[#0f1419]">{xTitle}</p>
              {xDescription && <p dir="auto" className="line-clamp-2 text-[12px] text-[#536471]">{xDescription}</p>}
            </div>
          </div> : <div>
            <div className="relative overflow-hidden rounded-2xl border border-[#cfd9de]">
              <PreviewImage src={xImage} alt="" className="aspect-[1.91/1] w-full" />
              <span dir="auto" className="absolute bottom-2 left-2 max-w-[85%] truncate rounded bg-black/70 px-1.5 py-0.5 text-[12px] text-white">{xTitle}</span>
            </div>
            <p className="mt-1 text-[12px] text-[#536471]">From niqaha.com</p>
          </div>}
          {!form.openGraph?.image?.trim() && <p className="mt-2 text-[11px] text-[#6c757d]">Showing the default site image.</p>}
        </Panel>

        <Panel title="Checklist" description={`${goodChecks} of ${checks.length} look good${badChecks ? ` · ${badChecks} need fixing` : ''}`}>
          <ul className="space-y-2.5">
            {checks.map(check => <li key={check.label} className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0">{checkIcon(check.state)}</span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium">{check.label}</span>
                <span className="block break-words text-[12px] text-[#6c757d]">{check.detail}</span>
              </span>
            </li>)}
          </ul>
        </Panel>
      </aside>
    </div>

    <Panel title="All pages" description="Every page with its SEO status. Private pages always stay out of search." bodyClassName="p-0"
      actions={<>
        <label className="relative">
          <span className="sr-only">Search pages</span>
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#adb5bd]" />
          <input value={tableQuery} onChange={event => setTableQuery(event.target.value)} placeholder="Search pages" className={cn(fieldClass, 'w-48 py-1.5 pl-8 text-[13px]')} />
        </label>
        <Segmented label="Filter by status" size="sm" value={tableFilter} onChange={setTableFilter} options={[
          { value: 'all', label: 'All' }, { value: 'pending', label: 'Waiting' }, { value: 'live', label: 'Live' },
          { value: 'original', label: 'Original' }, { value: 'private', label: 'Private' },
        ]} />
      </>}>
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              <SortHeader label="Page" sortKey="page" sort={sort} onSort={setSort} />
              <PlainHeader label="Search visibility" />
              <SortHeader label="Status" sortKey="status" sort={sort} onSort={setSort} />
              <SortHeader label="Updated" sortKey="updated" sort={sort} onSort={setSort} />
              <PlainHeader label="Actions" className="text-right" />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(row => {
              const current = row.path === scope;
              return <tr key={row.path} className={cn('border-b border-[#f0f0f0] last:border-0 hover:bg-[#f8f9fa]', current && 'bg-rose-50/60')}>
                <td className="px-3 py-2.5">
                  <p className="flex items-center gap-1.5 truncate font-medium">
                    {row.path === SITE && <Settings2 size={13} className="shrink-0 text-rose-600" />}{row.label}
                    {current && <span className="text-[11px] font-normal text-rose-700">Open now</span>}
                  </p>
                  <p className="truncate font-mono text-[11px] text-[#6c757d]">{row.path === SITE ? 'Applies to every page' : row.path}</p>
                </td>
                <td className="px-3 py-2.5">
                  {row.path === SITE ? <span className="text-[#6c757d]">—</span>
                    : row.isPrivate ? <StatusPill tone="neutral"><LockKeyhole size={11} /> Always hidden</StatusPill>
                      : row.path.includes('[') ? <StatusPill tone="info">Template</StatusPill>
                        : <StatusPill tone="positive"><Globe size={11} /> Public</StatusPill>}
                </td>
                <td className="px-3 py-2.5">
                  {row.status === 'pending' ? <StatusPill tone="warning">Draft waiting</StatusPill>
                    : row.status === 'live' ? <StatusPill tone="positive"><Check size={11} /> Live</StatusPill>
                      : <StatusPill tone="neutral">Original</StatusPill>}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[#6c757d]">{formatWhen(row.updatedAt)}</td>
                <td className="px-3 py-2.5 text-right">
                  <DashButton className={smallButton} disabled={current} onClick={() => {
                    if (openScope(row.path)) window.requestAnimationFrame(() => workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                  }}>{row.status === 'pending' ? 'Review & publish' : 'Edit'}</DashButton>
                </td>
              </tr>;
            })}
            {!visibleRows.length && <tr><td colSpan={5} className="px-3 py-10 text-center text-[13px] text-[#6c757d]">
              No pages match.{' '}
              <button type="button" className="font-medium text-rose-700 underline" onClick={() => { setTableQuery(''); setTableFilter('all'); }}>Clear filters</button>
            </td></tr>}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[#f0f0f0] px-4 py-2 text-[12px] text-[#6c757d]">Showing {visibleRows.length} of {rows.length}</p>
    </Panel>

    <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isSite ? 'Publish site-wide SEO?' : 'Publish SEO for this page?'}</AlertDialogTitle>
          <AlertDialogDescription>
            {isSite ? 'The new settings apply to every page. Search metadata and the sitemap refresh right away.'
              : 'Search engines and social networks get the new title, description and settings. The sitemap refreshes too.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="break-all rounded-md border border-[#e9ecef] bg-[#f8f9fa] px-3 py-2 font-mono text-xs text-[#495057]">{isSite ? 'Whole site' : scope}</p>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} className="bg-rose-600 hover:bg-rose-700" onClick={() => void publish()}>Publish</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </DashboardPage>;
}
