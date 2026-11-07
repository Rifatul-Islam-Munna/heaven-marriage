import {bangladeshMonth,buildIncomeReport} from './admin-income';

const NOW=new Date('2026-11-08T12:00:00.000Z'); // 18:00 in Bangladesh

describe('Admin verified income report',()=>{
  const connection=[
    {status:'paid',amount:1000,currency:'BDT',paidAt:'2026-11-05T11:00:00Z',paymentId:'bkash-1'},
    {status:'paid',amount:500,currency:'BDT',paidAt:'2026-11-03T09:00:00Z',paymentId:'manual:1'},
    {status:'refunded',amount:200,currency:'BDT',paidAt:'2026-09-30T11:00:00Z',
      refundedAt:'2026-11-07T11:00:00Z',paymentId:'bkash-r'},
    {status:'pending',amount:999999,currency:'BDT',paidAt:'2026-11-01T11:00:00Z'},
    {status:'failed',amount:999999,currency:'BDT',paidAt:'2026-11-01T11:00:00Z'},
    {status:'paid',amount:1000,currency:'BDT',paidAt:'2026-10-07T10:00:00Z',paymentId:'bkash-old'},
    {status:'paid',amount:3000,currency:'BDT',paidAt:'2026-10-25T10:00:00Z',paymentId:'bkash-late'},
  ];
  const premium=[
    {status:'paid',amount:2000,currency:'BDT',paidAt:'2026-11-06T11:00:00Z',paymentId:'bkash-premium'},
  ];

  it('uses Bangladesh calendar month boundaries',()=>{
    expect(bangladeshMonth(new Date('2026-10-31T17:59:59Z'))).toBe('2026-10');
    expect(bangladeshMonth(new Date('2026-10-31T18:00:00Z'))).toBe('2026-11');
  });
  it('separates bKash, manual receipts, premium and refunds; excludes pending',()=>{
    const report=buildIncomeReport(connection,premium,NOW);
    expect(report.current).toMatchObject({
      gross:3500,connectionGross:1500,premiumGross:2000,refunds:200,net:3300,
      payments:3,manualNet:500,bkashNet:2800,
    });
    expect(report.previous.net).toBe(4000);
    expect(report.previousComparableNet).toBe(1000);
    expect(report.growthPercent).toBe(230);
    expect(report.months).toHaveLength(6);
    expect(report.recent[0]).toMatchObject({event:'refund',source:'connections',amount:200});
    expect(report.recent.some(x=>x.source==='premium' && x.event==='paid')).toBe(true);
  });
  it('counts a refund in the date it is recorded, not the original purchase month',()=>{
    const report=buildIncomeReport(connection,premium,NOW);
    const september=report.months.find(x=>x.month==='2026-09');
    expect(september?.gross).toBe(200);
    expect(september?.refunds).toBe(0);
    expect(report.current.refunds).toBe(200);
  });
  it('never treats premium applications or non-settled orders as money',()=>{
    const report=buildIncomeReport([{status:'pending_manual',amount:8000},
      {status:'pending',amount:1000},{status:'failed',amount:1000}],[],NOW);
    expect(report.current.net).toBe(0);
    expect(report.allTime.net).toBe(0);
    expect(report.growthPercent).toBeNull();
  });
  it('flags missing timestamps rather than guessing createdAt',()=>{
    const report=buildIncomeReport([{status:'paid',amount:100,createdAt:'2026-11-05T00:00:00Z'} as any,
      {status:'refunded',amount:50,paidAt:'2026-10-01T00:00:00Z'}],[],NOW);
    expect(report.missingPaidDates).toBe(1);
    expect(report.missingRefundDates).toBe(1);
    expect(report.current.net).toBe(0);
  });
  it('handles fractional BDT without floating precision drift',()=>{
    const report=buildIncomeReport([
      {status:'paid',amount:0.1,paidAt:'2026-11-07T00:00:00Z'},
      {status:'paid',amount:0.2,paidAt:'2026-11-07T00:00:00Z'},
    ],[],NOW);
    expect(report.current.gross).toBe(0.3);
  });
});
