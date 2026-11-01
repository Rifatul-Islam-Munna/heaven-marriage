import { BadRequestException } from '@nestjs/common';

export type PremiumSettings = {
  /** Master switch: off hides every premium surface from members and visitors. */
  visible: boolean;
  /** Accept new premium applications (only meaningful while visible). */
  enabled: boolean;
  title: string;
  summary: string;
  intro: string;
  steps: string[];
  footer: string;
  requestLabel: string;
  detailsLabel: string;
  contactPhone: string;
  fee: number;
};

export const defaultPremiumSettings: PremiumSettings = {
  visible: true,
  enabled: true,
  title: 'Premium Marriage Assistance',
  summary: 'বায়োডাটা জমা দেওয়ার পর টিম আবেদন যাচাই করে যোগাযোগ করবে। পেমেন্ট নিশ্চিত হলে সেবা সক্রিয় হবে।',
  intro: 'সাধারণ বায়োডাটা জমা দেওয়া বিনামূল্যে। প্রিমিয়াম সেবার রেজিস্ট্রেশন ফি',
  steps: [
    'একই বায়োডাটা ফর্ম সম্পন্ন করে জমা দিন।',
    'ড্যাশবোর্ড থেকে Premium Upgrade Request পাঠান।',
    'Niqaha.com টিম যোগাযোগ করে তথ্য যাচাই করবে।',
    'টিমের নির্দেশনায় পেমেন্টের শর্ত ও ফেরত নীতিমালা দেখে পেমেন্ট করুন।',
    'পেমেন্ট নিশ্চিত হলে সেবার অবস্থা ড্যাশবোর্ডে দেখুন।',
  ],
  footer: 'সেবার নির্দিষ্ট সুবিধা, মেয়াদ ও ফেরতের শর্ত টিমের কাছ থেকে নিশ্চিত করুন। প্রিমিয়াম সদস্যপদ আলাদাভাবে যাচাইয়ের বিকল্প নয়।',
  requestLabel: 'Premium Upgrade Request',
  detailsLabel: 'সেবার বিস্তারিত ও শর্ত দেখুন',
  contactPhone: '01748919251',
  fee: 1000,
};

export function resolvePremiumSettings(saved: unknown): PremiumSettings {
  const value = saved && typeof saved === 'object' && !Array.isArray(saved)
    ? saved as Partial<PremiumSettings>
    : {};
  return { ...defaultPremiumSettings, ...value };
}

export function parsePremiumSettings(value: unknown): PremiumSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('Premium settings must be an object');
  const input = value as Record<string, unknown>;
  const text = (key: keyof PremiumSettings, max: number, optional = false) => {
    const raw = input[key];
    if (typeof raw !== 'string') throw new BadRequestException(`${key} must be text`);
    const result = raw.trim();
    if ((!optional && !result) || result.length > max)
      throw new BadRequestException(`${key} is required and must be at most ${max} characters`);
    return result;
  };
  if (typeof input.enabled !== 'boolean')
    throw new BadRequestException('Premium visibility must be true or false');
  // Older admin clients never sent `visible`; treat a missing value as shown.
  if (input.visible !== undefined && typeof input.visible !== 'boolean')
    throw new BadRequestException('Premium master switch must be true or false');
  if (!Number.isSafeInteger(input.fee) || (input.fee as number) < 1 || (input.fee as number) > 1000000)
    throw new BadRequestException('Premium fee must be between 1 and 1,000,000');
  if (!Array.isArray(input.steps) || input.steps.length < 1 || input.steps.length > 10 ||
      input.steps.some((step) => typeof step !== 'string' || !step.trim() || step.trim().length > 500))
    throw new BadRequestException('Add 1 to 10 steps, each under 500 characters');
  const contactPhone = text('contactPhone', 20, true);
  if (contactPhone && !/^\+?[0-9]{8,15}$/.test(contactPhone))
    throw new BadRequestException('Use a valid contact phone number');
  return {
    visible: input.visible !== false,
    enabled: input.enabled,
    title: text('title', 120),
    summary: text('summary', 2000),
    intro: text('intro', 2000),
    steps: input.steps.map((step: string) => step.trim()),
    footer: text('footer', 2000),
    requestLabel: text('requestLabel', 100),
    detailsLabel: text('detailsLabel', 100),
    contactPhone,
    fee: input.fee as number,
  };
}
