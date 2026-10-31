'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Eye, GripVertical, Loader2, Plus, RefreshCw, Save, Search, TriangleAlert, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { defaultQuestions, type ProfileQuestion, type ProfileQuestionSchema } from '@/lib/profile-questions';
import { profileQuestionOptions } from '@/lib/profile-question-options';
import { cn } from '@/lib/utils';
import {
  DashboardHeader, DashboardPage, DashButton, KpiCard, KpiRow, Panel, PlainHeader, SortHeader, StatusPill,
  Toggle, type SortState,
} from './dashboard-kit';
import {
  GENDER_LABEL, QuestionEditor, SECRET_PATHS, TYPE_LABEL, questionIssues, sanitizeQuestion,
} from './QuestionEditor';

type GenderFilter = 'all' | 'male' | 'female';
type StatusFilter = 'all' | 'active' | 'hidden' | 'public' | 'required' | 'unsaved' | 'issues';
type SortKey = 'section' | 'question' | 'type' | 'gender';

const darkField = 'w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-[13px] text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 sm:w-auto [&>option]:bg-[#1a1a2e] [&>option]:text-white';
const newId = () => 'q_' + crypto.randomUUID().replace(/-/g, '');
const byOrder = (a: ProfileQuestion, b: ProfileQuestion) => a.order - b.order;

/** Move one question to `toIndex` among its section siblings (index counted without it). */
function moveWithinSection(questions: ProfileQuestion[], movingId: string, toIndex: number): ProfileQuestion[] {
  const moving = questions.find(q => q.id === movingId);
  if (!moving) return questions;
  const siblings = questions.filter(q => q.section === moving.section).sort(byOrder);
  const from = siblings.findIndex(q => q.id === movingId);
  const rest = siblings.filter(q => q.id !== movingId);
  const to = Math.max(0, Math.min(rest.length, toIndex));
  if (to === from) return questions;
  const before = rest[to - 1], after = rest[to];
  let order = before && after ? (before.order + after.order) / 2 : before ? before.order + 10 : after ? after.order - 10 : moving.order;
  order = Math.round(order * 1000) / 1000;
  if ((before && order <= before.order) || (after && order >= after.order)) {
    const next = [...rest];
    next.splice(to, 0, moving);
    const orders = new Map(next.map((q, i) => [q.id, (i + 1) * 10]));
    return questions.map(q => orders.has(q.id) ? { ...q, order: orders.get(q.id)! } : q);
  }
  return questions.map(q => q.id === movingId ? { ...q, order } : q);
}

