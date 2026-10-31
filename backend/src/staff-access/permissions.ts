import {SetMetadata} from '@nestjs/common';
import {UserType} from '../user/entities/user.entity';
export const DASHBOARD_PERMISSION_KEY='dashboardPermission';
export const DASHBOARD_SECTIONS=['users','faq','guidelines','contact','visual-editor','seo','blog','images','pricing','questions','settings','upgrades'] as const;
export type DashboardSection=typeof DASHBOARD_SECTIONS[number];
const VALID=new Set<string>(DASHBOARD_SECTIONS);
export const validDashboardSection=(v:unknown):v is DashboardSection=>typeof v==='string'&&VALID.has(v);
export const DashboardPermission=(...sections:DashboardSection[])=>SetMetadata(DASHBOARD_PERMISSION_KEY,sections);
export function allowedDashboardSections(role:unknown,stored:unknown):DashboardSection[]{
  if(role===UserType.ADMIN)return [...DASHBOARD_SECTIONS];
  if(role===UserType.SEO)return ['seo'];
  if(role===UserType.BLOG)return ['blog'];
  if(role!==UserType.MANAGER||!Array.isArray(stored))return [];
  return [...new Set(stored.filter(validDashboardSection))];
}
export const DASHBOARD_SECTION_LABELS:Record<DashboardSection,string>={
  users:'Users & biodata',faq:'FAQ',guidelines:'Guidelines',contact:'Contact messages',
  'visual-editor':'Visual page editor',seo:'SEO manager',blog:'Blog studio',
  images:'Media library',pricing:'Pricing',questions:'Profile question builder',
  settings:'Platform settings',upgrades:'Service requests & payments',
};
