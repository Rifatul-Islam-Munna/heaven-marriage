import {requireDashboardSection} from '@/lib/dashboard-session';
import {privateMetadata} from '@/lib/seo';
export const metadata={...privateMetadata,title:'Blog Studio | Niqaha'};
export default async function Layout({children}:{children:React.ReactNode}){await requireDashboardSection('blog');return children;}
