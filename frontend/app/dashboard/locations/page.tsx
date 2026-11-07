import {redirect} from 'next/navigation';
import {getDashboardSession} from '@/lib/dashboard-session';
import LocationManager from '@/components/custom/dashboard/LocationManager';

export const dynamic='force-dynamic';
export const metadata={title:'Country, City & Area | Niqaha Admin',robots:{index:false,follow:false}};
export default async function LocationsPage(){
 const session=await getDashboardSession();
 if(!session?.permissions.includes('questions'))redirect('/dashboard');
 return <div className="space-y-4 px-4 py-6 sm:px-6">
   <div className="flex flex-wrap items-center justify-between gap-3">
     <div>
       <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Country, City & Area Manager</h1>
       <p className="mt-1 text-[13px] text-slate-600">জেলা, উপজেলা, পৌরসভা, সিটি কর্পোরেশন এবং মহল্লা/ওয়ার্ড এক জায়গায় পরিচালনা করুন।</p>
     </div>
     <a href="/dashboard/user-question"
       className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-rose-50">
       প্রশ্ন বিল্ডারে ফিরুন
     </a>
   </div>
   <LocationManager/>
 </div>;
}
