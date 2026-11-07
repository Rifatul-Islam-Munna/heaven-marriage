import {redirect} from 'next/navigation';
import ServicesManager from '@/components/custom/dashboard/ServicesManager';
import {getDashboardSession} from '@/lib/dashboard-session';

export const metadata={title:'পেমেন্ট ও আয়ের হিসাব | Niqaha Admin',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function PaymentsDashboardPage(){
 const session=await getDashboardSession();
 if(!session?.permissions.includes('upgrades'))redirect('/dashboard');
 return <ServicesManager mode="payments"/>;
}
