"use client";
import {AppSidebar} from '@/components/custom/profile/app-sidebar';
import {SidebarInset,SidebarProvider,SidebarTrigger} from '@/components/ui/sidebar';
import {STAFF_SECTIONS,type DashboardSession} from '@/lib/dashboard-access';
import {ShieldCheck} from 'lucide-react';
export default function DashboardShell({children,session}:{children:React.ReactNode;session:DashboardSession}){
  const permitted=STAFF_SECTIONS.filter(item=>session.permissions.includes(item.key));
  const navMain:{title:string;url:string;items:{title:string;url:string}[]}[]=[{
    title:'শুরু করুন',
    url:permitted[0]?.url||'/dashboard',
    items:permitted.filter(item=>item.key!=='settings').map(item=>({title:item.label,url:item.url})),
  }];
  if(permitted.some(x=>x.key==='settings')||session.role==='admin'){
    navMain.push({title:'সেটিংস',url:'/dashboard/settings',
      items:[
        ...permitted.filter(item=>item.key==='settings').map(item=>({title:item.label,url:item.url})),
        ...(session.role==='admin'?[{title:'কর্মী ও রোল পারমিশন',url:'/dashboard/access'}]:[]),
      ],
    });
  }
  return <SidebarProvider>
    <AppSidebar data={{navMain:navMain.filter(g=>g.items.length>0)}}/>
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
