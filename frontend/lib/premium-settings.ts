export type PremiumSettings = {
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

export function resolvePremiumSettings(value: unknown): PremiumSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaultPremiumSettings;
  return { ...defaultPremiumSettings, ...value as Partial<PremiumSettings> };
}

export const formatPremiumFee = (fee: number) => `৳${new Intl.NumberFormat('bn-BD').format(fee)}`;
