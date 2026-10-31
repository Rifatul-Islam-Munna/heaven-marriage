'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlignLeft, Archive, ArchiveRestore, ArrowDown, ArrowLeft, ArrowUp, ChevronDown, Copy, EyeOff, Hash, Info, List,
  ListChecks, Lock, Plus, SquareCheck, Trash2, Type, Undo2, X, type LucideIcon,
} from 'lucide-react';
import { profileQuestionOptions } from '@/lib/profile-question-options';
import {
  questionDisplayValue, questionUsesSeparateStorage,
  type ProfileQuestion, type QuestionOption, type QuestionType,
} from '@/lib/profile-questions';
import { cn } from '@/lib/utils';
import { QuestionInput } from '../updateProfile/DynamicQuestionStep';
import { DashButton, Panel, Segmented, StatusPill, Toggle, fieldClass, labelClass } from './dashboard-kit';

export const OPTION_TYPES = new Set<QuestionType>(['select', 'dropdown', 'multi_checkbox']);
export const SECRET_PATHS = new Set(['email', 'phoneNumber', 'password']);
export const TYPES: { value: QuestionType; label: string; hint: string; icon: LucideIcon }[] = [
  { value: 'text', label: 'Short text', hint: 'One line', icon: Type },
  { value: 'textarea', label: 'Long text', hint: 'A paragraph', icon: AlignLeft },
  { value: 'number', label: 'Number', hint: 'Digits only', icon: Hash },
  { value: 'select', label: 'Dropdown', hint: 'Pick one', icon: List },
  { value: 'dropdown', label: 'Dropdown (classic)', hint: 'Pick one', icon: ChevronDown },
  { value: 'checkbox', label: 'Yes / no', hint: 'Single tick', icon: SquareCheck },
  { value: 'multi_checkbox', label: 'Multiple choice', hint: 'Pick several', icon: ListChecks },
];
export const TYPE_LABEL = Object.fromEntries(TYPES.map(type => [type.value, type.label])) as Record<QuestionType, string>;
export const GENDER_LABEL = { both: 'Everyone', male: 'Men', female: 'Women' } as const;
/** blocking = the backend would reject the save; otherwise it's only advice. */
export type QuestionIssue = { field: 'question' | 'publicLabel' | 'options'; message: string; blocking: boolean };

const effectiveValue = (option: QuestionOption) => option.value.trim() || option.label.trim();

/** Mirrors what the backend accepts, so saving never fails on blank or half-typed choices. */
export function sanitizeQuestion(q: ProfileQuestion): ProfileQuestion {
  if (q.locked) return q;
  const options = q.options
    .map(option => {
      const label = option.label.trim(), value = option.value.trim();
      return { label: label || value, value: value || label };
    })
    .filter(option => option.label && option.value);
  return { ...q, question: q.question.trim(), publicLabel: q.publicLabel.trim(), options };
}

/** Same rules as backend validateQuestion(). Only blocking issues stop a save. */
export function questionIssues(q: ProfileQuestion): QuestionIssue[] {
  if (q.locked) return [];
  const issues: QuestionIssue[] = [];
  if (!q.question.trim()) issues.push({ field: 'question', message: 'Write the question members will see.', blocking: true });
  if (q.showPublic && !q.publicLabel.trim())
    issues.push({ field: 'publicLabel', message: 'Add a public label, or turn off “Show on public biodata”.', blocking: true });
  const filled = q.options.filter(option => option.label.trim() || option.value.trim());
  if (OPTION_TYPES.has(q.type) && !filled.length && !q.optionSource)
    issues.push({ field: 'options', message: 'No answer choices yet, so members can’t pick anything.', blocking: false });
  if (filled.length > 100) issues.push({ field: 'options', message: 'Use 100 answer choices or fewer.', blocking: true });
  if (filled.some(option => option.label.trim().length > 200 || option.value.trim().length > 200))
    issues.push({ field: 'options', message: 'Keep each choice under 200 characters.', blocking: true });
  const seen = new Set<string>(), duplicates = new Set<string>();
  for (const option of filled) {
    const value = effectiveValue(option);
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  if (duplicates.size)
    issues.push({ field: 'options', message: `Two choices save the same value: ${[...duplicates].slice(0, 3).join(', ')}.`, blocking: true });
  return issues;
}

function parseBulk(input: string): QuestionOption[] {
  return input.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const [label, ...rest] = line.split('|');
    return { label: label.trim(), value: (rest.length ? rest.join('|') : label).trim() };
  }).filter(option => option.label && option.value);
}

