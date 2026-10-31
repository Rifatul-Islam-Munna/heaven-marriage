export const STAFF_SECTIONS=[
  {key:'users',label:'ব্যবহারকারী',url:'/dashboard'},
  {key:'faq',label:'প্রশ্নোত্তর',url:'/dashboard/faq'},
  {key:'guidelines',label:'নির্দেশিকা',url:'/dashboard/guideline'},
  {key:'contact',label:'যোগাযোগ',url:'/dashboard/contact'},
  {key:'visual-editor',label:'ভিজ্যুয়াল পেজ এডিটর',url:'/dashboard/visual-editor'},
  {key:'seo',label:'অ্যাডভান্সড SEO ম্যানেজার',url:'/dashboard/seo'},
  {key:'blog',label:'ব্লগ ও আর্টিকেল ম্যানেজার',url:'/dashboard/blog'},
  {key:'images',label:'ছবি',url:'/dashboard/images'},
  {key:'pricing',label:'মূল্য',url:'/dashboard/pricing'},
  {key:'questions',label:'ডাইনামিক প্রশ্ন বিল্ডার',url:'/dashboard/user-question'},
  {key:'settings',label:'প্রোফাইল সেটিংস',url:'/dashboard/settings'},
  {key:'upgrades',label:'সার্ভিস ও সংযোগ ম্যানেজমেন্ট',url:'/dashboard/upgrades'},
] as const;
export type DashboardSection=typeof STAFF_SECTIONS[number]['key'];
export type StaffRole='admin'|'seo'|'blog'|'manager'|'user'|'editor';
export type DashboardSession={role:StaffRole;permissions:DashboardSection[];isAdmin:boolean};
export const adminDashboardSection='roles';
export function firstDashboardUrl(session:DashboardSession):string{
  if(session.role==='admin')return '/dashboard';
  return STAFF_SECTIONS.find(x=>session.permissions.includes(x.key))?.url||'/profile';
}
export function validDashboardSection(value:unknown):value is DashboardSection{
  return typeof value==='string'&&STAFF_SECTIONS.some(section=>section.key===value);
}
export function normalizedDashboardSession(input:unknown):DashboardSession{
  if(!input||typeof input!=='object')return {role:'user',permissions:[],isAdmin:false};
  const data=input as Partial<DashboardSession>;
  const role:StaffRole=['admin','seo','blog','manager','user','editor'].includes(data.role||'')
    ?data.role as StaffRole:'user';
  const permissions=Array.isArray(data.permissions)?data.permissions.filter(validDashboardSection):[];
  // Display and route authorization still depend on the backend's fresh
  // role; ignore injected permissions incompatible with a fixed role.
  if(role==='seo')return {role,permissions:['seo'],isAdmin:false};
  if(role==='blog')return {role,permissions:['blog'],isAdmin:false};
  if(role==='manager')return {role,permissions:[...new Set(permissions)],isAdmin:false};
  if(role==='admin')return {role,permissions:STAFF_SECTIONS.map(x=>x.key),isAdmin:true};
  return {role,permissions:[],isAdmin:false};
}
