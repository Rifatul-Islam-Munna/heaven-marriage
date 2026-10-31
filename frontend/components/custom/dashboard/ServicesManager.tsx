'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Check, ClipboardList, Copy, CreditCard, Crown, ExternalLink, History, Loader2, NotebookPen, RefreshCw, Search, Send,
  Settings2, SlidersHorizontal, TriangleAlert, User, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryWrapper } from '@/api-hooks/react-query-wrapper';
import { GetRequestNormal, PatchRequestAxios, PostRequestAxios } from '@/api-hooks/api-hooks';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { formatPremiumFee, resolvePremiumSettings, type PremiumSettings } from '@/lib/premium-settings';
import {
  DashboardHeader, DashboardPage, DashButton, KpiCard, KpiRow, Panel, PlainHeader, Segmented, SortHeader,
  StatusPill, Toggle, fieldClass, formatWhen, labelClass, type SortState,
} from './dashboard-kit';

type Case = {
  id: string; userId: string; targetId?: string; kind: string; status: string;
  message: string; transactionReference?: string; adminNotes?: string; fee?: number;
};
type Payment = { id: string; status: string; userId: string; quantity: number; amount: number; transactionId?: string };
type Audit = { _id: string; actor: string; action: string; target: string; reason: string; createdAt: string };
type Settings = Record<string, unknown>;
type Tone = 'positive' | 'warning' | 'neutral' | 'negative' | 'info';
type TabKey = 'requests' | 'payments' | 'members' | 'matching' | 'premium' | 'settings' | 'audit';
type Confirm = { title: string; description: string; action: string; danger?: boolean; run: () => Promise<void> };
type PolicyKey = 'terms' | 'privacy' | 'refund';
type SiteSettings = {
  messengerUrl: string; discoveryEnabled: boolean; terms: string; privacy: string; refund: string;
  termsPublished: boolean; privacyPublished: boolean; refundPublished: boolean;
};

const TAB_KEYS: TabKey[] = ['requests', 'payments', 'members', 'matching', 'premium', 'settings', 'audit'];
const OPEN = new Set(['pending', 'contacted', 'payment_pending', 'paid', 'active']);
const TRANSITIONS: Record<string, string[]> = {
  pending: ['contacted', 'rejected'],
  contacted: ['payment_pending', 'approved', 'rejected'],
  payment_pending: ['paid', 'rejected'],
  paid: ['active', 'refunded'],
  active: ['completed', 'refunded', 'rejected'],
};
const STATUS_TONE: Record<string, Tone> = {
  pending: 'warning', contacted: 'info', payment_pending: 'warning', paid: 'info', approved: 'positive',
  active: 'positive', completed: 'positive', refunded: 'neutral', rejected: 'negative', pending_manual: 'warning',
};
const DEFAULT_WEIGHTS: Record<string, number> = { district: 1, maritalStatus: 1, profession: 1, education: 1, age: 1 };
const POLICY_LABEL: Record<PolicyKey, string> = { terms: 'Terms of use', privacy: 'Privacy policy', refund: 'Refund policy' };
const small = 'px-2.5 py-1 text-[12px]';