function Note({ tone, icon: Icon, children }: { tone: 'info' | 'warning'; icon: LucideIcon; children: ReactNode }) {
  return <p className={cn('flex items-start gap-2 rounded-md px-3 py-2.5 text-[12px] leading-5',
    tone === 'info' ? 'bg-sky-50 text-sky-900' : 'bg-amber-50 text-amber-900')}>
    <Icon size={14} className="mt-0.5 shrink-0" />{children}
  </p>;
}
function IssueText({ issue }: { issue?: QuestionIssue }) {
  if (!issue) return null;
  return <span className={issue.blocking ? 'text-red-600' : 'text-amber-700'}>{issue.message}</span>;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return <fieldset className="min-w-0 space-y-3">
    <legend className="mb-3 w-full border-b border-[#f0f0f0] pb-1.5 text-[13px] font-semibold text-[#212529]">{title}</legend>
    {children}
  </fieldset>;
}

function OptionsEditor({ q, savedVersion, issue, onChange }: {
  q: ProfileQuestion; savedVersion?: ProfileQuestion; issue?: QuestionIssue;
  onChange: (changes: Partial<ProfileQuestion>) => void;
}) {
  const [bulk, setBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setBulk(false); }, [q.id]);
  useEffect(() => {
    if (focusIndex === null) return;
    listRef.current?.querySelector<HTMLInputElement>(`[data-option-label="${focusIndex}"]`)?.focus();
    setFocusIndex(null);
  }, [focusIndex, q.options.length]);

  const sourceOptions = useMemo(() => q.optionSource && !q.options.length
    ? profileQuestionOptions(q, q.gender === 'female' ? 'female' : 'male') : [], [q]);
  const savedValues = useMemo(() => new Set((savedVersion?.options || []).map(effectiveValue)), [savedVersion]);
  const counts = new Map<string, number>();
  for (const option of q.options) {
    const value = effectiveValue(option);
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  }
  const setOptions = (options: QuestionOption[]) => onChange({ options, optionSource: '' });
  const updateRow = (index: number, patch: Partial<QuestionOption>) =>
    setOptions(q.options.map((option, i) => i === index ? { ...option, ...patch } : option));
  const moveRow = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= q.options.length) return;
    const next = [...q.options];
    [next[index], next[target]] = [next[target], next[index]];
    setOptions(next);
  };
  const addRow = (at: number) => {
    if (q.options.length >= 100) return;
    const next = [...q.options];
    next.splice(at, 0, { label: '', value: '' });
    setOptions(next);
    setFocusIndex(at);
  };

  if (sourceOptions.length) return <div className="rounded-md border border-sky-200 bg-sky-50 p-3">
    <p className="text-[13px] font-medium text-sky-900">Uses the built-in list · {sourceOptions.length} choices</p>
    <p className="mt-1 line-clamp-2 text-[12px] text-sky-800">
      {sourceOptions.slice(0, 8).map(option => option.label).join(', ')}{sourceOptions.length > 8 ? '…' : ''}
    </p>
    {sourceOptions.length <= 100
      ? <DashButton className="mt-2" onClick={() => setOptions(sourceOptions.map(option => ({ ...option })))}>Customize choices</DashButton>
      : <p className="mt-2 text-[12px] text-sky-800">This list is too long to edit by hand (100 choices max), so it stays automatic.</p>}
  </div>;

  return <div className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[12px] font-semibold text-[#495057]">
        Answer choices <span className="font-normal text-[#adb5bd]">{q.options.length}/100</span>
      </p>
      {!bulk && <DashButton className="px-2 py-1 text-[12px]" onClick={() => {
        setBulkText(q.options.map(option => option.label === option.value ? option.label : `${option.label} | ${option.value}`).join('\n'));
        setBulk(true);
      }}>Paste a list</DashButton>}
    </div>
    {bulk ? <div className="space-y-2">
      <label htmlFor="qb-bulk" className="sr-only">Choices, one per line</label>
      <textarea id="qb-bulk" rows={8} value={bulkText} onChange={event => setBulkText(event.target.value)} dir="auto"
        placeholder={'One choice per line\nYes | yes\nNo | no'} className={cn(fieldClass, 'font-mono text-[12px] leading-5')} />
      <p className="text-[11px] text-[#6c757d]">Write one choice per line. Add “| value” to save a different value than the text members see.</p>
      <div className="flex gap-2">
        <DashButton tone="dark" onClick={() => { setOptions(parseBulk(bulkText).slice(0, 100)); setBulk(false); }}>Replace choices</DashButton>
        <DashButton onClick={() => setBulk(false)}>Cancel</DashButton>
      </div>
    </div> : <div ref={listRef} className="space-y-2 sm:space-y-1.5">
      {q.options.length > 0 && <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_88px] gap-2 px-0.5 text-[11px] font-medium text-[#6c757d] sm:grid">
        <span>Members see</span><span>Saved value</span><span />
      </div>}
      {q.options.map((option, index) => {
        const value = effectiveValue(option);
        const duplicate = !!value && (counts.get(value) || 0) > 1;
        const fresh = !!value && savedValues.size > 0 && !savedValues.has(value);
        return <div key={index} className="grid gap-1.5 rounded-md border border-[#e9ecef] p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_88px] sm:items-center sm:gap-2 sm:border-0 sm:p-0">
          <input data-option-label={index} aria-label={`Choice ${index + 1} text`} value={option.label} dir="auto" maxLength={200}
            onChange={event => updateRow(index, { label: event.target.value })}
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addRow(index + 1); } }}
            placeholder="Display text" className={cn(fieldClass, 'py-1.5 text-[13px]')} />
          <input aria-label={`Choice ${index + 1} saved value`} value={option.value} maxLength={200} aria-invalid={duplicate}
            onChange={event => updateRow(index, { value: event.target.value })}
            title={duplicate ? 'Another choice saves this same value' : fresh ? 'New value: earlier answers don’t use it' : undefined}
            placeholder={option.label || 'Saved value (same as text)'}
            className={cn(fieldClass, 'py-1.5 font-mono text-[12px]', duplicate && 'border-red-400 bg-red-50', !duplicate && fresh && 'border-amber-300')} />
          <div className="flex items-center justify-end">
            <button type="button" aria-label={`Move choice ${index + 1} up`} disabled={index === 0} onClick={() => moveRow(index, -1)}
              className="rounded p-1.5 text-[#6c757d] hover:bg-[#f1f3f5] disabled:opacity-30 sm:p-1"><ArrowUp size={14} /></button>
            <button type="button" aria-label={`Move choice ${index + 1} down`} disabled={index === q.options.length - 1} onClick={() => moveRow(index, 1)}
              className="rounded p-1.5 text-[#6c757d] hover:bg-[#f1f3f5] disabled:opacity-30 sm:p-1"><ArrowDown size={14} /></button>
            <button type="button" aria-label={`Remove choice ${index + 1}`} onClick={() => setOptions(q.options.filter((_, i) => i !== index))}
              className="rounded p-1.5 text-[#6c757d] hover:bg-red-50 hover:text-red-600 sm:p-1"><X size={14} /></button>
          </div>
        </div>;
      })}
      {!q.options.length && <p className="rounded-md border border-dashed border-[#ced4da] px-3 py-4 text-center text-[12px] text-[#6c757d]">No choices yet. Add the first one.</p>}
      <DashButton disabled={q.options.length >= 100} onClick={() => addRow(q.options.length)}><Plus size={14} /> Add choice</DashButton>
    </div>}
    {issue && <p className="text-[12px]"><IssueText issue={issue} /></p>}
    <p className="text-[11px] leading-4 text-[#6c757d]">
      The saved value is stored with each answer. To rename a choice, change only its text so earlier answers still match.
    </p>
  </div>;
}

