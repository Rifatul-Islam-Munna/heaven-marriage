'use client';
import { Check, AlertCircle, ClipboardList, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminBiodataSectionProgress } from '@/lib/admin-biodata-progress';

export default function AdminBiodataSectionOverview({
  sections, selected, onSelect, loading = false,
}: {
  sections: AdminBiodataSectionProgress[];
  selected: number;
  onSelect: (id: number) => void;
  loading?: boolean;
}) {
  const overall = sections.reduce((acc, s) => ({
    answered: acc.answered + s.answered,
    total: acc.total + s.total,
    requiredMissing: acc.requiredMissing + s.requiredMissing,
  }), { answered: 0, total: 0, requiredMissing: 0 });
  const percent = overall.total ? Math.round(overall.answered / overall.total * 100) : 0;
  return <section aria-label="বায়োডাটার সেকশন ও সম্পন্ন হওয়ার অগ্রগতি" className="space-y-4 rounded-xl border border-pink-100 bg-white p-3 shadow-sm sm:p-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-[17px] font-semibold text-gray-900">
          <ClipboardList className="size-5 text-pink-600" /> Biodata sections
        </h2>
        <p className="mt-1 text-[12px] leading-5 text-gray-600">সেকশনে ক্লিক করলে সরাসরি সেই ফর্মে যাবে। যে উত্তর পূরণ করেছেন, তার ভিত্তিতে অগ্রগতি আপডেট হবে।</p>
      </div>
      <div className="flex items-center gap-3 rounded-lg bg-pink-50 px-3 py-2">
        <div className="text-right">
          <p className="text-[20px] font-bold tabular-nums text-pink-700">{loading ? '—' : percent + '%'}</p>
          <p className="text-[11px] text-pink-900">Overall answered</p>
        </div>
        <div className="text-[11px] leading-5 text-gray-600">
          <p className="font-semibold tabular-nums">{overall.answered} / {overall.total} answers</p>
          <p>{overall.requiredMissing ? overall.requiredMissing + ' required left' : 'Required fields checked'}</p>
        </div>
      </div>
    </header>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {sections.map(section => {
        const active = section.id === selected;
        const complete = section.answered === section.total;
        const missing = section.requiredMissing > 0;
        const status = complete ? 'সম্পূর্ণ' : missing ? section.requiredMissing + 'টি আবশ্যক বাকি' : 'ঐচ্ছিক তথ্য বাকি';
        return <button type="button" key={section.id} onClick={() => onSelect(section.id)}
          aria-current={active ? 'step' : undefined}
          aria-label={`${section.title}: ${section.answered} of ${section.total} answered. ${status}`}
          className={cn('group flex min-w-0 flex-col gap-2 rounded-lg border p-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600',
            active ? 'border-pink-500 bg-pink-50 shadow-sm ring-1 ring-pink-200'
              : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-pink-300 hover:shadow-sm')}>
          <div className="flex w-full items-start justify-between gap-1.5">
            <span className="text-[11px] font-semibold text-gray-500">SECTION {section.id + 1}</span>
            {complete ? <Check className="size-4 shrink-0 text-emerald-600" /> :
              missing ? <AlertCircle className="size-4 shrink-0 text-amber-600" /> :
              <ArrowRight className="size-4 shrink-0 text-pink-500" />}
          </div>
          <span className="min-h-[34px] text-[13px] font-semibold leading-4 text-gray-900">{section.title}</span>
          <div className="flex w-full items-baseline justify-between gap-2">
            <span className="text-[12px] tabular-nums text-gray-600">{section.answered} / {section.total} answered</span>
            <span className="text-[13px] font-bold tabular-nums text-pink-700">{section.percentage}%</span>
          </div>
          <div role="progressbar" aria-label={section.title+' answered'} aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={section.percentage} className="h-1.5 w-full overflow-hidden rounded-full bg-pink-100">
            <div className={cn('h-full rounded-full transition-[width] duration-300',complete?'bg-emerald-500':'bg-pink-500')}
              style={{ width: section.percentage + '%' }} />
          </div>
          <span className={cn('text-[11px] leading-4',complete?'text-emerald-700':missing?'text-amber-800':'text-gray-500')}>{status}</span>
        </button>;
      })}
    </div>
    <p className="text-[11px] text-gray-500">এই শতাংশটি সব দৃশ্যমান প্রশ্নের উত্তর গুনে দেখায়; এটি অনুমোদন বা Publish status নয়। Save না করা পরিবর্তন সার্ভারে সংরক্ষিত হয়নি।</p>
  </section>;
}
