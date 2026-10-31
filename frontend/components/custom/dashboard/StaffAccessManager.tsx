'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Eye, EyeOff, Loader2, RefreshCw, Search, Shield, ShieldCheck, UserMinus, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { STAFF_SECTIONS, type DashboardSection, type StaffRole } from '@/lib/dashboard-access';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  DashboardHeader, DashboardPage, DashButton, KpiCard, KpiRow, Panel, Segmented, StatusPill, fieldClass, labelClass,
} from './dashboard-kit';

type AssignedRole = 'admin' | 'manager' | 'seo' | 'blog' | 'user';
type Account = {
  id: string; name: string; email: string; phoneNumber: string; userId: string;
  role: StaffRole; permissions: DashboardSection[]; createdAt?: string | null;
};
type Tone = 'negative' | 'info' | 'positive' | 'neutral' | 'warning';
type ListFilter = 'all' | 'admin' | 'manager' | 'editors';

const ROLES: { value: AssignedRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Administrator', description: 'Everything, including this page. Give it only to people you fully trust.' },
  { value: 'manager', label: 'Manager', description: 'Only the dashboard pages you tick below.' },
  { value: 'seo', label: 'SEO editor', description: 'Only the SEO page.' },
  { value: 'blog', label: 'Blog editor', description: 'Only the blog and its images.' },
  { value: 'user', label: 'No dashboard access', description: 'A normal member account.' },
];
const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator', manager: 'Manager', seo: 'SEO editor', blog: 'Blog editor', editor: 'Editor (old role)', user: 'Member',
};
const ROLE_TONE: Record<string, Tone> = { admin: 'negative', manager: 'info', seo: 'positive', blog: 'positive', editor: 'neutral', user: 'neutral' };
const toAssigned = (role: string): AssignedRole => (['admin', 'manager', 'seo', 'blog'].includes(role) ? role : 'user') as AssignedRole;
const initials = (name: string) => (name || '?').trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase() || '?';

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Request failed');
  return data as T;
}
function generatePassword(length = 12) {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*?'];
  const all = sets.join('');
  const random = (max: number) => { const buffer = new Uint32Array(1); crypto.getRandomValues(buffer); return buffer[0] % max; };
  const chars = sets.map(set => set[random(set.length)]);
  while (chars.length < length) chars.push(all[random(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) { const j = random(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
}
const copyText = (value: string, label = 'Copied') =>
  void navigator.clipboard.writeText(value).then(() => toast.success(label), () => toast.error('Couldn’t copy'));

function RolePicker({ value, onChange, name }: { value: AssignedRole; onChange: (role: AssignedRole) => void; name: string }) {
  return <div role="radiogroup" aria-label="Role" className="grid gap-2 sm:grid-cols-2">
    {ROLES.map(role => {
      const active = value === role.value;
      return <label key={role.value} className={cn('flex cursor-pointer gap-3 rounded-md border p-3 transition-colors',
        active ? (role.value === 'admin' ? 'border-red-300 bg-red-50' : 'border-rose-300 bg-rose-50') : 'border-[#e9ecef] hover:border-[#ced4da] hover:bg-[#f8f9fa]')}>
        <input type="radio" name={name} value={role.value} checked={active} onChange={() => onChange(role.value)} className="mt-0.5 size-4 shrink-0 accent-rose-600" />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold">
            {role.value === 'admin' && <ShieldCheck size={14} className="text-red-600" />}{role.label}
          </span>
          <span className="mt-0.5 block text-[12px] leading-4 text-[#6c757d]">{role.description}</span>
        </span>
      </label>;
    })}
  </div>;
}

function PagesPicker({ value, onChange }: { value: DashboardSection[]; onChange: (pages: DashboardSection[]) => void }) {
  const toggle = (key: DashboardSection, on: boolean) => onChange(on ? [...new Set([...value, key])] : value.filter(item => item !== key));
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[12px] font-semibold text-[#495057]">Pages this manager can open <span className="font-normal text-[#adb5bd]">{value.length}/{STAFF_SECTIONS.length}</span></p>
      <div className="flex gap-3 text-[12px] font-medium">
        <button type="button" onClick={() => onChange(STAFF_SECTIONS.map(section => section.key))} className="text-rose-700 hover:underline">Select all</button>
        <button type="button" onClick={() => onChange([])} className="text-[#6c757d] hover:underline">Clear</button>
      </div>
    </div>
    <div className="grid gap-1.5 sm:grid-cols-2">
      {STAFF_SECTIONS.map(section => {
        const on = value.includes(section.key);
        return <label key={section.key} className={cn('flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-[13px] transition-colors',
          on ? 'border-rose-200 bg-rose-50/60' : 'border-[#e9ecef] hover:bg-[#f8f9fa]')}>
          <input type="checkbox" checked={on} onChange={event => toggle(section.key, event.target.checked)} className="size-4 shrink-0 accent-rose-600" />
          <span className="min-w-0 flex-1 truncate font-medium">{section.label}</span>
          <span className="hidden truncate font-mono text-[10px] text-[#adb5bd] md:inline">{section.url.replace('/dashboard', '') || '/'}</span>
        </label>;
      })}
    </div>
    {!value.length && <p className="text-[12px] text-amber-700">With no pages ticked, this manager can’t open the dashboard at all.</p>}
  </div>;
}

function CreateDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (account: Account) => void }) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(() => generatePassword());
  const [visible, setVisible] = useState(true);
  const [role, setRole] = useState<AssignedRole>('manager');
  const [pages, setPages] = useState<DashboardSection[]>([]);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Account | null>(null);
  const emailBad = !!email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = !busy && name.trim().length >= 2 && (!!email.trim() || !!phone.trim()) && !emailBad && password.length >= 8 && password.length <= 50;
  const login = created ? (created.email || created.phoneNumber) : '';
  const loginDetails = created ? `Niqaha dashboard login\nName: ${created.name}\nSign in with: ${login}\nPassword: ${password}\nRole: ${ROLE_LABEL[created.role] || created.role}` : '';
  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const account = await api<Account>('/api/staff-access/admin/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), gender, email: email.trim(), phoneNumber: phone.trim(), password, role, permissions: role === 'manager' ? pages : [] }),
      });
      setCreated(account);
      onCreated(account);
      toast.success(`${account.name} was added`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t create the account');
    } finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={next => { if (!next) onClose(); }}>
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{created ? 'Account created' : 'Add a team member'}</DialogTitle>
        <DialogDescription>
          {created ? 'Share these sign-in details privately. The password isn’t shown again after you close this window.'
            : 'Creates a verified account they can sign in with right away. To give access to an existing member, search for them instead.'}
        </DialogDescription>
      </DialogHeader>
      {created ? <div className="space-y-4">
        <dl className="grid gap-2 rounded-md bg-[#f8f9fa] p-4 text-[13px] sm:grid-cols-2">
          <div><dt className="text-[11px] text-[#6c757d]">Name</dt><dd className="font-semibold">{created.name}</dd></div>
          <div><dt className="text-[11px] text-[#6c757d]">Role</dt><dd className="font-semibold">{ROLE_LABEL[created.role] || created.role}</dd></div>
          <div><dt className="text-[11px] text-[#6c757d]">Signs in with</dt><dd className="break-all font-mono">{login}</dd></div>
          <div><dt className="text-[11px] text-[#6c757d]">Password</dt><dd className="break-all font-mono">{password}</dd></div>
        </dl>
        <div className="flex flex-wrap justify-end gap-2">
          <DashButton onClick={() => copyText(loginDetails, 'Sign-in details copied')}><Copy size={14} /> Copy sign-in details</DashButton>
          <DashButton tone="primary" onClick={onClose}><Check size={14} /> Done</DashButton>
        </div>
      </div> : <form className="space-y-5" onSubmit={event => { event.preventDefault(); void submit(); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="new-name" className={labelClass}>Full name</label>
            <input id="new-name" autoFocus dir="auto" value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Abdullah Rahman" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="new-email" className={labelClass}>Email</label>
            <input id="new-email" type="email" autoComplete="off" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com"
              aria-invalid={emailBad} className={cn(fieldClass, emailBad && 'border-red-400')} />
          </div>
          <div>
            <label htmlFor="new-phone" className={labelClass}>Phone</label>
            <input id="new-phone" type="tel" autoComplete="off" value={phone} onChange={event => setPhone(event.target.value)} placeholder="01712345678" className={fieldClass} />
          </div>
          <p className="-mt-2 text-[11px] text-[#6c757d] sm:col-span-2">{emailBad ? <span className="text-red-600">Check the email address.</span> : 'Add at least one. They sign in with either.'}</p>
          <div>
            <p className={labelClass}>Gender</p>
            <Segmented label="Gender" value={gender} onChange={setGender} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
          </div>
          <div>
            <label htmlFor="new-password" className={labelClass}>Password</label>
            <div className="flex gap-1.5">
              <div className="relative min-w-0 flex-1">
                <input id="new-password" type={visible ? 'text' : 'password'} autoComplete="new-password" value={password} maxLength={50}
                  onChange={event => setPassword(event.target.value)} className={cn(fieldClass, 'pr-9 font-mono text-[13px]')} />
                <button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#6c757d] hover:text-[#212529]">{visible ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              </div>
              <DashButton className="px-2" title="Generate a new password" aria-label="Generate a new password" onClick={() => { setPassword(generatePassword()); setVisible(true); }}><RefreshCw size={14} /></DashButton>
            </div>
            <p className={cn('mt-1 text-[11px]', password.length && password.length < 8 ? 'text-red-600' : 'text-[#6c757d]')}>8 to 50 characters. You’ll be able to copy it after saving.</p>
          </div>
        </div>
        <div>
          <p className={labelClass}>Role</p>
          <RolePicker name="new-role" value={role} onChange={setRole} />
        </div>
        {role === 'manager' && <PagesPicker value={pages} onChange={setPages} />}
        {role === 'admin' && <p className="rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-800">Administrators can change everyone’s access, including yours, and see all member data.</p>}
        <div className="flex justify-end gap-2 border-t border-[#f0f0f0] pt-4">
          <DashButton onClick={onClose}>Cancel</DashButton>
          <DashButton type="submit" tone="primary" disabled={!canSubmit}>{busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Create account</DashButton>
        </div>
      </form>}
    </DialogContent>
  </Dialog>;
}

export default function StaffAccessManager() {
  const [staff, setStaff] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<ListFilter>('all');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Account[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Account | null>(null);
  const [role, setRole] = useState<AssignedRole>('user');
  const [pages, setPages] = useState<DashboardSection[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | { title: string; description: string; action: string; role: AssignedRole }>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setStaff(await api<Account[]>('/api/staff-access/admin/staff')); setLoadError(''); }
    catch (error) { setLoadError(error instanceof Error ? error.message : 'Couldn’t load the team'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  // Search all member accounts as you type.
  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) { setResults(null); setSearching(false); return; }
    setSearching(true);
    const timer = window.setTimeout(() => {
      api<Account[]>('/api/staff-access/admin/search?q=' + encodeURIComponent(term))
        .then(setResults)
        .catch(error => { toast.error(error instanceof Error ? error.message : 'Search failed'); setResults([]); })
        .finally(() => setSearching(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const choose = (account: Account) => {
    setSelected(account);
    setRole(toAssigned(account.role));
    setPages(account.role === 'manager' ? [...account.permissions] : []);
  };
  const upsert = (account: Account) => {
    setStaff(current => [account, ...current.filter(row => row.id !== account.id)].filter(row => row.role !== 'user'));
    setResults(current => current?.map(row => row.id === account.id ? account : row) || null);
  };
  const save = async (nextRole: AssignedRole = role) => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const account = await api<Account>('/api/staff-access/admin/' + selected.id, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole, permissions: nextRole === 'manager' ? pages : [] }),
      });
      upsert(account);
      choose(account);
      toast.success(nextRole === 'user' ? `${account.name || 'This account'} no longer has dashboard access` : 'Access saved. It applies right away.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t save access');
    } finally { setBusy(false); }
  };
  const requestSave = (nextRole: AssignedRole = role) => {
    if (!selected) return;
    const name = selected.name || 'this account';
    if (nextRole === 'admin' && selected.role !== 'admin')
      setConfirm({ title: `Make ${name} an administrator?`, action: 'Make administrator', role: nextRole,
        description: 'Administrators can open every page, see all member data and change anyone’s access, including yours.' });
    else if (selected.role === 'admin' && nextRole !== 'admin')
      setConfirm({ title: `Remove administrator rights from ${name}?`, action: 'Remove admin rights', role: nextRole,
        description: `They become: ${ROLE_LABEL[nextRole]}. They lose access to this page right away.` });
    else if (nextRole === 'user' && selected.role !== 'user')
      setConfirm({ title: `Remove ${name} from the team?`, action: 'Remove access', role: nextRole,
        description: 'They keep their member account but can no longer open the dashboard.' });
    else void save(nextRole);
  };

  const counts = useMemo(() => ({
    admin: staff.filter(row => row.role === 'admin').length,
    manager: staff.filter(row => row.role === 'manager').length,
    editors: staff.filter(row => ['seo', 'blog', 'editor'].includes(row.role)).length,
  }), [staff]);
  const list = results ?? staff.filter(row => filter === 'all' || (filter === 'editors' ? ['seo', 'blog', 'editor'].includes(row.role) : row.role === filter));
  const noChange = !selected || (role === toAssigned(selected.role) &&
    JSON.stringify([...pages].sort()) === JSON.stringify([...(selected.role === 'manager' ? selected.permissions : [])].sort()));

  return <DashboardPage>
    <DashboardHeader
      title="Team & access"
      description="Add team members and choose exactly which dashboard pages each person can open. Changes apply on their next click."
      actions={<>
        <DashButton tone="ghost-dark" disabled={loading} onClick={() => void refresh()} aria-label="Reload team"><RefreshCw size={14} className={loading ? 'animate-spin' : undefined} /></DashButton>
        <DashButton tone="primary" onClick={() => { setCreateKey(key => key + 1); setCreateOpen(true); }}><UserPlus size={14} /> Add team member</DashButton>
      </>}
    />
    <KpiRow>
      <KpiCard label="Team members" value={loading ? '—' : staff.length} hint="People with dashboard access" />
      <KpiCard label="Administrators" value={loading ? '—' : counts.admin} tone={counts.admin ? 'default' : 'warning'} hint="Full access" />
      <KpiCard label="Managers" value={loading ? '—' : counts.manager} hint="Access to chosen pages" />
      <KpiCard label="SEO & blog editors" value={loading ? '—' : counts.editors} hint="One section each" />
    </KpiRow>
    {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
      <span>{loadError}</span><DashButton onClick={() => void refresh()}>Try again</DashButton>
    </div>}

    <div className="grid items-start gap-4 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
      <section aria-label="Team" className="min-w-0 rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] lg:sticky lg:top-4">
        <div className="space-y-3 border-b border-[#f0f0f0] p-3">
          <label className="relative block">
            <span className="sr-only">Find any member</span>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#adb5bd]" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find any member by name, phone or email"
              className={cn(fieldClass, 'pl-9 pr-9')} />
            {searching ? <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#adb5bd]" />
              : search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#adb5bd] hover:text-[#495057]"><X size={14} /></button>}
          </label>
          {results ? <p className="text-[12px] text-[#6c757d]">{results.length} account{results.length === 1 ? '' : 's'} match “{search.trim()}”. Pick one to give access.</p>
            : <Segmented size="sm" label="Show" value={filter} onChange={setFilter} options={[
              { value: 'all', label: `All (${staff.length})` }, { value: 'admin', label: 'Admins' },
              { value: 'manager', label: 'Managers' }, { value: 'editors', label: 'Editors' },
            ]} />}
        </div>
        <ul className="max-h-[560px] divide-y divide-[#f0f0f0] overflow-y-auto">
          {loading && !results ? <li className="flex items-center justify-center gap-2 py-12 text-[13px] text-[#6c757d]"><Loader2 size={15} className="animate-spin" /> Loading team…</li>
            : !list.length ? <li className="px-4 py-12 text-center text-[13px] text-[#6c757d]">
              {results ? 'No account matches. Check the spelling, or add them as a new team member.' : 'No one here yet.'}
              {!results && <button type="button" onClick={() => { setCreateKey(key => key + 1); setCreateOpen(true); }} className="mt-2 block w-full font-medium text-rose-700 underline">Add a team member</button>}
            </li>
              : list.map(account => <li key={account.id}>
                <button type="button" onClick={() => choose(account)} aria-current={selected?.id === account.id ? 'true' : undefined}
                  className={cn('flex w-full items-center gap-3 px-4 py-3 text-left transition-colors', selected?.id === account.id ? 'bg-rose-50' : 'hover:bg-[#f8f9fa]')}>
                  <span aria-hidden className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
                    account.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-[#f1f3f5] text-[#495057]')}>{initials(account.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{account.name || 'Unnamed account'}</span>
                    <span className="block truncate text-[12px] text-[#6c757d]">{account.email || account.phoneNumber || (account.userId ? '#' + account.userId : 'No contact')}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <StatusPill tone={ROLE_TONE[account.role] || 'neutral'}>{ROLE_LABEL[account.role] || account.role}</StatusPill>
                    {account.role === 'manager' && <span className="text-[11px] text-[#6c757d]">{account.permissions.length} page{account.permissions.length === 1 ? '' : 's'}</span>}
                  </span>
                </button>
              </li>)}
        </ul>
      </section>

      <section aria-label="Access" className="min-w-0">
        {!selected ? <Panel>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shield size={40} className="text-[#dee2e6]" />
            <h2 className="mt-3 text-[15px] font-semibold">Choose someone to manage</h2>
            <p className="mt-1 max-w-sm text-[13px] leading-5 text-[#6c757d]">Pick a team member on the left, search for any member to give them access, or add a brand-new team member.</p>
            <DashButton tone="primary" className="mt-4" onClick={() => { setCreateKey(key => key + 1); setCreateOpen(true); }}><UserPlus size={14} /> Add team member</DashButton>
          </div>
        </Panel> : <div className="rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f0f0f0] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f1f3f5] text-[14px] font-semibold text-[#495057]">{initials(selected.name)}</span>
              <div className="min-w-0">
                <h2 className="truncate text-[15px] font-semibold">{selected.name || 'Unnamed account'}</h2>
                <p className="truncate text-[12px] text-[#6c757d]">{[selected.email, selected.phoneNumber, selected.userId && '#' + selected.userId].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill tone={ROLE_TONE[selected.role] || 'neutral'}>Now: {ROLE_LABEL[selected.role] || selected.role}</StatusPill>
              <DashButton className="px-2" aria-label="Close" onClick={() => setSelected(null)}><X size={15} /></DashButton>
            </div>
          </div>
          <div className="space-y-5 p-4">
            <div>
              <p className={labelClass}>Role</p>
              <RolePicker name="assign-role" value={role} onChange={next => { setRole(next); setPages(next === 'manager' ? (selected.role === 'manager' ? selected.permissions : pages) : []); }} />
            </div>
            {role === 'manager' && <PagesPicker value={pages} onChange={setPages} />}
            {role === 'admin' && selected.role !== 'admin' && <p className="rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-800">You’ll be asked to confirm. Administrators can change everyone’s access.</p>}
            {(role === 'seo' || role === 'blog') && <p className="rounded-md bg-sky-50 px-3 py-2 text-[12px] text-sky-900">
              {role === 'seo' ? 'SEO editors only see the SEO page.' : 'Blog editors only see the blog and can upload images for articles.'}
            </p>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f0f0] px-4 py-3">
            {selected.role !== 'user' ? <DashButton tone="danger" disabled={busy} onClick={() => requestSave('user')}><UserMinus size={14} /> Remove from team</DashButton> : <span className="text-[12px] text-[#6c757d]">Member account without dashboard access.</span>}
            <div className="flex gap-2">
              {!noChange && <DashButton disabled={busy} onClick={() => choose(selected)}>Undo</DashButton>}
              <DashButton tone="primary" disabled={busy || noChange} onClick={() => requestSave()}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save access
              </DashButton>
            </div>
          </div>
        </div>}
        <p className="mt-3 text-[12px] leading-5 text-[#6c757d]">You can’t change your own role, so there’s always at least one administrator. Every change is recorded.</p>
      </section>
    </div>

    <CreateDialog key={createKey} open={createOpen} onClose={() => setCreateOpen(false)} onCreated={account => { upsert(account); choose(account); }} />
    <AlertDialog open={!!confirm} onOpenChange={next => { if (!next) setConfirm(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { const next = confirm?.role; setConfirm(null); if (next) void save(next); }}>{confirm?.action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </DashboardPage>;
}