function PreviewPanel({ q }: { q: ProfileQuestion }) {
  const clean = useMemo(() => sanitizeQuestion(q), [q]);
  const [gender, setGender] = useState<'male' | 'female'>(q.gender === 'female' ? 'female' : 'male');
  const [answer, setAnswer] = useState<string | number | boolean | string[]>('');
  useEffect(() => {
    setAnswer('');
    setGender(q.gender === 'female' ? 'female' : 'male');
  }, [q.id, q.type, q.gender]);
  const shown = questionDisplayValue(answer, clean);
  return <div className="min-w-0 space-y-4 2xl:sticky 2xl:top-4">
    <Panel title="Member form preview" description="Try answering. Nothing is saved."
      actions={q.gender === 'both' ? <Segmented size="sm" label="Preview as" value={gender} onChange={setGender}
        options={[{ value: 'male', label: 'Man' }, { value: 'female', label: 'Woman' }]} /> : undefined}>
      {!q.enabled && <p className="mb-3 flex items-center gap-2 rounded-md bg-[#f8f9fa] px-3 py-2 text-[12px] text-[#6c757d]">
        <EyeOff size={14} /> This question is hidden, so members won’t see it.
      </p>}
      <QuestionInput key={q.id + q.type} q={clean} value={answer} onChange={setAnswer} gender={gender} profile={{ gender }} />
    </Panel>
    <Panel title="Public biodata preview">
      {clean.enabled && clean.showPublic
        ? <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 text-[13px]">
          <dt className="font-semibold">{clean.publicLabel || 'Label'}</dt>
          <dd dir="auto" className="text-[#495057]">{shown || <span className="text-[#adb5bd]">The answer appears here</span>}</dd>
        </dl>
        : <p className="flex items-center gap-2 text-[13px] text-[#6c757d]"><EyeOff size={15} /> Visitors won’t see this answer.</p>}
    </Panel>
  </div>;
}

