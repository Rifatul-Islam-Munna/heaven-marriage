/** Money report is computed exclusively from settled order records (not wallet credits or price settings). */
export type SettledOrder = {
  status?: string; amount?: unknown; currency?: string;
  paidAt?: Date | string; refundedAt?: Date | string;
  paymentId?: string; id?: string; transactionId?: string; refundReference?: string;
};
export type IncomeTransaction = {
  id: string; source: 'connections' | 'premium'; method: 'bKash' | 'Manual';
  event: 'paid' | 'refund'; amount: number; at: string; reference: string;
};
export type IncomeBucket = {
  month: string; connectionGross: number; premiumGross: number; gross: number;
  refunds: number; net: number; manualNet: number; bkashNet: number; payments: number;
};
export type IncomeReport = {
  currency: 'BDT'; timezone: 'Asia/Dhaka'; month: string; previousMonth: string;
  current: IncomeBucket; previous: IncomeBucket; previousComparableNet: number;
  growthPercent: number | null; months: IncomeBucket[]; allTime: IncomeBucket;
  missingPaidDates: number; missingRefundDates: number;
  recent: IncomeTransaction[];
};
const BD_OFFSET=6*60*60*1000;
function dateOf(value: unknown): Date | null {
  if (!value) return null;
  const date=value instanceof Date ? value : typeof value==='string' ? new Date(value) : new Date(NaN);
  return Number.isFinite(date.getTime()) ? date : null;
}
export function bangladeshMonth(date: Date): string {
  const local=new Date(date.getTime()+BD_OFFSET);
  return local.getUTCFullYear()+'-'+String(local.getUTCMonth()+1).padStart(2,'0');
}
function empty(month:string): IncomeBucket {
  return {month,connectionGross:0,premiumGross:0,gross:0,refunds:0,net:0,manualNet:0,bkashNet:0,payments:0};
}
function prevComparableCutoff(now:Date):Date {
  const local=new Date(now.getTime()+BD_OFFSET);
  const year=local.getUTCFullYear(),month=local.getUTCMonth();
  const daysPrevious=new Date(Date.UTC(year,month,0)).getUTCDate();
  const day=Math.min(local.getUTCDate(),daysPrevious);
  return new Date(Date.UTC(year,month-1,day,local.getUTCHours(),local.getUTCMinutes(),
    local.getUTCSeconds(),local.getUTCMilliseconds())-BD_OFFSET);
}
const moneyRound=(value:number)=>Math.round(value*100)/100;
function addMoney(bucket: IncomeBucket, amount:number, kind:'connections'|'premium',
  manual:boolean,refunded:boolean){
  if(refunded) bucket.refunds=moneyRound(bucket.refunds+amount);
  else {
    bucket.gross=moneyRound(bucket.gross+amount);
    bucket.payments++;
    if(kind==='premium')bucket.premiumGross=moneyRound(bucket.premiumGross+amount);
    else bucket.connectionGross=moneyRound(bucket.connectionGross+amount);
  }
  const delta=refunded?-amount:amount;
  bucket.net=moneyRound(bucket.net+delta);
  if(manual)bucket.manualNet=moneyRound(bucket.manualNet+delta);else bucket.bkashNet=moneyRound(bucket.bkashNet+delta);
}
export function buildIncomeReport(
  connectionOrders: readonly SettledOrder[],
  premiumOrders: readonly SettledOrder[],
  now=new Date(),
):IncomeReport {
  const month=bangladeshMonth(now);
  const local=new Date(now.getTime()+BD_OFFSET);
  const year=local.getUTCFullYear(), index=local.getUTCMonth();
  const prevMonth=bangladeshMonth(new Date(Date.UTC(year,index,0,12)-BD_OFFSET));
  const months=Array.from({length:6},(_,i)=>bangladeshMonth(new Date(
    Date.UTC(year,index-5+i,1,12)-BD_OFFSET))).map(empty);
  const monthly=new Map(months.map(row=>[row.month,row]));
  const current=monthly.get(month) ?? empty(month);
  const previous=monthly.get(prevMonth) ?? empty(prevMonth);
  const allTime=empty('all');
  let previousComparableNet=0,missingPaidDates=0,missingRefundDates=0;
  const recent:IncomeTransaction[]=[];
  const comparisonCutoff=prevComparableCutoff(now);
  for(const [kind,orders] of [
    ['connections',connectionOrders],['premium',premiumOrders],
  ] as const)for(const order of orders){
    if(order.status!=='paid'&&order.status!=='refunded')continue;
    if(order.currency&&order.currency!=='BDT')continue;
    const rawAmount=Number(order.amount);
    if(!Number.isFinite(rawAmount)||rawAmount<=0||rawAmount>Number.MAX_SAFE_INTEGER/100)continue;
    const amount=moneyRound(rawAmount);
    const manual=kind==='connections' && String(order.paymentId||'').startsWith('manual:');
    const paidAt=dateOf(order.paidAt);
    const refundedAt=order.status==='refunded'?dateOf(order.refundedAt):null;
    if(paidAt && paidAt<=now) {
      addMoney(allTime,amount,kind,manual,false);
      recent.push({id:String(order.id||''),source:kind,method:manual?'Manual':'bKash',
        event:'paid',amount,at:paidAt.toISOString(),reference:String(order.transactionId||'')});
      const key=bangladeshMonth(paidAt);
      const bucket=monthly.get(key);
      if(bucket)addMoney(bucket,amount,kind,manual,false);
      if(key===prevMonth&&paidAt<=comparisonCutoff)previousComparableNet=moneyRound(previousComparableNet+amount);
    } else missingPaidDates++;
    if(order.status==='refunded') {
      if(refundedAt&&refundedAt<=now) {
        addMoney(allTime,amount,kind,manual,true);
        recent.push({id:String(order.id||''),source:kind,method:manual?'Manual':'bKash',
          event:'refund',amount,at:refundedAt.toISOString(),reference:String(order.refundReference||'')});
        const key=bangladeshMonth(refundedAt);
        const bucket=monthly.get(key);
        if(bucket)addMoney(bucket,amount,kind,manual,true);
        if(key===prevMonth&&refundedAt<=comparisonCutoff)previousComparableNet=moneyRound(previousComparableNet-amount);
      } else missingRefundDates++;
    }
  }
  const growthPercent=previousComparableNet>0
    ? Math.round((current.net-previousComparableNet)/previousComparableNet*1000)/10
    : null;
  return {currency:'BDT',timezone:'Asia/Dhaka',month,previousMonth:prevMonth,
    current,previous,previousComparableNet,growthPercent,months,allTime,
    missingPaidDates,missingRefundDates,
    recent:recent.sort((a,b)=>b.at.localeCompare(a.at)).slice(0,25)};
}
