import {parsePremiumSettings,premiumTotal,resolvePremiumSettings} from './premium-settings';
import {premiumEntitlement,premiumIsActive} from './premium-service';
describe('Premium package and membership snapshot',()=>{
 it('keeps legacy settings compatible',()=>{
  const old=resolvePremiumSettings({visible:true,enabled:true,fee:900});
  expect(old.assistedConnections).toBeGreaterThan(0);
  expect(old.durationDays).toBeGreaterThan(0);
  expect(premiumTotal(old)).toBe(900);
 });
 it('requires explicit all-in premium checkout price and validates fields',()=>{
  const plan=parsePremiumSettings({...resolvePremiumSettings(null),
    fee:1200,serviceCharge:150,assistedConnections:4,includedConnections:2,durationDays:45});
  expect(premiumTotal(plan)).toBe(1350);
  expect(plan.includedConnections).toBe(2);
  expect(()=>parsePremiumSettings({...plan,serviceCharge:-1})).toThrow();
  expect(()=>parsePremiumSettings({...plan,fee:1000000,serviceCharge:1})).toThrow();
  expect(()=>parsePremiumSettings({...plan,assistedConnections:-5})).toThrow();
  expect(()=>parsePremiumSettings({...plan,durationDays:0})).toThrow();
 });
 it('snapshots a service term and only shows active badge within expiry',()=>{
  const plan=parsePremiumSettings({...resolvePremiumSettings(null),durationDays:30,assistedConnections:3});
  const start=new Date('2026-01-01T00:00:00.000Z');
  const record=premiumEntitlement(plan,start);
  expect(record.assistedAllowance).toBe(3);
  expect(record.expiresAt.toISOString()).toBe('2026-01-31T00:00:00.000Z');
  expect(premiumIsActive({isSubscriber:true,premiumService:record})).toBe(false);
  expect(premiumIsActive({isSubscriber:true})).toBe(true);
  expect(premiumIsActive({isSubscriber:false,premiumService:record})).toBe(false);
 });
});