type EditorProps = {
  question: ProfileQuestion; sections: { id: number; title: string }[]; issues: QuestionIssue[];
  isNew: boolean; isChanged: boolean; savedVersion?: ProfileQuestion;
  canMoveUp: boolean; canMoveDown: boolean; focusSignal: number;
  onChange: (changes: Partial<ProfileQuestion>) => void;
  onSectionChange: (section: number) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void; onToggleArchive: () => void; onDelete: () => void; onRevert: () => void;
  /** Phones and tablets: return to the question list. */
  onBack?: () => void;
};

export function QuestionEditor({
  question: q, sections, issues, isNew, isChanged, savedVersion, canMoveUp, canMoveDown, focusSignal,
  onChange, onSectionChange, onMove, onDuplicate, onToggleArchive, onDelete, onRevert, onBack,
}: EditorProps) {
  const questionRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!focusSignal) return;
    questionRef.current?.focus();
    questionRef.current?.select();
  }, [focusSignal]);
  const secret = !!q.path && SECRET_PATHS.has(q.path);
  const kind = q.legacyKey ? 'Older custom question' : q.path ? 'Built-in field' : 'Custom question';
  const issueFor = (field: QuestionIssue['field']) => issues.find(issue => issue.field === field);
  const questionIssue = issueFor('question'), labelIssue = issueFor('publicLabel');

  return <div className="grid min-w-0 items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
    <section aria-label="Edit question" className="min-w-0 rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="space-y-3 border-b border-[#f0f0f0] px-4 py-3">
        {onBack && <button type="button" onClick={onBack}
          className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-[13px] font-medium text-rose-700 hover:bg-rose-50 xl:hidden">
          <ArrowLeft size={14} /> All questions
        </button>}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-[14px] font-semibold">Edit question</h2>
              <StatusPill tone="neutral">{kind}</StatusPill>
              {!q.enabled && <StatusPill tone="neutral"><EyeOff size={11} /> Hidden from form</StatusPill>}
              {q.locked && <StatusPill tone="info"><Lock size={11} /> Login field</StatusPill>}
              {isChanged && <StatusPill tone="warning">{isNew ? 'New, not saved' : 'Unsaved changes'}</StatusPill>}
            </div>
            <p className="mt-1 truncate font-mono text-[11px] text-[#6c757d]">{q.path || q.legacyKey || q.id}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <DashButton className="px-2" aria-label="Move up" title="Move up" disabled={!canMoveUp} onClick={() => onMove(-1)}><ArrowUp size={15} /></DashButton>
            <DashButton className="px-2" aria-label="Move down" title="Move down" disabled={!canMoveDown} onClick={() => onMove(1)}><ArrowDown size={15} /></DashButton>
            <DashButton disabled={q.locked} onClick={onDuplicate} title="Duplicate"><Copy size={14} /><span className="hidden sm:inline">Duplicate</span></DashButton>
            {isChanged && !isNew && <DashButton onClick={onRevert} title="Undo changes to this question"><Undo2 size={14} /><span className="hidden sm:inline">Revert</span></DashButton>}
            {isNew
              ? <DashButton tone="danger" onClick={onDelete}><Trash2 size={14} /> Delete</DashButton>
              : <DashButton tone={q.enabled ? 'danger' : 'secondary'} disabled={q.locked} onClick={onToggleArchive}>
                {q.enabled ? <><Archive size={14} /> Hide</> : <><ArchiveRestore size={14} /> Show</>}
              </DashButton>}
          </div>
        </div>
      </div>

      <div className="space-y-7 p-4">
        {q.locked && <Note tone="info" icon={Lock}>This is a login field managed by the sign-in system. Only its section and position can change here.</Note>}
        {!q.enabled && !q.locked && <Note tone="warning" icon={Info}>Hidden questions keep every answer members already gave. Show it again any time.</Note>}

        <Group title="Wording">
          <div>
            <label htmlFor="qb-question" className={labelClass}>Question members see</label>
            <textarea id="qb-question" ref={questionRef} rows={3} dir="auto" maxLength={1000} value={q.question} disabled={q.locked}
              onChange={event => onChange({ question: event.target.value })} aria-invalid={!!questionIssue}
              aria-describedby="qb-question-help" className={cn(fieldClass, 'resize-y leading-6', questionIssue && 'border-red-400')} />
            <div id="qb-question-help" className="mt-1 flex justify-between gap-2 text-[11px]">
              <IssueText issue={questionIssue} />
              <span className="ml-auto tabular-nums text-[#adb5bd]">{q.question.length}/1000</span>
            </div>
          </div>
          <div>
            <label htmlFor="qb-label" className={labelClass}>Label on the public biodata</label>
            <input id="qb-label" dir="auto" maxLength={2000} value={q.publicLabel} onChange={event => onChange({ publicLabel: event.target.value })}
              placeholder="Age" aria-invalid={!!labelIssue} aria-describedby="qb-label-help"
              className={cn(fieldClass, labelIssue && 'border-red-400')} />
            <p id="qb-label-help" className="mt-1 text-[11px] text-[#6c757d]">
              {labelIssue ? <IssueText issue={labelIssue} /> : 'Ask “How old are you?” and show “Age” next to the answer.'}
            </p>
          </div>
        </Group>

        <Group title="Answer type">
          <div role="radiogroup" aria-label="Answer type" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {TYPES.map(type => {
              const active = q.type === type.value;
              const Icon = type.icon;
              return <button key={type.value} type="button" role="radio" aria-checked={active} disabled={q.locked}
                onClick={() => onChange({ type: type.value })}
                className={cn('flex items-start gap-2 rounded-md border px-2.5 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-50',
                  active ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-400' : 'border-[#e9ecef] hover:border-[#ced4da] hover:bg-[#f8f9fa]')}>
                <Icon size={16} className={cn('mt-0.5 shrink-0', active ? 'text-rose-600' : 'text-[#6c757d]')} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium leading-5">{type.label}</span>
                  <span className="block text-[11px] text-[#6c757d]">{type.hint}</span>
                </span>
              </button>;
            })}
          </div>
          {!q.locked && !!(q.path || q.legacyKey) && questionUsesSeparateStorage(q) && <Note tone="info" icon={Info}>
            With this answer type, new answers are stored separately. Answers members already gave stay in their original field and aren’t overwritten.
          </Note>}
          {OPTION_TYPES.has(q.type) && <OptionsEditor q={q} savedVersion={savedVersion} issue={issueFor('options')} onChange={onChange} />}
          {!OPTION_TYPES.has(q.type) && issueFor('options') && <p className="text-[12px]"><IssueText issue={issueFor('options')} /></p>}
        </Group>

        <Group title="Who answers and where">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <p className={labelClass}>Asked to</p>
              <Segmented label="Asked to" value={q.gender} disabled={q.locked} onChange={gender => onChange({ gender })} options={[
                { value: 'both', label: 'Everyone' }, { value: 'male', label: 'Men only' }, { value: 'female', label: 'Women only' },
              ]} />
            </div>
            <div className="min-w-0">
              <label htmlFor="qb-section" className={labelClass}>Form section</label>
              <select id="qb-section" value={q.section} onChange={event => onSectionChange(Number(event.target.value))} className={fieldClass}>
                {sections.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}
              </select>
            </div>
          </div>
        </Group>

        <Group title="Visibility">
          <div className="grid gap-2 lg:grid-cols-3">
            <Toggle id="qb-enabled" label="Show in form" description="Members are asked this question" checked={q.enabled}
              disabled={q.locked} onChange={enabled => onChange({ enabled })} />
            <Toggle id="qb-required" label="Required" description="Members must answer to finish" checked={q.required}
              disabled={q.locked} onChange={required => onChange({ required })} />
            <Toggle id="qb-public" label="Show on public biodata" description={secret ? 'Private login field' : 'Visitors see the answer'}
              checked={q.showPublic} disabled={secret} onChange={showPublic => onChange({ showPublic })} />
          </div>
          <p className="text-[11px] leading-4 text-[#6c757d]">Paid identity unlock and contact privacy rules still apply, whatever you choose here.</p>
        </Group>
      </div>
    </section>
    <PreviewPanel q={q} />
  </div>;
}
