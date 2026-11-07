"use client";

import {AppSidebar} from '@/components/custom/profile/app-sidebar';
import {SidebarInset,SidebarProvider,SidebarTrigger} from '@/components/ui/sidebar';
import {STAFF_SECTIONS,type DashboardSession} from '@/lib/dashboard-access';
import {ShieldCheck} from 'lucide-react';

type NavItem={title:string;url:string};
type NavGroup={title:string;url:string;items:NavItem[]};

export default function DashboardShell({children,session}:{children:React.ReactNode;session:DashboardSession}){
  const permitted=STAFF_SECTIONS.filter(item=>session.permissions.includes(item.key));
  const item=(key:typeof STAFF_SECTIONS[number]['key'],label?:string):NavItem[]=>{
    const match=permitted.find(section=>section.key===key);
    return match?[{title:label||match.label,url:match.url}]:[];
  };
  const navMain:NavGroup[]=[
    {title:'সদস্য ও ম্যাচিং',url:'/dashboard',items:[
      ...item('users','সদস্য ব্যবস্থাপনা'),
      ...(session.permissions.includes('users')?[{title:'স্মার্ট ম্যাচিং',url:'/dashboard/matching'}]:[]),
      ...item('questions','ডায়নামিক প্রশ্ন বিল্ডার'),
      ...(session.permissions.includes('questions')?[{title:'Country / City / Area',url:'/dashboard/locations'}]:[]),
    ]},
    {title:'সার্ভিস ও পেমেন্ট',url:'/dashboard/upgrades',items:[
      ...(session.permissions.includes('upgrades')?[
        {title:'পেমেন্ট ও আয়ের হিসাব',url:'/dashboard/payments'},
        {title:'প্রিমিয়াম সার্ভিস',url:'/dashboard/premium-service'},
        {title:'রিকোয়েস্ট ও কানেকশন',url:'/dashboard/upgrades'},
      ]:[]),
      ...item('pricing','সাধারণ মূল্য তালিকা'),
    ]},
    {title:'ওয়েবসাইট ও কনটেন্ট',url:'/dashboard/blog',items:[
      ...item('visual-editor','ভিজ্যুয়াল পেজ এডিটর'),
      ...item('blog','ব্লগ ও আর্টিকেল'),
      ...item('images','ছবি'),
      ...item('faq','প্রশ্নোত্তর'),
      ...item('guidelines','নির্দেশিকা'),
    ]},
    {title:'যোগাযোগ ও সহায়তা',url:'/dashboard/contact',items:[
      ...item('contact','যোগাযোগ'),
      ...item('ai-training','AI Training Center'),
    ]},
    {title:'সেটিংস ও অ্যাক্সেস',url:'/dashboard/settings',items:[
      ...item('seo','SEO ম্যানেজার'),
      ...item('settings','প্রোফাইল সেটিংস'),
      ...(session.role==='admin'?[
        {title:'ইমেইল ও OTP টেস্ট',url:'/dashboard/delivery-test'},
        {title:'কর্মী ও রোল পারমিশন',url:'/dashboard/access'},
      ]:[]),
    ]},
  ].filter(group=>group.items.length>0);
  return <SidebarProvider>
    <AppSidebar data={{navMain,collapseGroups:true}}/>
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4">
        <SidebarTrigger className="-ml-1"/>
        <p className="flex items-center gap-2 text-xs font-semibold capitalize text-muted-foreground">
          <ShieldCheck size={15} className="text-rose-600"/>
          {session.role==='admin'?'Administrator':session.role==='seo'?'SEO editor':
            session.role==='blog'?'Blog editor':session.role==='manager'?'Manager':'Staff'}
        </p>
      </header>
      <div className="flex flex-1 flex-col gap-4">{children}</div>
    </SidebarInset>
  </SidebarProvider>;
}