function humanize(value: string) {
  const words = String(value || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[._-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
const taka = (amount: number) => '৳' + Number(amount || 0).toLocaleString('en-US');
const shortId = (id: string) => id.length > 14 ? id.slice(0, 6) + '…' + id.slice(-4) : id;
const isMongoId = (id: string) => /^[a-f0-9]{24}$/i.test(id);
const textOf = (item: unknown, key: string) => {
  const value = (item as Record<string, unknown> | null | undefined)?.[key];
  return typeof value === 'string' ? value : '';
};
function pickSite(raw?: Settings): SiteSettings {
  const text = (key: string) => { const value = raw?.[key]; return typeof value === 'string' ? value : ''; };
  return {
    messengerUrl: text('messengerUrl'), discoveryEnabled: raw?.discoveryEnabled === true,
    terms: text('terms'), privacy: text('privacy'), refund: text('refund'),
    termsPublished: raw?.termsPublished === true, privacyPublished: raw?.privacyPublished === true,
    refundPublished: raw?.refundPublished === true,
  };
}
function formatScalar(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString();
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

function StatusBadge({ status }: { status: string }) {
  return <StatusPill tone={STATUS_TONE[status] || 'neutral'}>{humanize(status)}</StatusPill>;
}
function IdChip({ value, label, profile }: { value: string; label: string; profile?: boolean }) {
  if (!value) return <span className="text-[#adb5bd]">—</span>;
  const copy = () => void navigator.clipboard.writeText(value).then(() => toast.success(label + ' copied'), () => toast.error('Couldn’t copy'));
  return <span className="inline-flex max-w-full items-center gap-0.5">
    {profile && isMongoId(value)
      ? <a href={'/dashboard/edit-profile/' + value} title={`Open ${label.toLowerCase()} ${value}`} className="truncate font-mono text-[12px] text-rose-700 hover:underline">{shortId(value)}</a>
      : <span title={value} className="truncate font-mono text-[12px] text-[#212529]">{shortId(value)}</span>}
    <button type="button" aria-label={'Copy ' + label.toLowerCase()} onClick={copy}
      className="shrink-0 rounded p-0.5 text-[#adb5bd] hover:bg-[#f1f3f5] hover:text-[#495057]"><Copy size={12} /></button>
  </span>;
}
function Loading({ label }: { label: string }) {
  return <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[#6c757d]"><Loader2 size={16} className="animate-spin" /> {label}</div>;
}
function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-12 text-center text-[13px] text-[#6c757d]">{children}</div>;
}
function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="relative">
    <span className="sr-only">{placeholder}</span>
    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#adb5bd]" />
    <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className={cn(fieldClass, 'w-52 py-1.5 pl-8 text-[13px]')} />
  </label>;
}

/** Shows any JSON the connections API returns as readable figures and tables. */
function DataView({ data }: { data: unknown }) {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return <p className="text-[13px]">{formatScalar(data)}</p>;
  if (Array.isArray(data)) return <DataTable rows={data} />;
  const entries = Object.entries(data as Record<string, unknown>).filter(([key]) => key !== '__v');
  const scalars = entries.filter(([, value]) => value === null || typeof value !== 'object');
  const groups = entries.filter(([, value]) => value !== null && typeof value === 'object');
  return <div className="space-y-4">
    {scalars.length > 0 && <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      {scalars.map(([key, value]) => <div key={key} className="min-w-0 rounded-md bg-[#f8f9fa] px-3 py-2">
        <dt className="text-[11px] text-[#6c757d]">{humanize(key)}</dt>
        <dd className="mt-0.5 break-words text-[14px] font-semibold tabular-nums">{formatScalar(value)}</dd>
      </div>)}
    </dl>}
    {groups.map(([key, value]) => <div key={key}>
      <h4 className="mb-1.5 text-[13px] font-semibold">{humanize(key)}{Array.isArray(value) && <span className="font-normal text-[#6c757d]"> · {value.length}</span>}</h4>
      {Array.isArray(value) ? <DataTable rows={value} /> : <DataView data={value} />}
    </div>)}
  </div>;
}
function DataTable({ rows }: { rows: unknown[] }) {
  if (!rows.length) return <p className="rounded-md bg-[#f8f9fa] px-3 py-3 text-[12px] text-[#6c757d]">Nothing here yet.</p>;
  if (rows.some(row => row === null || typeof row !== 'object' || Array.isArray(row)))
    return <p className="text-[13px]">{rows.map(formatScalar).join(', ')}</p>;
  const records = rows as Record<string, unknown>[];
  const columns = [...new Set(records.slice(0, 20).flatMap(row => Object.keys(row)))].filter(key => key !== '__v').slice(0, 7);
  const cell = (value: unknown) => value !== null && typeof value === 'object' ? JSON.stringify(value) : formatScalar(value);
  return <div className="overflow-x-auto rounded-md border border-[#e9ecef]">
    <table className="w-full text-[12px]">
      <thead className="bg-[#f8f9fa]"><tr>{columns.map(column =>
        <th key={column} scope="col" className="whitespace-nowrap px-2.5 py-2 text-left font-semibold text-[#6c757d]">{humanize(column)}</th>)}</tr></thead>
      <tbody>{records.slice(0, 100).map((row, index) => <tr key={index} className="border-t border-[#f0f0f0]">
        {columns.map(column => <td key={column} title={cell(row[column])} className="max-w-[240px] truncate px-2.5 py-1.5">{cell(row[column])}</td>)}
      </tr>)}</tbody>
    </table>
    {records.length > 100 && <p className="px-2.5 py-1.5 text-[11px] text-[#6c757d]">Showing the first 100 of {records.length}.</p>}
  </div>;
}

function CaseStatusDialog({ target, onClose, onDone }: {
  target: { item: Case; status: string } | null; onClose: () => void; onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState(target?.item.transactionReference || '');
  const [notes, setNotes] = useState(target?.item.adminNotes || '');
  const [busy, setBusy] = useState(false);
  const needsReference = !!target && ['paid', 'refunded'].includes(target.status);
  const canSubmit = !busy && !!reason.trim() && (!needsReference || !!reference.trim());
  const danger = target?.status === 'rejected' || target?.status === 'refunded';
  const submit = async () => {
    if (!target || !canSubmit) return;
    setBusy(true);
    const [data, error] = await PatchRequestAxios('/platform/admin/cases/' + target.item.id, {
      status: target.status, reason: reason.trim(),
      transactionReference: needsReference ? reference.trim() : undefined,
      adminNotes: notes.trim() || target.item.adminNotes,
    });
    setBusy(false);
    if (data) { toast.success(`Moved to “${humanize(target.status)}”`); onDone(); onClose(); }
    else toast.error(error?.message || 'Unable to update this request');
  };
  return <Dialog open={!!target} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Move to “{target ? humanize(target.status) : ''}”</DialogTitle>
        <DialogDescription>{target ? humanize(target.item.kind) : ''} request. The reason is saved in the audit history.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
        <div>
          <label htmlFor="case-reason" className={labelClass}>Reason <span className="text-red-600">*</span></label>
          <textarea id="case-reason" rows={3} autoFocus dir="auto" value={reason} onChange={event => setReason(event.target.value)}
            placeholder="What happened, and why this is the next step" className={cn(fieldClass, 'resize-y')} />
        </div>
        {needsReference && <div>
          <label htmlFor="case-reference" className={labelClass}>Verified payment reference <span className="text-red-600">*</span></label>
          <input id="case-reference" value={reference} onChange={event => setReference(event.target.value)} className={cn(fieldClass, 'font-mono text-[13px]')} />
          <p className="mt-1 text-[11px] text-[#6c757d]">Only enter a reference you checked in the payment account.</p>
        </div>}
        <div>
          <label htmlFor="case-notes" className={labelClass}>Follow-up notes</label>
          <textarea id="case-notes" rows={2} dir="auto" value={notes} onChange={event => setNotes(event.target.value)} className={cn(fieldClass, 'resize-y')} />
        </div>
        <div className="flex justify-end gap-2">
          <DashButton onClick={onClose}>Cancel</DashButton>
          <DashButton type="submit" tone={danger ? 'danger' : 'primary'} disabled={!canSubmit}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirm
          </DashButton>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}

function CaseNotesDialog({ target, onClose, onDone }: { target: Case | null; onClose: () => void; onDone: () => void }) {
  const [notes, setNotes] = useState(target?.adminNotes || '');
  const [assignedTo, setAssignedTo] = useState(textOf(target, 'assignedTo'));
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!target) return;
    setBusy(true);
    const [data, error] = await PatchRequestAxios('/platform/admin/cases/' + target.id, { adminNotes: notes, assignedTo });
    setBusy(false);
    if (data) { toast.success('Notes saved'); onDone(); onClose(); }
    else toast.error(error?.message || 'Unable to save notes');
  };
  return <Dialog open={!!target} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Notes and assignment</DialogTitle>
        <DialogDescription>Private to the team. Members never see these notes.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
        <div>
          <label htmlFor="case-note-text" className={labelClass}>Follow-up notes</label>
          <textarea id="case-note-text" rows={4} autoFocus dir="auto" value={notes} onChange={event => setNotes(event.target.value)} className={cn(fieldClass, 'resize-y')} />
        </div>
        <div>
          <label htmlFor="case-assignee" className={labelClass}>Assigned team member</label>
          <input id="case-assignee" value={assignedTo} onChange={event => setAssignedTo(event.target.value)} placeholder="Name or email" className={fieldClass} />
        </div>
        <div className="flex justify-end gap-2">
          <DashButton onClick={onClose}>Cancel</DashButton>
          <DashButton type="submit" tone="primary" disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save notes</DashButton>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}

function VerifyPaymentDialog({ target, onClose, onDone }: { target: Payment | null; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const canSubmit = !busy && checked && !!reason.trim();
  const submit = async () => {
    if (!target || !canSubmit) return;
    setBusy(true);
    const [data, error] = await PostRequestAxios('/platform/admin/verify-manual-payment/' + target.id, { confirm: true, reason: reason.trim() });
    setBusy(false);
    if (data) { toast.success('Payment verified. Connections were added.'); onDone(); onClose(); }
    else toast.error(error?.message || 'Unable to verify this payment');
  };
  return <Dialog open={!!target} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Verify manual payment</DialogTitle>
        <DialogDescription>Check the payment account first. Verifying adds the connections to the member’s balance.</DialogDescription>
      </DialogHeader>
      {target && <dl className="grid grid-cols-2 gap-2 rounded-md bg-[#f8f9fa] p-3 text-[13px]">
        <div><dt className="text-[11px] text-[#6c757d]">Amount</dt><dd className="font-semibold">{taka(target.amount)}</dd></div>
        <div><dt className="text-[11px] text-[#6c757d]">Connections</dt><dd className="font-semibold">{target.quantity}</dd></div>
        <div className="col-span-2"><dt className="text-[11px] text-[#6c757d]">Transaction ID given by the member</dt>
          <dd className="break-all font-mono text-[12px]">{target.transactionId || '—'}</dd></div>
      </dl>}
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
        <div>
          <label htmlFor="verify-reason" className={labelClass}>Evidence <span className="text-red-600">*</span></label>
          <textarea id="verify-reason" rows={3} value={reason} onChange={event => setReason(event.target.value)}
            placeholder="Where you confirmed it, e.g. bKash statement, 2 PM" className={cn(fieldClass, 'resize-y')} />
        </div>
        <label className="flex items-start gap-2.5 text-[13px]">
          <input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} className="mt-0.5 size-4 accent-rose-600" />
          I checked the amount, currency and transaction reference in the payment account.
        </label>
        <div className="flex justify-end gap-2">
          <DashButton onClick={onClose}>Cancel</DashButton>
          <DashButton type="submit" tone="primary" disabled={!canSubmit}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Verify payment</DashButton>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}

function RequestsTab({ cases, loading, onChanged, onLookup }: {
  cases?: Case[]; loading: boolean; onChanged: () => void; onLookup: (userId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'open' | 'closed' | 'all'>('open');
  const [kind, setKind] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ item: Case; status: string } | null>(null);
  const [notesTarget, setNotesTarget] = useState<Case | null>(null);
  const list = useMemo(() => cases || [], [cases]);
  const kinds = useMemo(() => [...new Set(list.map(item => item.kind))].sort(), [list]);
  const openCount = list.filter(item => OPEN.has(item.status)).length;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter(item => (scope === 'all' || (scope === 'open') === OPEN.has(item.status)) &&
      (kind === 'all' || item.kind === kind) &&
      (!q || [item.userId, item.targetId || '', item.message, item.transactionReference || '', item.adminNotes || '']
        .some(value => value.toLowerCase().includes(q))));
  }, [list, query, scope, kind]);

  return <Panel title="Member requests" description="Upgrade applications, deletion requests, reports and support messages." bodyClassName="p-0"
    actions={<>
      <SearchBox value={query} onChange={setQuery} placeholder="Search requests" />
      <select aria-label="Request type" value={kind} onChange={event => setKind(event.target.value)} className={cn(fieldClass, 'w-auto py-1.5 text-[13px]')}>
        <option value="all">All types</option>
        {kinds.map(item => <option key={item} value={item}>{humanize(item)}</option>)}
      </select>
      <Segmented size="sm" label="Request status" value={scope} onChange={setScope} options={[
        { value: 'open', label: `Open (${openCount})` }, { value: 'closed', label: `Closed (${list.length - openCount})` }, { value: 'all', label: 'All' },
      ]} />
    </>}>
    {loading && !cases ? <Loading label="Loading requests…" /> : !visible.length ? <Empty>
      {list.length ? 'No requests match these filters.' : 'No requests yet.'}
      {scope === 'open' && list.length > 0 && !query && kind === 'all' && <span className="mt-1 block text-emerald-700">Every request has been handled.</span>}
    </Empty> : <ul className="divide-y divide-[#f0f0f0]">
      {visible.map(item => {
        const next = TRANSITIONS[item.status] || [];
        const long = item.message.length > 240;
        const open = expanded === item.id;
        return <li key={item.id} className="px-4 py-3">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill tone="neutral">{humanize(item.kind)}</StatusPill>
                <StatusBadge status={item.status} />
                {item.kind === 'premium' && typeof item.fee === 'number' &&
                  <span className="text-[11px] text-[#6c757d]">Fee {formatPremiumFee(item.fee)}</span>}
                {item.transactionReference && <span className="text-[11px] text-[#6c757d]">Ref <span className="font-mono">{item.transactionReference}</span></span>}
              </div>
              <p dir="auto" className={cn('mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-5', !open && 'line-clamp-3')}>{item.message || <span className="text-[#adb5bd]">No message</span>}</p>
              {long && <button type="button" onClick={() => setExpanded(open ? null : item.id)} className="mt-0.5 text-[12px] font-medium text-rose-700 hover:underline">
                {open ? 'Show less' : 'Show full message'}
              </button>}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#6c757d]">
                <span className="inline-flex items-center gap-1">Member <IdChip value={item.userId} label="Member ID" profile /></span>
                {item.targetId && <span className="inline-flex items-center gap-1">Profile <IdChip value={item.targetId} label="Profile ID" profile /></span>}
                {textOf(item, 'assignedTo') && <span>Assigned to {textOf(item, 'assignedTo')}</span>}
              </div>
              {item.adminNotes && <p dir="auto" className="mt-2 whitespace-pre-wrap rounded-md bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-900">{item.adminNotes}</p>}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {next.length > 0 && <span className="text-[11px] text-[#6c757d]">Move to</span>}
              {next.map(status => <DashButton key={status} className={small} tone={status === 'rejected' || status === 'refunded' ? 'danger' : 'secondary'}
                onClick={() => setStatusTarget({ item, status })}>{humanize(status)}</DashButton>)}
              <DashButton className={small} onClick={() => setNotesTarget(item)}><NotebookPen size={12} /> Notes</DashButton>
              <DashButton className={small} title="Connections balance and history" onClick={() => onLookup(item.userId)}><Wallet size={12} /> Balance</DashButton>
            </div>
          </div>
        </li>;
      })}
    </ul>}
    <CaseStatusDialog key={statusTarget ? statusTarget.item.id + statusTarget.status : 'none'} target={statusTarget} onClose={() => setStatusTarget(null)} onDone={onChanged} />
    <CaseNotesDialog key={notesTarget?.id || 'none'} target={notesTarget} onClose={() => setNotesTarget(null)} onDone={onChanged} />
  </Panel>;
}

function PaymentsTab({ payments, loading, onChanged, askConfirm }: {
  payments?: Payment[]; loading: boolean; onChanged: () => void; askConfirm: (confirm: Confirm) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [verifyTarget, setVerifyTarget] = useState<Payment | null>(null);
  const [orderId, setOrderId] = useState('');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [returned, setReturned] = useState(false);
  const [busy, setBusy] = useState(false);
  const reversalRef = useRef<HTMLDivElement>(null);
  const list = useMemo(() => payments || [], [payments]);
  const statuses = useMemo(() => [...new Set(list.map(item => item.status))].sort(), [list]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter(item => (status === 'all' || item.status === status) &&
      (!q || [item.id, item.userId, item.transactionId || ''].some(value => value.toLowerCase().includes(q))))
      .sort((a, b) => Number(b.status === 'pending_manual') - Number(a.status === 'pending_manual'));
  }, [list, query, status]);
  const total = visible.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const canReverse = !busy && !!orderId.trim() && !!reference.trim() && !!reason.trim() && returned;
  const startReversal = (item: Payment) => {
    setOrderId(item.id);
    window.requestAnimationFrame(() => reversalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };
  const recordReversal = () => askConfirm({
    title: 'Record this reversal?', danger: true, action: 'Record reversal',
    description: 'Unused connections from this order and any profile unlocks it paid for are removed. This doesn’t send money; it records a refund you already made.',
    run: async () => {
      setBusy(true);
      try {
        const [data, error] = await PostRequestAxios('/platform/admin/refund/' + orderId.trim(), {
          reason: reason.trim(), transactionReference: reference.trim(), confirmMoneyReversed: true,
        });
        if (data) {
          toast.success('Reversal recorded');
          setOrderId(''); setReference(''); setReason(''); setReturned(false);
          onChanged();
        } else toast.error(error?.message || 'Couldn’t record the reversal');
      } finally { setBusy(false); }
    },
  });

  return <div className="space-y-4">
    <Panel title="Connection payments" description={`${visible.length} payments · ${taka(total)} total`} bodyClassName="p-0"
      actions={<>
        <SearchBox value={query} onChange={setQuery} placeholder="Order, member or transaction" />
        <select aria-label="Payment status" value={status} onChange={event => setStatus(event.target.value)} className={cn(fieldClass, 'w-auto py-1.5 text-[13px]')}>
          <option value="all">All statuses</option>
          {statuses.map(item => <option key={item} value={item}>{humanize(item)}</option>)}
        </select>
      </>}>
      {loading && !payments ? <Loading label="Loading payments…" /> : !visible.length ? <Empty>{list.length ? 'No payments match these filters.' : 'No payments yet.'}</Empty> :
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full min-w-[820px] border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-white"><tr>
              <PlainHeader label="Order" /><PlainHeader label="Member" /><PlainHeader label="Connections" className="text-right" />
              <PlainHeader label="Amount" className="text-right" /><PlainHeader label="Transaction" /><PlainHeader label="Status" />
              <PlainHeader label="Actions" className="text-right" />
            </tr></thead>
            <tbody>{visible.map(item => <tr key={item.id} className={cn('border-b border-[#f0f0f0] last:border-0 hover:bg-[#f8f9fa]', item.status === 'pending_manual' && 'bg-amber-50/40')}>
              <td className="px-3 py-2.5"><IdChip value={item.id} label="Order ID" /></td>
              <td className="px-3 py-2.5"><IdChip value={item.userId} label="Member ID" profile /></td>
              <td className="px-3 py-2.5 text-right tabular-nums">{item.quantity}</td>
              <td className="px-3 py-2.5 text-right font-medium tabular-nums">{taka(item.amount)}</td>
              <td className="max-w-[180px] px-3 py-2.5">{item.transactionId ? <span title={item.transactionId} className="block truncate font-mono text-[12px]">{item.transactionId}</span> : <span className="text-[#adb5bd]">—</span>}</td>
              <td className="px-3 py-2.5"><StatusBadge status={item.status} /></td>
              <td className="px-3 py-2.5"><div className="flex justify-end gap-1.5">
                {item.status === 'pending_manual'
                  ? <DashButton tone="primary" className={small} onClick={() => setVerifyTarget(item)}><Check size={12} /> Verify</DashButton>
                  : item.status !== 'refunded' && <DashButton className={small} onClick={() => startReversal(item)}>Record reversal</DashButton>}
              </div></td>
            </tr>)}</tbody>
          </table>
        </div>}
    </Panel>

    <div ref={reversalRef}>
      <Panel title="Record a money reversal" description="Use this after you’ve returned the money yourself. It removes unused connections and unlocks from that order.">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="reversal-order" className={labelClass}>Order ID</label>
            <input id="reversal-order" value={orderId} onChange={event => setOrderId(event.target.value)} className={cn(fieldClass, 'font-mono text-[13px]')} />
          </div>
          <div>
            <label htmlFor="reversal-reference" className={labelClass}>Reversal transaction reference</label>
            <input id="reversal-reference" value={reference} onChange={event => setReference(event.target.value)} className={cn(fieldClass, 'font-mono text-[13px]')} />
          </div>
          <div>
            <label htmlFor="reversal-reason" className={labelClass}>Reason</label>
            <input id="reversal-reason" dir="auto" value={reason} onChange={event => setReason(event.target.value)} placeholder="Why the money was returned" className={fieldClass} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-start gap-2.5 text-[13px]">
            <input type="checkbox" checked={returned} onChange={event => setReturned(event.target.checked)} className="mt-0.5 size-4 accent-rose-600" />
            The money has already been returned to the member.
          </label>
          <DashButton tone="danger" disabled={!canReverse} onClick={recordReversal}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <TriangleAlert size={14} />} Record reversal
          </DashButton>
        </div>
      </Panel>
    </div>
    <VerifyPaymentDialog key={verifyTarget?.id || 'none'} target={verifyTarget} onClose={() => setVerifyTarget(null)} onDone={onChanged} />
  </div>;
}

function MembersTab({ memberId, setMemberId, lookup, lookupState, lookupError, onLookup, askConfirm, onChanged }: {
  memberId: string; setMemberId: (value: string) => void; lookup: unknown; lookupState: 'idle' | 'loading' | 'error' | 'done';
  lookupError: string; onLookup: (id: string) => void; askConfirm: (confirm: Confirm) => void; onChanged: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [raw, setRaw] = useState(false);
  const id = memberId.trim();
  const amountValue = Number(amount);
  const amountOk = Number.isInteger(amountValue) && amountValue >= 1 && amountValue <= 10000;
  const grant = () => askConfirm({
    title: `Grant ${amountValue} connection${amountValue === 1 ? '' : 's'}?`, action: 'Grant connections',
    description: `They’re added to member ${id}’s balance and recorded in the audit history.`,
    run: async () => {
      setBusy(true);
      try {
        const [data, error] = await PostRequestAxios('/platform/admin/adjust-connections/' + id, {
          amount: amountValue, reason: reason.trim(), requestId: crypto.randomUUID(),
        });
        if (data) { toast.success('Connections granted'); setAmount(''); setReason(''); onChanged(); onLookup(id); }
        else toast.error(error?.message || 'Couldn’t grant connections');
      } finally { setBusy(false); }
    },
  });
  const remind = () => askConfirm({
    title: 'Send this reminder?', action: 'Send reminder',
    description: `Member ${id} gets it by ${channel === 'email' ? 'email' : 'SMS'}.`,
    run: async () => {
      setBusy(true);
      try {
        const [data, error] = await PostRequestAxios('/platform/admin/remind/' + id, { message: message.trim(), channel });
        if (data) { toast.success('Reminder sent'); setMessage(''); onChanged(); }
        else toast.error(error?.message || 'Couldn’t send the reminder');
      } finally { setBusy(false); }
    },
  });
  // Find members by name, phone, email or biodata number (the same search as the Users page).
  type MemberHit = { _id: string; name?: string; email?: string; phoneNumber?: string; userId?: string; numberOfConnections?: number };
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [picked, setPicked] = useState<MemberHit | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => { if (picked && picked._id !== id) setPicked(null); }, [id, picked]);
  const searching = debounced.length >= 2 && !isMongoId(debounced);
  const hits = useQueryWrapper<{ data: MemberHit[]; totalItems: number }>(
    ['member-balance-search', debounced],
    '/user/get-all-user-for-admin?page=1&limit=8&gender=all&isPublished=all&query=' + encodeURIComponent(debounced),
    { enabled: searching, retry: false },
  );
  const results = searching ? hits.data?.data || [] : [];
  const typedId = isMongoId(search.trim()) ? search.trim() : '';
  const choose = (hit: MemberHit) => { setPicked(hit); setSearch(''); setDebounced(''); onLookup(hit._id); };
  const chooseId = (value: string) => { setPicked(null); setSearch(''); setDebounced(''); onLookup(value); };
  const contactLine = (hit: MemberHit) => [hit.phoneNumber, hit.email].filter(Boolean).join(' · ');
  const memberNote = id ? <span className="inline-flex min-w-0 items-center gap-1 text-[12px] text-[#6c757d]">
    {picked ? <span className="truncate font-medium text-[#212529]">{picked.name || 'No name'}</span> : 'Member'} <IdChip value={id} label="Member ID" profile />
  </span> : <span className="text-[12px] text-amber-700">Find a member first.</span>;

  return <div className="space-y-4">
    <Panel title="Find a member" description="Search by name, phone number, email or biodata number, then pick the member.">
      <form onSubmit={event => {
        event.preventDefault();
        if (typedId) chooseId(typedId);
        else if (results.length === 1) choose(results[0]);
      }}>
        <label htmlFor="member-search" className={labelClass}>Name, phone, email, biodata number or member ID</label>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#adb5bd]" />
          <input id="member-search" type="search" autoComplete="off" autoFocus value={search} onChange={event => setSearch(event.target.value)}
            placeholder="e.g. Rahim, 01712345678 or name@mail.com" aria-describedby="member-search-help"
            className={cn(fieldClass, 'py-2.5 pl-9 pr-9 text-[14px]')} />
          {searching && hits.isFetching && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#adb5bd]" />}
        </div>
        <p id="member-search-help" className="mt-1 text-[11px] text-[#6c757d]">Type at least 2 characters. For phone numbers, the last few digits are enough.</p>
      </form>

      {typedId && <button type="button" onClick={() => chooseId(typedId)}
        className="mt-3 flex w-full items-center gap-2 rounded-md border border-dashed border-[#ced4da] px-3 py-2.5 text-left text-[13px] hover:bg-[#f8f9fa]">
        <Search size={14} className="shrink-0 text-[#6c757d]" /> Look up member ID <span className="truncate font-mono">{typedId}</span>
      </button>}

      {searching && <div className="mt-3 overflow-hidden rounded-md border border-[#e9ecef]">
        {hits.isError ? <p className="px-3 py-3 text-[13px] text-red-700">Search isn’t available for your account. Ask an admin for access to the Users page, or paste the member ID instead.</p>
          : hits.isLoading ? <p className="flex items-center gap-2 px-3 py-3 text-[13px] text-[#6c757d]"><Loader2 size={14} className="animate-spin" /> Searching…</p>
            : !results.length ? <p className="px-3 py-3 text-[13px] text-[#6c757d]">No member matches “{debounced}”.</p>
              : <ul aria-label="Matching members" className="divide-y divide-[#f0f0f0]">
                {results.map(hit => <li key={hit._id}>
                  <button type="button" onClick={() => choose(hit)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-rose-50 focus-visible:bg-rose-50 focus-visible:outline-none">
                    <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f1f3f5] text-[12px] font-semibold text-[#495057]">
                      {(hit.name || '?').trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">
                        {hit.name || 'No name'}{hit.userId && <span className="ml-1.5 font-mono text-[11px] font-normal text-[#6c757d]">#{hit.userId}</span>}
                      </span>
                      <span className="block truncate text-[12px] text-[#6c757d]">{contactLine(hit) || 'No phone or email'}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[13px] font-semibold tabular-nums">{hit.numberOfConnections ?? 0}</span>
                      <span className="block text-[11px] text-[#6c757d]">connections</span>
                    </span>
                  </button>
                </li>)}
                {(hits.data?.totalItems ?? 0) > results.length && <li className="px-3 py-2 text-[11px] text-[#6c757d]">
                  Showing {results.length} of {hits.data?.totalItems}. Type more to narrow it down.
                </li>}
              </ul>}
      </div>}

      {id && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-[#f8f9fa] px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[11px] text-[#6c757d]">Selected member</p>
          {picked ? <>
            <p className="truncate text-[14px] font-semibold">{picked.name || 'No name'}
              {picked.userId && <span className="ml-1.5 font-mono text-[12px] font-normal text-[#6c757d]">#{picked.userId}</span>}</p>
            {contactLine(picked) && <p className="truncate text-[12px] text-[#6c757d]">{contactLine(picked)}</p>}
          </> : <IdChip value={id} label="Member ID" profile />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isMongoId(id) && <a href={'/dashboard/edit-profile/' + id} className="inline-flex items-center gap-1.5 rounded-md border border-[#dee2e6] bg-white px-3 py-1.5 text-[13px] font-medium hover:bg-[#f1f3f5]">
            <ExternalLink size={14} /> Open profile
          </a>}
          <DashButton className="py-1.5" disabled={lookupState === 'loading'} onClick={() => onLookup(id)}>
            {lookupState === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
          </DashButton>
          <DashButton className="py-1.5" onClick={() => { setMemberId(''); setPicked(null); }}>Clear</DashButton>
        </div>
      </div>}
      {id && lookupState === 'error' && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700">{lookupError}</p>}
      {id && lookupState === 'done' && <div className="mt-4 space-y-3">
        <DataView data={lookup} />
        <button type="button" onClick={() => setRaw(value => !value)} className="text-[12px] font-medium text-[#6c757d] hover:text-[#212529] hover:underline">
          {raw ? 'Hide raw data' : 'Show raw data'}
        </button>
        {raw && <pre className="max-h-80 overflow-auto rounded-md bg-[#f8f9fa] p-3 text-[11px]">{JSON.stringify(lookup, null, 2)}</pre>}
      </div>}
    </Panel>

    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel title="Grant connections" actions={memberNote}>
        <div className="space-y-4">
          <div>
            <label htmlFor="grant-amount" className={labelClass}>Connections to add</label>
            <input id="grant-amount" type="number" min={1} max={10000} step={1} value={amount} onChange={event => setAmount(event.target.value)}
              placeholder="5" className={cn(fieldClass, 'w-40')} aria-invalid={!!amount && !amountOk} />
            {!!amount && !amountOk && <p className="mt-1 text-[11px] text-red-600">Use a whole number from 1 to 10,000.</p>}
          </div>
          <div>
            <label htmlFor="grant-reason" className={labelClass}>Reason</label>
            <input id="grant-reason" dir="auto" value={reason} onChange={event => setReason(event.target.value)} placeholder="e.g. Goodwill for a delayed reply" className={fieldClass} />
          </div>
          <DashButton tone="primary" disabled={busy || !id || !amountOk || !reason.trim()} onClick={grant}><Wallet size={14} /> Grant connections</DashButton>
        </div>
      </Panel>
      <Panel title="Send a reminder" actions={memberNote}>
        <div className="space-y-4">
          <div>
            <p className={labelClass}>Send by</p>
            <Segmented label="Send by" value={channel} onChange={setChannel} options={[{ value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }]} />
          </div>
          <div>
            <label htmlFor="remind-message" className={labelClass}>Message (optional)</label>
            <textarea id="remind-message" rows={3} dir="auto" value={message} onChange={event => setMessage(event.target.value)}
              placeholder="Leave empty to send the standard reminder" className={cn(fieldClass, 'resize-y')} />
            {channel === 'sms' && message.length > 0 && <p className="mt-1 text-[11px] text-[#6c757d]">{message.length} characters · long SMS may be split.</p>}
          </div>
          <DashButton tone="primary" disabled={busy || !id} onClick={remind}><Send size={14} /> Send reminder</DashButton>
        </div>
      </Panel>
    </div>
  </div>;
}

function MatchingTab({ settings, onSaved }: { settings?: Settings; onSaved: () => void }) {
  const saved = useMemo(() => {
    const raw = settings as { matchWeights?: Record<string, number>; minMatchScore?: number } | undefined;
    return { weights: { ...DEFAULT_WEIGHTS, ...(raw?.matchWeights || {}) }, minScore: Number(raw?.minMatchScore ?? 1) };
  }, [settings]);
  const [weights, setWeights] = useState(saved.weights);
  const [minScore, setMinScore] = useState(saved.minScore);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setWeights(saved.weights); setMinScore(saved.minScore); }, [saved]);
  const dirty = JSON.stringify(weights) !== JSON.stringify(saved.weights) || minScore !== saved.minScore;
  const total = Object.values(weights).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const scaleMax = Math.max(...Object.values(weights).map(Number)) > 10 ? 100 : 10;
  const save = async () => {
    setBusy(true);
    const [data, error] = await PatchRequestAxios('/platform/admin/settings', { matchWeights: weights, minMatchScore: minScore });
    setBusy(false);
    if (data) { toast.success('Matching rules saved'); onSaved(); }
    else toast.error(error?.message || 'Unable to save matching rules');
  };
  return <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
    <Panel title="Minimum match score" description="Profiles below this score aren’t suggested to members.">
      <div className="flex items-center gap-4">
        <input type="range" min={0} max={100} value={minScore} onChange={event => setMinScore(Number(event.target.value))}
          aria-label="Minimum match score" className="flex-1 accent-rose-600" />
        <div className="flex items-center gap-1">
          <input type="number" min={0} max={100} value={minScore} aria-label="Minimum match score, percent"
            onChange={event => setMinScore(Math.max(0, Math.min(100, Number(event.target.value) || 0)))} className={cn(fieldClass, 'w-20 text-right')} />
          <span className="text-[13px] text-[#6c757d]">%</span>
        </div>
      </div>
      <p className="mt-3 text-[12px] text-[#6c757d]">{minScore <= 10 ? 'Low: almost every profile is suggested.' : minScore >= 70 ? 'High: only very close matches are suggested.' : 'Balanced.'}</p>
    </Panel>
    <Panel title="What counts most" description="Higher weight means that detail matters more in the match score."
      actions={<DashButton tone="primary" disabled={!dirty || busy} onClick={() => void save()}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save rules
      </DashButton>}>
      <ul className="space-y-3.5">
        {Object.keys(weights).map(key => {
          const value = Number(weights[key]) || 0;
          const share = total ? Math.round((value / total) * 100) : 0;
          return <li key={key} className="grid grid-cols-[110px_minmax(0,1fr)_64px_44px] items-center gap-3">
            <label htmlFor={'weight-' + key} className="text-[13px] font-medium">{humanize(key)}</label>
            <input type="range" min={0} max={scaleMax} value={value} aria-label={humanize(key) + ' weight'}
              onChange={event => setWeights(current => ({ ...current, [key]: Number(event.target.value) }))} className="accent-rose-600" />
            <input id={'weight-' + key} type="number" min={0} max={100} value={value}
              onChange={event => setWeights(current => ({ ...current, [key]: Math.max(0, Math.min(100, Number(event.target.value) || 0)) }))}
              className={cn(fieldClass, 'px-2 text-right')} />
            <span className="text-right text-[12px] tabular-nums text-[#6c757d]" title="Share of the total score">{share}%</span>
          </li>;
        })}
      </ul>
      {dirty && <p className="mt-4 text-[12px] text-amber-700">Unsaved changes.</p>}
    </Panel>
  </div>;
}

function PremiumTab({ settings, onSaved }: { settings?: Settings; onSaved: () => void }) {
  const saved = useMemo(() => resolvePremiumSettings(settings?.premium), [settings]);
  const [premium, setPremium] = useState<PremiumSettings>(saved);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setPremium(saved); }, [saved]);
  const set = <K extends keyof PremiumSettings>(key: K, value: PremiumSettings[K]) =>
    setPremium(current => ({ ...current, [key]: value }));
  const dirty = JSON.stringify(premium) !== JSON.stringify(saved);
  const phoneBad = !!premium.contactPhone && !/^\+?[0-9]{8,15}$/.test(premium.contactPhone.trim());
  const invalid = !premium.title.trim() || !premium.summary.trim() || !premium.intro.trim() ||
    !premium.footer.trim() || !premium.requestLabel.trim() || !premium.detailsLabel.trim() ||
    !Number.isSafeInteger(premium.fee) || premium.fee < 1 || premium.fee > 1000000 ||
    !premium.steps.some(step => step.trim()) || premium.steps.filter(step => step.trim()).length > 10 ||
    premium.steps.some(step => step.trim().length > 500) || phoneBad;
  const save = async () => {
    if (invalid) return;
    setBusy(true);
    const payload = { ...premium, steps: premium.steps.map(step => step.trim()).filter(Boolean) };
    const [data, error] = await PatchRequestAxios('/platform/admin/settings', { premium: payload });
    setBusy(false);
    if (data) { toast.success('Premium service saved'); onSaved(); }
    else toast.error(error?.message || 'Unable to save premium service');
  };
  return <div className="space-y-4">
    <Panel title="Premium service" description="Controls the member profile card, public /premium page, and fee for new applications."
      actions={<a href="/premium" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-rose-700 hover:underline"><ExternalLink size={13} /> View page</a>}>
      <div className="space-y-4">
        <Toggle id="premium-enabled" label="Accept premium applications" description="Off hides the promotion and blocks new applications. Existing requests remain visible to members."
          checked={premium.enabled} onChange={value => set('enabled', value)} />
        <div className="grid gap-4 md:grid-cols-2">
          <div><label htmlFor="premium-title" className={labelClass}>Title</label>
            <input id="premium-title" value={premium.title} maxLength={120} onChange={event => set('title', event.target.value)} className={fieldClass} /></div>
          <div><label htmlFor="premium-fee" className={labelClass}>Registration fee (৳)</label>
            <input id="premium-fee" type="number" min={1} max={1000000} step={1} value={premium.fee}
              onChange={event => set('fee', Number(event.target.value))} className={fieldClass} /></div>
        </div>
        <div><label htmlFor="premium-summary" className={labelClass}>Profile card description</label>
          <textarea id="premium-summary" rows={3} maxLength={2000} value={premium.summary} onChange={event => set('summary', event.target.value)} className={cn(fieldClass, 'resize-y')} /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label htmlFor="premium-request-label" className={labelClass}>Application button text</label>
            <input id="premium-request-label" maxLength={100} value={premium.requestLabel} onChange={event => set('requestLabel', event.target.value)} className={fieldClass} /></div>
          <div><label htmlFor="premium-details-label" className={labelClass}>Details link text</label>
            <input id="premium-details-label" maxLength={100} value={premium.detailsLabel} onChange={event => set('detailsLabel', event.target.value)} className={fieldClass} /></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label htmlFor="premium-phone" className={labelClass}>Contact phone (optional)</label>
            <input id="premium-phone" type="tel" maxLength={20} value={premium.contactPhone} onChange={event => set('contactPhone', event.target.value)} aria-invalid={phoneBad} className={fieldClass} />
            {phoneBad && <p className="mt-1 text-xs text-red-600">Use 8–15 digits, with optional + prefix.</p>}</div>
        </div>
      </div>
    </Panel>
    <Panel title="Public premium page" description="Text shown at /premium.">
      <div className="space-y-4">
        <div><label htmlFor="premium-intro" className={labelClass}>Introduction</label>
          <textarea id="premium-intro" rows={3} maxLength={2000} value={premium.intro} onChange={event => set('intro', event.target.value)} className={cn(fieldClass, 'resize-y')} />
          <p className="mt-1 text-xs text-[#6c757d]">Current registration fee appears after this text.</p></div>
        <div><label htmlFor="premium-steps" className={labelClass}>Steps (one per line)</label>
          <textarea id="premium-steps" rows={7} value={premium.steps.join('\n')} onChange={event => set('steps', event.target.value.split('\n'))} className={cn(fieldClass, 'resize-y')} /></div>
        {invalid && <p className="text-xs text-red-600">Fill every required field. Use 1–10 steps (max 500 characters each), a fee from ৳1 to ৳1,000,000, and a valid phone number.</p>}
        <div><label htmlFor="premium-footer" className={labelClass}>Final note</label>
          <textarea id="premium-footer" rows={3} maxLength={2000} value={premium.footer} onChange={event => set('footer', event.target.value)} className={cn(fieldClass, 'resize-y')} /></div>
      </div>
    </Panel>
    {dirty && <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#1a1a2e] px-4 py-3 text-white shadow-lg">
      <p className="text-[13px]">You have unsaved premium changes.</p>
      <div className="flex gap-2">
        <DashButton tone="ghost-dark" disabled={busy} onClick={() => setPremium(saved)}>Discard</DashButton>
        <DashButton tone="primary" disabled={busy || invalid} onClick={() => void save()}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save premium service
        </DashButton>
      </div>
    </div>}
  </div>;
}

function SettingsTab({ settings, onSaved }: { settings?: Settings; onSaved: () => void }) {
  const saved = useMemo(() => pickSite(settings), [settings]);
  const [site, setSite] = useState(saved);
  const [policy, setPolicy] = useState<PolicyKey>('terms');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setSite(saved); }, [saved]);
  const dirty = JSON.stringify(site) !== JSON.stringify(saved);
  const messengerBad = !!site.messengerUrl.trim() && !/^https:\/\//i.test(site.messengerUrl.trim());
  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => setSite(current => ({ ...current, [key]: value }));
  const publishedKey = (policy + 'Published') as 'termsPublished' | 'privacyPublished' | 'refundPublished';
  const save = async () => {
    setBusy(true);
    const [data, error] = await PatchRequestAxios('/platform/admin/settings', site);
    setBusy(false);
    if (data) { toast.success('Settings saved'); onSaved(); }
    else toast.error(error?.message || 'Unable to save settings');
  };
  return <div className="space-y-4">
    <Panel title="Messenger and landing page">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="messenger-url" className={labelClass}>Official Messenger link</label>
          <input id="messenger-url" value={site.messengerUrl} onChange={event => set('messengerUrl', event.target.value)} placeholder="https://m.me/your-page"
            aria-invalid={messengerBad} className={cn(fieldClass, 'font-mono text-[13px]', messengerBad && 'border-red-400')} />
          <p className={cn('mt-1 text-[11px]', messengerBad ? 'text-red-600' : 'text-[#6c757d]')}>
            {messengerBad ? 'Use a secure link that starts with https://' : 'Members use this to message the team.'}
          </p>
        </div>
        <Toggle id="discovery" label="Show popular and recent profiles" description="On the landing page"
          checked={site.discoveryEnabled} onChange={value => set('discoveryEnabled', value)} />
      </div>
    </Panel>
    <Panel title="Policies" description="Publish only text the client has approved."
      actions={<Segmented size="sm" label="Policy" value={policy} onChange={setPolicy} options={(['terms', 'privacy', 'refund'] as PolicyKey[]).map(key => ({
        value: key, label: <span className="inline-flex items-center gap-1.5">{POLICY_LABEL[key]}
          <span className={cn('size-1.5 rounded-full', site[(key + 'Published') as keyof SiteSettings] ? 'bg-emerald-500' : 'bg-[#ced4da]')} /></span>,
      }))} />}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-[260px] flex-1">
            <Toggle id="policy-published" label={`Publish the ${POLICY_LABEL[policy].toLowerCase()}`}
              description={site[publishedKey] ? 'Visitors can read it now' : 'Hidden from visitors'}
              checked={site[publishedKey]} onChange={value => set(publishedKey, value)} />
          </div>
          <a href={'/policies/' + policy} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-rose-700 hover:underline">
            <ExternalLink size={13} /> Open public page
          </a>
        </div>
        <label htmlFor="policy-text" className="sr-only">{POLICY_LABEL[policy]} text</label>
        <textarea id="policy-text" rows={16} dir="auto" value={site[policy]} onChange={event => set(policy, event.target.value)}
          placeholder={`Write the ${POLICY_LABEL[policy].toLowerCase()} here`} className={cn(fieldClass, 'resize-y leading-6')} />
        <p className="text-right text-[11px] tabular-nums text-[#adb5bd]">{site[policy].length.toLocaleString()} characters</p>
      </div>
    </Panel>
    {dirty && <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#1a1a2e] px-4 py-3 text-white shadow-lg">
      <p className="text-[13px]">You have unsaved settings.</p>
      <div className="flex gap-2">
        <DashButton tone="ghost-dark" disabled={busy} onClick={() => setSite(saved)}>Discard</DashButton>
        <DashButton tone="primary" disabled={busy || messengerBad} onClick={() => void save()}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save settings
        </DashButton>
      </div>
    </div>}
  </div>;
}

function AuditTab({ audit, loading }: { audit?: Audit[]; loading: boolean }) {
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('all');
  const [sort, setSort] = useState<SortState<'time' | 'action'>>({ key: 'time', dir: 'desc' });
  const list = useMemo(() => audit || [], [audit]);
  const actions = useMemo(() => [...new Set(list.map(item => item.action))].sort(), [list]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const direction = sort.dir === 'asc' ? 1 : -1;
    return list.filter(item => (action === 'all' || item.action === action) &&
      (!q || [item.actor, item.action, item.target, item.reason].some(value => String(value || '').toLowerCase().includes(q))))
      .sort((a, b) => (sort.key === 'time' ? Date.parse(a.createdAt) - Date.parse(b.createdAt) : a.action.localeCompare(b.action)) * direction);
  }, [list, query, action, sort]);
  return <Panel title="Audit history" description="Every admin action on this page, with who did it and why." bodyClassName="p-0"
    actions={<>
      <SearchBox value={query} onChange={setQuery} placeholder="Search history" />
      <select aria-label="Action" value={action} onChange={event => setAction(event.target.value)} className={cn(fieldClass, 'w-auto max-w-56 py-1.5 text-[13px]')}>
        <option value="all">All actions</option>
        {actions.map(item => <option key={item} value={item}>{humanize(item)}</option>)}
      </select>
    </>}>
    {loading && !audit ? <Loading label="Loading history…" /> : !visible.length ? <Empty>{list.length ? 'Nothing matches these filters.' : 'No history yet.'}</Empty> :
      <div className="max-h-[620px] overflow-auto">
        <table className="w-full min-w-[820px] border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-white"><tr>
            <SortHeader label="When" sortKey="time" sort={sort} onSort={setSort} />
            <SortHeader label="Action" sortKey="action" sort={sort} onSort={setSort} />
            <PlainHeader label="By" /><PlainHeader label="Target" /><PlainHeader label="Reason" />
          </tr></thead>
          <tbody>{visible.slice(0, 500).map(item => <tr key={item._id} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#f8f9fa]">
            <td className="whitespace-nowrap px-3 py-2.5 text-[#495057]" title={new Date(item.createdAt).toLocaleString()}>{formatWhen(item.createdAt)}</td>
            <td className="px-3 py-2.5"><span title={item.action} className="font-medium">{humanize(item.action)}</span></td>
            <td className="px-3 py-2.5"><IdChip value={String(item.actor || '')} label="Admin ID" /></td>
            <td className="px-3 py-2.5"><IdChip value={String(item.target || '')} label="Target ID" profile /></td>
            <td dir="auto" className="max-w-[360px] px-3 py-2.5 text-[#495057]">{item.reason || <span className="text-[#adb5bd]">—</span>}</td>
          </tr>)}</tbody>
        </table>
        {visible.length > 500 && <p className="border-t border-[#f0f0f0] px-4 py-2 text-[12px] text-[#6c757d]">Showing the latest 500 of {visible.length}. Narrow the search to find older entries.</p>}
      </div>}
  </Panel>;
}

export default function ServicesManager() {
  const queryClient = useQueryClient();
  const paymentsQuery = useQueryWrapper<Payment[]>(['admin-payments'], '/platform/admin/payments');
  const statsQuery = useQueryWrapper<Record<string, number>>(['upgrade-stats'], '/platform/admin/summary');
  const casesQuery = useQueryWrapper<Case[]>(['admin-service-cases'], '/platform/admin/cases');
  const settingsQuery = useQueryWrapper<Settings>(['platform-settings'], '/platform/admin/settings');
  const auditQuery = useQueryWrapper<Audit[]>(['platform-audit'], '/platform/admin/audit');
  const [tab, setTab] = useState<TabKey>('requests');
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [memberId, setMemberId] = useState('');
  const [lookup, setLookup] = useState<unknown>(null);
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const [lookupError, setLookupError] = useState('');

  useEffect(() => {
    const fromHash = window.location.hash.slice(1) as TabKey;
    if (TAB_KEYS.includes(fromHash)) setTab(fromHash);
  }, []);
  const selectTab = (next: TabKey) => {
    setTab(next);
    window.history.replaceState(null, '', '#' + next);
  };
  const refreshActivity = () => {
    void casesQuery.refetch(); void paymentsQuery.refetch(); void auditQuery.refetch(); void statsQuery.refetch();
  };
  const refreshSettings = () => {
    void queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
    void queryClient.invalidateQueries({ queryKey: ['public-settings'] });
    void queryClient.invalidateQueries({ queryKey: ['messenger-settings'] });
    void auditQuery.refetch();
  };
  const runLookup = async (id: string) => {
    const target = id.trim();
    if (!target) return;
    setMemberId(target);
    setLookupState('loading');
    setLookupError('');
    try {
      setLookup(await GetRequestNormal<unknown>('/platform/admin/connections/' + target));
      setLookupState('done');
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Couldn’t load this member');
      setLookupState('error');
    }
  };
  const lookupFromRequest = (id: string) => {
    selectTab('members');
    void runLookup(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cases = casesQuery.data, payments = paymentsQuery.data;
  const openCases = (cases || []).filter(item => OPEN.has(item.status)).length;
  const toVerify = (payments || []).filter(item => item.status === 'pending_manual').length;
  const refreshing = casesQuery.isFetching || paymentsQuery.isFetching || auditQuery.isFetching || statsQuery.isFetching;
  const tabs: { key: TabKey; label: string; icon: ReactNode; badge?: number }[] = [
    { key: 'requests', label: 'Requests', icon: <ClipboardList size={15} />, badge: openCases },
    { key: 'payments', label: 'Payments', icon: <CreditCard size={15} />, badge: toVerify },
    { key: 'members', label: 'Member balance', icon: <User size={15} /> },
    { key: 'matching', label: 'Matching rules', icon: <SlidersHorizontal size={15} /> },
    { key: 'premium', label: 'Premium service', icon: <Crown size={15} /> },
    { key: 'settings', label: 'Messenger & policies', icon: <Settings2 size={15} /> },
    { key: 'audit', label: 'History', icon: <History size={15} /> },
  ];

  return <DashboardPage>
    <DashboardHeader
      title="Services & payments"
      description="Member requests, connection payments and balances, matching rules, and site policies. Every action asks for a reason and is saved in the history."
      meta={openCases + toVerify > 0 ? <StatusPill tone="warning">{openCases + toVerify} need attention</StatusPill> : null}
      actions={<DashButton tone="ghost-dark" disabled={refreshing} onClick={refreshActivity}>
        <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} /> Refresh
      </DashButton>}
    />

    <KpiRow>
      <KpiCard label="Open requests" value={cases ? openCases : '—'} tone={openCases ? 'warning' : 'positive'}
        hint={openCases ? 'Waiting for a reply or next step' : 'Nothing waiting'} />
      <KpiCard label="Payments to verify" value={payments ? toVerify : '—'} tone={toVerify ? 'warning' : 'positive'}
        hint={toVerify ? 'Manual payments to check' : 'All checked'} />
      {Object.entries(statsQuery.data || {}).map(([key, value]) =>
        <KpiCard key={key} label={humanize(key)} value={typeof value === 'number' ? value.toLocaleString() : String(value)} />)}
    </KpiRow>

    <nav aria-label="Sections" className="overflow-x-auto rounded-lg bg-white p-1 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div role="tablist" className="flex min-w-max gap-1">
        {tabs.map(item => {
          const active = tab === item.key;
          return <button key={item.key} type="button" role="tab" id={'tab-' + item.key} aria-selected={active} aria-controls={'panel-' + item.key}
            onClick={() => selectTab(item.key)}
            className={cn('inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-rose-600',
              active ? 'bg-[#1a1a2e] text-white' : 'text-[#495057] hover:bg-[#f1f3f5]')}>
            {item.icon}{item.label}
            {!!item.badge && <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800')}>{item.badge}</span>}
          </button>;
        })}
      </div>
    </nav>

    {/* Tabs stay mounted so unsaved settings survive switching sections. */}
    <div role="tabpanel" id="panel-requests" aria-labelledby="tab-requests" hidden={tab !== 'requests'}>
      <RequestsTab cases={cases} loading={casesQuery.isLoading} onChanged={refreshActivity} onLookup={lookupFromRequest} />
    </div>
    <div role="tabpanel" id="panel-payments" aria-labelledby="tab-payments" hidden={tab !== 'payments'}>
      <PaymentsTab payments={payments} loading={paymentsQuery.isLoading} onChanged={refreshActivity} askConfirm={setConfirm} />
    </div>
    <div role="tabpanel" id="panel-members" aria-labelledby="tab-members" hidden={tab !== 'members'}>
      <MembersTab memberId={memberId} setMemberId={setMemberId} lookup={lookup} lookupState={lookupState} lookupError={lookupError}
        onLookup={id => void runLookup(id)} askConfirm={setConfirm} onChanged={refreshActivity} />
    </div>
    <div role="tabpanel" id="panel-matching" aria-labelledby="tab-matching" hidden={tab !== 'matching'}>
      <MatchingTab settings={settingsQuery.data} onSaved={refreshSettings} />
    </div>
    <div role="tabpanel" id="panel-premium" aria-labelledby="tab-premium" hidden={tab !== 'premium'}>
      <PremiumTab settings={settingsQuery.data} onSaved={refreshSettings} />
    </div>
    <div role="tabpanel" id="panel-settings" aria-labelledby="tab-settings" hidden={tab !== 'settings'}>
      <SettingsTab settings={settingsQuery.data} onSaved={refreshSettings} />
    </div>
    <div role="tabpanel" id="panel-audit" aria-labelledby="tab-audit" hidden={tab !== 'audit'}>
      <AuditTab audit={auditQuery.data} loading={auditQuery.isLoading} />
    </div>

    <AlertDialog open={!!confirm} onOpenChange={open => { if (!open) setConfirm(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className={confirm?.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-rose-600 hover:bg-rose-700'}
            onClick={() => { const current = confirm; setConfirm(null); if (current) void current.run(); }}>
            {confirm?.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </DashboardPage>;
}