export default function QuestionBuilder() {
  const [schema, setSchema] = useState<ProfileQuestionSchema>(defaultQuestions);
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(defaultQuestions));
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState(defaultQuestions.questions[0]?.id || '');
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  const [query, setQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [gender, setGender] = useState<GenderFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'section', dir: 'asc' });
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const [focusSignal, setFocusSignal] = useState(0);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const savedSchema = useMemo(() => JSON.parse(savedJson) as ProfileQuestionSchema, [savedJson]);
  const savedById = useMemo(() => new Map(savedSchema.questions.map(q => [q.id, q])), [savedSchema]);
  const changedIds = useMemo(() => new Set(schema.questions.filter(q => {
    const before = savedById.get(q.id);
    return !before || JSON.stringify(before) !== JSON.stringify(q);
  }).map(q => q.id)), [schema, savedById]);
  const dirty = changedIds.size > 0;
  const issuesById = useMemo(() => new Map(schema.questions.map(q => [q.id, questionIssues(q)])), [schema]);
  const blockingQuestions = useMemo(() => schema.questions.filter(q => (issuesById.get(q.id) || []).some(issue => issue.blocking)), [schema, issuesById]);
  const warningQuestions = useMemo(() => schema.questions.filter(q => {
    const issues = issuesById.get(q.id) || [];
    return issues.length > 0 && !issues.some(issue => issue.blocking);
  }), [schema, issuesById]);
  const selected = schema.questions.find(q => q.id === selectedId) || null;
  const sectionTitle = useCallback((id: number) => schema.sections.find(s => s.id === id)?.title || `Section ${id + 1}`, [schema.sections]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/profile-questions?admin=1', { cache: 'no-store' });
      if (!response.ok) throw Error('Administrator access and a working backend connection are required.');
      const data = await response.json() as ProfileQuestionSchema;
      if (!Array.isArray(data.questions)) throw Error('The server returned an invalid question list.');
      setSchema(data);
      setSavedJson(JSON.stringify(data));
      setSelectedId(old => data.questions.some(q => q.id === old) ? old : data.questions[0]?.id || '');
      setReady(true);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load questions');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const scrollToWorkspace = () => window.requestAnimationFrame(() =>
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  const openQuestion = (id: string) => {
    setSelectedId(id);
    setMobileView('editor');
    scrollToWorkspace();
  };
  const reload = () => {
    if (dirty && !window.confirm('Discard your unsaved changes and reload from the server?')) return;
    void load();
  };
  const discard = () => {
    if (!window.confirm(`Discard ${changedIds.size} unsaved change${changedIds.size === 1 ? '' : 's'}?`)) return;
    const restored = JSON.parse(savedJson) as ProfileQuestionSchema;
    setSchema(restored);
    setSelectedId(old => restored.questions.some(q => q.id === old) ? old : restored.questions[0]?.id || '');
  };
  const showProblems = () => {
    if (!blockingQuestions.length) return;
    setStatus('issues');
    openQuestion(blockingQuestions[0].id);
  };
  const save = async () => {
    if (!ready || saving || !dirty) return;
    if (blockingQuestions.length) {
      toast.error(`Fix ${blockingQuestions.length} question${blockingQuestions.length === 1 ? '' : 's'} before saving`, {
        description: 'They’re marked with a red dot. Opening the first one now.',
      });
      showProblems();
      return;
    }
    setSaving(true);
    try {
      const payload: ProfileQuestionSchema = { ...schema, questions: schema.questions.map(sanitizeQuestion) };
      const response = await fetch('/api/profile-questions', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const json = await response.json().catch(() => ({})) as ProfileQuestionSchema & { message?: string | string[] };
      if (!response.ok) throw Error(Array.isArray(json.message) ? json.message.join(', ') : json.message || 'Save failed');
      setSchema(json);
      setSavedJson(JSON.stringify(json));
      setJustSaved(true);
      toast.success(`Saved. Members now get revision ${json.revision}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed', {
        description: 'If someone else saved meanwhile, reload to get the latest version.',
        action: { label: 'Reload', onClick: () => reload() },
      });
    } finally { setSaving(false); }
  };
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    setJustSaved(false);
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (!justSaved) return;
    const timer = window.setTimeout(() => setJustSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [justSaved]);

  const update = useCallback((id: string, changes: Partial<ProfileQuestion>) => setSchema(s => ({
    ...s, questions: s.questions.map(q => q.id === id ? { ...q, ...changes } : q),
  })), []);
  const changeSection = (id: string, next: number) => setSchema(s => {
    const max = Math.max(0, ...s.questions.filter(q => q.section === next && q.id !== id).map(q => q.order));
    return { ...s, questions: s.questions.map(q => q.id === id ? { ...q, section: next, order: max + 100 } : q) };
  });
  const moveTo = (id: string, toIndex: number) => setSchema(s => ({ ...s, questions: moveWithinSection(s.questions, id, toIndex) }));
  const dropOn = (movingId: string, targetId: string) => setSchema(s => {
    const moving = s.questions.find(q => q.id === movingId), target = s.questions.find(q => q.id === targetId);
    if (!moving || !target || moving.id === target.id || moving.section !== target.section) return s;
    const siblings = s.questions.filter(q => q.section === moving.section).sort(byOrder);
    const from = siblings.indexOf(moving), targetIndex = siblings.indexOf(target);
    const restIndex = siblings.filter(q => q.id !== movingId).indexOf(target);
    return { ...s, questions: moveWithinSection(s.questions, movingId, from < targetIndex ? restIndex + 1 : restIndex) };
  });
  const add = () => {
    const target = sectionFilter === 'all' ? (selected?.section ?? 0) : Number(sectionFilter);
    const id = newId();
    setSchema(s => {
      const max = Math.max(0, ...s.questions.filter(q => q.section === target).map(q => q.order));
      const question: ProfileQuestion = {
        id, question: 'নতুন প্রশ্ন', publicLabel: 'নতুন তথ্য', section: target,
        gender: gender === 'all' ? 'both' : gender, type: 'text', options: [], optionSource: '',
        required: false, enabled: true, showPublic: false, order: max + 100, locked: false,
      };
      return { ...s, questions: [...s.questions, question] };
    });
    setQuery('');
    setStatus('all');
    setFocusSignal(n => n + 1);
    openQuestion(id);
  };
  const duplicate = (q: ProfileQuestion) => {
    const options = q.options.length ? q.options.map(o => ({ ...o }))
      : q.optionSource ? profileQuestionOptions(q, q.gender === 'female' ? 'female' : 'male').map(o => ({ ...o })) : [];
    const copy: ProfileQuestion = {
      ...q, id: newId(), question: (q.question + ' (copy)').slice(0, 1000), required: false, showPublic: false,
      locked: false, options, optionSource: '',
    };
    delete copy.path;
    delete copy.legacyKey;
    setSchema(s => {
      const siblings = s.questions.filter(x => x.section === q.section).sort(byOrder);
      const next = siblings[siblings.findIndex(x => x.id === q.id) + 1];
      copy.order = next ? Math.round(((q.order + next.order) / 2) * 1000) / 1000 : q.order + 10;
      return { ...s, questions: [...s.questions, copy] };
    });
    setSelectedId(copy.id);
    toast.success('Copy added below the original');
  };
  const removeNew = (id: string) => {
    const index = schema.questions.findIndex(q => q.id === id);
    const remaining = schema.questions.filter(q => q.id !== id);
    setSchema(s => ({ ...s, questions: s.questions.filter(q => q.id !== id) }));
    setSelectedId(remaining[Math.max(0, index - 1)]?.id || '');
    setMobileView('list');
  };
  const revert = (id: string) => {
    const before = savedById.get(id);
    if (before) setSchema(s => ({ ...s, questions: s.questions.map(q => q.id === id ? before : q) }));
  };

  const matches = useCallback((q: ProfileQuestion) => {
    if (sectionFilter !== 'all' && q.section !== Number(sectionFilter)) return false;
    if (gender !== 'all' && q.gender !== 'both' && q.gender !== gender) return false;
    if (status === 'active' && !q.enabled) return false;
    if (status === 'hidden' && q.enabled) return false;
    if (status === 'public' && !(q.enabled && q.showPublic)) return false;
    if (status === 'required' && !(q.enabled && q.required)) return false;
    if (status === 'unsaved' && !changedIds.has(q.id)) return false;
    if (status === 'issues' && !(issuesById.get(q.id) || []).length) return false;
    const text = query.trim().toLowerCase();
    return !text || [q.question, q.publicLabel, q.path || '', q.id].some(value => value.toLowerCase().includes(text));
  }, [sectionFilter, gender, status, query, changedIds, issuesById]);
  const visible = useMemo(() => schema.questions.filter(matches), [schema, matches]);
  const grouped = useMemo(() => schema.sections
    .map(section => ({ section, questions: visible.filter(q => q.section === section.id).sort(byOrder) }))
    .filter(group => group.questions.length), [schema.sections, visible]);
  const tableRows = useMemo(() => {
    const direction = sort.dir === 'asc' ? 1 : -1;
    return [...visible].sort((a, b) => {
      let diff = 0;
      if (sort.key === 'section') diff = a.section - b.section || a.order - b.order;
      else if (sort.key === 'question') diff = a.question.localeCompare(b.question);
      else if (sort.key === 'type') diff = TYPE_LABEL[a.type].localeCompare(TYPE_LABEL[b.type]);
      else diff = a.gender.localeCompare(b.gender);
      return diff * direction || a.section - b.section || a.order - b.order;
    });
  }, [visible, sort]);

  const selSiblings = selected ? schema.questions.filter(q => q.section === selected.section).sort(byOrder) : [];
  const selIndex = selected ? selSiblings.findIndex(q => q.id === selected.id) : -1;
  const total = schema.questions.length;
  const activeCount = schema.questions.filter(q => q.enabled).length;
  const publicCount = schema.questions.filter(q => q.enabled && q.showPublic).length;
  const requiredCount = schema.questions.filter(q => q.enabled && q.required).length;
  const issueCount = blockingQuestions.length + warningQuestions.length;
  const filtersActive = !!query || sectionFilter !== 'all' || gender !== 'all' || status !== 'all';
  const clearFilters = () => { setQuery(''); setSectionFilter('all'); setGender('all'); setStatus('all'); };
  const kpi = (value: number) => ready ? value : '—';
  const filterLabel = 'flex w-full items-center gap-1.5 text-[12px] text-white/70 sm:w-auto';

  return <DashboardPage className="pb-4">
    <DashboardHeader
      title="Profile questions"
      description="Decide what members are asked, who is asked, and what visitors see on public biodata. Answers members already gave are never deleted."
      meta={<>
        {ready && <StatusPill tone="neutral">Revision {schema.revision}</StatusPill>}
        {dirty ? <StatusPill tone="warning">{changedIds.size} unsaved</StatusPill>
          : ready && <StatusPill tone="positive"><Check size={11} /> All saved</StatusPill>}
        {blockingQuestions.length > 0 && <StatusPill tone="negative">{blockingQuestions.length} to fix</StatusPill>}
      </>}
      actions={<>
        <DashButton tone="ghost-dark" disabled={loading || saving} onClick={reload}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} /> Reload
        </DashButton>
        <DashButton tone="primary" disabled={!ready} onClick={add}><Plus size={14} /> Add question</DashButton>
      </>}>
      <label className="relative w-full sm:w-auto sm:min-w-[220px] sm:flex-1 lg:max-w-xs">
        <span className="sr-only">Search questions</span>
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search questions or fields"
          className={cn(darkField, 'pl-8 sm:w-full')} />
      </label>
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
        <label className={filterLabel}><span className="hidden sm:inline">Section</span>
          <select aria-label="Section" value={sectionFilter} onChange={event => setSectionFilter(event.target.value)} className={darkField}>
            <option value="all">All sections</option>
            {schema.sections.map(section => <option key={section.id} value={String(section.id)}>{section.title}</option>)}
          </select>
        </label>
        <label className={filterLabel}><span className="hidden sm:inline">Asked to</span>
          <select aria-label="Asked to" value={gender} onChange={event => setGender(event.target.value as GenderFilter)} className={darkField}>
            <option value="all">Everyone</option><option value="male">Men</option><option value="female">Women</option>
          </select>
        </label>
        <label className={cn(filterLabel, 'col-span-2')}><span className="hidden sm:inline">Show</span>
          <select aria-label="Show" value={status} onChange={event => setStatus(event.target.value as StatusFilter)} className={darkField}>
            <option value="all">All questions</option>
            <option value="active">In the form</option>
            <option value="hidden">Hidden</option>
            <option value="public">Public on biodata</option>
            <option value="required">Required</option>
            <option value="unsaved">Unsaved changes ({changedIds.size})</option>
            <option value="issues">Needs attention ({issueCount})</option>
          </select>
        </label>
      </div>
      {filtersActive && <button type="button" onClick={clearFilters} className="text-[12px] font-medium text-white/80 underline hover:text-white">Clear filters</button>}
    </DashboardHeader>

    <KpiRow>
      <KpiCard label="Questions" value={kpi(total)} hint={ready ? `${total - activeCount} hidden from the form` : 'Loading…'} />
      <KpiCard label="In the form" value={kpi(activeCount)} tone="positive" hint="Members are asked these" />
      <KpiCard label="Public on biodata" value={kpi(publicCount)} hint="Visitors see these answers" />
      <KpiCard label="Required" value={kpi(requiredCount)} tone={requiredCount ? 'warning' : 'default'} hint="Members must answer" />
    </KpiRow>

    {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
      <span>{loadError}{!ready && ' Saving stays off until the questions load, so nothing can overwrite your settings.'}</span>
      <DashButton onClick={() => void load()}>Try again</DashButton>
    </div>}

    {!ready ? <Panel>
      <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[#6c757d]">
        {loading ? <><Loader2 size={16} className="animate-spin" /> Loading questions…</> : 'Questions couldn’t be loaded.'}
      </div>
    </Panel> : <>
      <Panel title="Sections" description="Tap a section to focus on it. Bars show how many of its questions are in the form." bodyClassName="p-3">
        <div className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
          {schema.sections.map(section => {
            const questions = schema.questions.filter(q => q.section === section.id);
            const on = questions.filter(q => q.enabled).length;
            const active = sectionFilter === String(section.id);
            const percent = questions.length ? Math.round((on / questions.length) * 100) : 0;
            return <button key={section.id} type="button" aria-pressed={active}
              onClick={() => { setSectionFilter(active ? 'all' : String(section.id)); setMobileView('list'); }}
              className={cn('min-w-[168px] shrink-0 snap-start rounded-md border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-rose-600 sm:min-w-0',
                active ? 'border-rose-300 bg-rose-50' : 'border-[#e9ecef] hover:bg-[#f8f9fa]')}>
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-medium">{section.title}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-[#6c757d]">{on}/{questions.length}</span>
              </span>
              <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#e9ecef]">
                <span className="block h-full rounded-full bg-rose-500" style={{ width: percent + '%' }} />
              </span>
              {!on && <span className="mt-1.5 block text-[11px] text-amber-700">Skipped in the form</span>}
            </button>;
          })}
        </div>
      </Panel>

      <div ref={workspaceRef} className="grid scroll-mt-4 items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section aria-label="Questions" className={cn('min-w-0 rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] xl:sticky xl:top-4 xl:block',
          mobileView === 'editor' && 'hidden')}>
          <div className="flex items-center justify-between gap-2 border-b border-[#f0f0f0] px-4 py-3">
            <div>
              <h2 className="text-[14px] font-semibold">Questions</h2>
              <p className="text-[12px] text-[#6c757d]">{visible.length} of {total}<span className="hidden xl:inline"> · drag to reorder</span></p>
            </div>
            <DashButton tone="dark" onClick={add}><Plus size={14} /> Add</DashButton>
          </div>
          <div className="max-h-[65vh] overflow-y-auto p-2 xl:max-h-[calc(100vh-170px)]">
            {grouped.map(group => <div key={group.section.id} className="mb-2">
              <p className="sticky top-0 z-[1] bg-white px-2 py-1.5 text-[11px] font-semibold text-[#6c757d]">
                {group.section.title} <span className="font-normal">· {group.questions.length}</span>
              </p>
              <ul className="space-y-0.5">
                {group.questions.map(q => {
                  const issues = issuesById.get(q.id) || [];
                  const blocking = issues.some(issue => issue.blocking);
                  const current = q.id === selectedId;
                  return <li key={q.id} draggable
                    onDragStart={event => { setDragId(q.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', q.id); }}
                    onDragOver={event => {
                      const moving = dragId ? schema.questions.find(x => x.id === dragId) : null;
                      if (moving && moving.id !== q.id && moving.section === q.section) {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        if (dropId !== q.id) setDropId(q.id);
                      }
                    }}
                    onDragLeave={() => setDropId(id => id === q.id ? null : id)}
                    onDrop={event => { event.preventDefault(); if (dragId) dropOn(dragId, q.id); setDragId(null); setDropId(null); }}
                    onDragEnd={() => { setDragId(null); setDropId(null); }}
                    className={cn('rounded-md', dropId === q.id && 'ring-2 ring-rose-400', dragId === q.id && 'opacity-40')}>
                    <button type="button" onClick={() => openQuestion(q.id)} aria-current={current ? 'true' : undefined}
                      className={cn('flex w-full items-start gap-2 rounded-md px-2 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-rose-600 xl:py-2',
                        current ? 'bg-rose-50 ring-1 ring-inset ring-rose-200' : 'hover:bg-[#f8f9fa]')}>
                      <GripVertical size={14} aria-hidden className="mt-0.5 hidden shrink-0 cursor-grab text-[#ced4da] xl:block" />
                      <span className="min-w-0 flex-1">
                        <span className={cn('line-clamp-2 text-[13px] font-medium leading-5', !q.enabled && 'text-[#adb5bd] line-through')}>
                          {q.question || 'Untitled question'}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#6c757d]">
                          <span>{TYPE_LABEL[q.type]}</span>
                          <span>{GENDER_LABEL[q.gender]}</span>
                          {q.enabled && q.required && <span className="text-rose-700">Required</span>}
                          {q.enabled && q.showPublic && <span className="inline-flex items-center gap-0.5"><Eye size={11} /> Public</span>}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1 pt-1">
                        {issues.length > 0 && <span role="img" aria-label={issues[0].message} title={issues[0].message}
                          className={cn('size-2 rounded-full', blocking ? 'bg-red-500' : 'bg-amber-400')} />}
                        {changedIds.has(q.id) && <span role="img" aria-label="Unsaved changes" title="Unsaved changes" className="size-2 rounded-full bg-amber-500 ring-2 ring-amber-100" />}
                      </span>
                    </button>
                  </li>;
                })}
              </ul>
            </div>)}
            {!grouped.length && <div className="px-3 py-10 text-center text-[13px] text-[#6c757d]">
              No questions match these filters.
              {filtersActive && <button type="button" onClick={clearFilters} className="mt-2 block w-full font-medium text-rose-700 underline">Clear filters</button>}
            </div>}
          </div>
        </section>

        <div className={cn('min-w-0 xl:block', mobileView === 'list' && 'hidden')}>
          {selected ? <QuestionEditor
            question={selected}
            sections={schema.sections}
            issues={issuesById.get(selected.id) || []}
            isNew={!savedById.has(selected.id)}
            isChanged={changedIds.has(selected.id)}
            savedVersion={savedById.get(selected.id)}
            canMoveUp={selIndex > 0}
            canMoveDown={selIndex >= 0 && selIndex < selSiblings.length - 1}
            focusSignal={focusSignal}
            onChange={changes => update(selected.id, changes)}
            onSectionChange={next => changeSection(selected.id, next)}
            onMove={direction => moveTo(selected.id, selIndex + direction)}
            onDuplicate={() => duplicate(selected)}
            onToggleArchive={() => update(selected.id, { enabled: !selected.enabled })}
            onDelete={() => removeNew(selected.id)}
            onRevert={() => revert(selected.id)}
            onBack={() => { setMobileView('list'); scrollToWorkspace(); }}
          /> : <Panel><p className="py-16 text-center text-[13px] text-[#6c757d]">Choose a question, or add a new one.</p></Panel>}
        </div>
      </div>

      <Panel title="All questions" bodyClassName="p-0" className="hidden md:block"
        description={`${tableRows.length} of ${total} · switch settings here, or click a question to edit it`}>
        <div className="max-h-[620px] overflow-auto">
          <table className="w-full min-w-[880px] border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <SortHeader label="Question" sortKey="question" sort={sort} onSort={setSort} />
                <SortHeader label="Section" sortKey="section" sort={sort} onSort={setSort} />
                <SortHeader label="Asked to" sortKey="gender" sort={sort} onSort={setSort} />
                <SortHeader label="Type" sortKey="type" sort={sort} onSort={setSort} />
                <PlainHeader label="In form" className="text-center" />
                <PlainHeader label="Required" className="text-center" />
                <PlainHeader label="Public" className="text-center" />
              </tr>
            </thead>
            <tbody>
              {tableRows.map(q => {
                const issues = issuesById.get(q.id) || [];
                const secret = !!q.path && SECRET_PATHS.has(q.path);
                return <tr key={q.id} className={cn('border-b border-[#f0f0f0] last:border-0 hover:bg-[#f8f9fa]', q.id === selectedId && 'bg-rose-50/60')}>
                  <td className="max-w-[440px] px-3 py-2">
                    <button type="button" onClick={() => openQuestion(q.id)} className="block w-full text-left focus-visible:outline-2 focus-visible:outline-rose-600">
                      <span className={cn('line-clamp-2 font-medium', !q.enabled && 'text-[#adb5bd] line-through')}>{q.question || 'Untitled question'}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#6c757d]">
                        {q.enabled && q.showPublic && q.publicLabel && <span className="truncate">Public label: {q.publicLabel.slice(0, 60)}</span>}
                        {changedIds.has(q.id) && <StatusPill tone="warning">Unsaved</StatusPill>}
                        {issues.length > 0 && <StatusPill tone={issues.some(issue => issue.blocking) ? 'negative' : 'warning'}>{issues[0].message}</StatusPill>}
                        {q.locked && <StatusPill tone="info">Login field</StatusPill>}
                      </span>
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[#495057]">{sectionTitle(q.section)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[#495057]">{GENDER_LABEL[q.gender]}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[#495057]">{TYPE_LABEL[q.type]}</td>
                  <td className="px-3 py-2 text-center">
                    <label className="inline-flex"><span className="sr-only">Show in form</span>
                      <Toggle checked={q.enabled} disabled={q.locked} onChange={value => update(q.id, { enabled: value })} /></label>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <label className="inline-flex"><span className="sr-only">Required</span>
                      <Toggle checked={q.required} disabled={q.locked} onChange={value => update(q.id, { required: value })} /></label>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <label className="inline-flex"><span className="sr-only">Show on public biodata</span>
                      <Toggle checked={q.showPublic} disabled={secret} onChange={value => update(q.id, { showPublic: value })} /></label>
                  </td>
                </tr>;
              })}
              {!tableRows.length && <tr><td colSpan={7} className="px-3 py-10 text-center text-[13px] text-[#6c757d]">No questions match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </>}

    {/* Always within reach: the save bar follows you while you scroll. */}
    {ready && (dirty || saving || justSaved) && <div role="region" aria-label="Save changes"
      className="sticky bottom-3 z-30 flex flex-col gap-2 rounded-lg bg-[#1a1a2e] px-4 py-3 text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-[13px]" aria-live="polite">
        {justSaved && !dirty ? <span className="inline-flex items-center gap-1.5 text-emerald-300"><Check size={15} /> All changes saved</span> : <>
          <span className="font-medium">{changedIds.size} unsaved change{changedIds.size === 1 ? '' : 's'}</span>
          {blockingQuestions.length > 0 ? <button type="button" onClick={showProblems}
            className="ml-2 inline-flex items-center gap-1 text-red-300 underline hover:text-red-200">
            <TriangleAlert size={13} /> {blockingQuestions.length} must be fixed first
          </button> : <span className="ml-2 hidden text-white/60 sm:inline">Ctrl + S saves</span>}
        </>}
      </div>
      {dirty && <div className="flex gap-2">
        <DashButton tone="ghost-dark" className="flex-1 sm:flex-none" disabled={saving} onClick={discard}><Undo2 size={14} /> Discard</DashButton>
        <DashButton tone="primary" className="flex-1 sm:flex-none" disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {saving ? 'Saving…' : 'Save changes'}
        </DashButton>
      </div>}
    </div>}
  </DashboardPage>;
}
