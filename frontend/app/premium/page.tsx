import Link from 'next/link';
import { publicMetadata } from '@/lib/seo';
import { seoMetadata } from '@/lib/seo-settings-server';
import SeoStructuredData from '@/components/custom/seo/SeoStructuredData';
import { defaultPremiumSettings, formatPremiumFee, resolvePremiumSettings, type PremiumSettings } from '@/lib/premium-settings';

export const dynamic = 'force-dynamic';

async function loadPremiumSettings(): Promise<PremiumSettings> {
  const base = process.env.BASE_URL;
  if (!base) return defaultPremiumSettings;
  try {
    const response = await fetch(base.replace(/\/$/, '') + '/public/settings', {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return defaultPremiumSettings;
    const settings = await response.json() as { premium?: PremiumSettings };
    return resolvePremiumSettings(settings.premium);
  } catch {
    return defaultPremiumSettings;
  }
}

export async function generateMetadata() {
  const premium = await loadPremiumSettings();
  return seoMetadata('/premium', publicMetadata(
    `${premium.title} | Niqaha.com`,
    premium.summary,
    '/premium',
  ));
}

export default async function Premium() {
  const premium = await loadPremiumSettings();
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <SeoStructuredData path="/premium" />
      <h1 className="text-3xl font-bold text-pink-700">{premium.title}</h1>
      {premium.enabled ? <>
        <p className="mt-5">{premium.intro} {formatPremiumFee(premium.fee)}।</p>
        <ol className="list-decimal space-y-3 pl-6 mt-5">
          {premium.steps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}
        </ol>
        <p className="mt-5">{premium.footer}</p>
        {premium.contactPhone && <a href={'tel:' + premium.contactPhone} className="block mt-5 text-pink-600 underline">
          সেবার বিস্তারিত জানতে কল করুন: {premium.contactPhone}
        </a>}
        <Link href="/profile" className="inline-block mt-6 rounded bg-pink-600 px-5 py-3 text-white">
          {premium.requestLabel}
        </Link>
      </> : <p className="mt-5">বর্তমানে নতুন আবেদন বন্ধ আছে।</p>}
    </main>
  );
}
