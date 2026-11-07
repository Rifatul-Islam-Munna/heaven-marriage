import type {PremiumSettings} from './premium-settings';

export type PremiumStage='onboarding'|'preferences'|'shortlisting'|'connecting'|'completed'|'paused';
export const PREMIUM_STAGES:readonly PremiumStage[]=[
  'onboarding','preferences','shortlisting','connecting','completed','paused',
] as const;
export function premiumEntitlement(settings:PremiumSettings,at=new Date(),source:'bkash'|'admin'='bkash') {
  return {
    source,stage:'onboarding' as PremiumStage,startedAt:at,
    expiresAt:new Date(at.getTime()+settings.durationDays*86400000),
    assistedAllowance:settings.assistedConnections,assistedUsed:0,
    includedConnections:settings.includedConnections,
    baseFee:settings.fee,serviceCharge:settings.serviceCharge,
    updatedAt:at,adminNotes:'',
  };
}
export function premiumIsActive(user:{isSubscriber?:boolean;premiumService?:{expiresAt?:Date|string}}):boolean {
  if(!user?.isSubscriber)return false;
  if(!user.premiumService?.expiresAt)return true; // Legacy members have no expiry.
  const date=new Date(user.premiumService.expiresAt);
  return Number.isFinite(date.getTime()) && date.getTime()>Date.now();
}
