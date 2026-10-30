import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import VisualEditor from '@/components/custom/dashboard/VisualEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Visual Page Editor | Niqaha', robots: { index: false, follow: false } };

export default async function VisualEditorPage() {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) redirect('/login');
  const base = process.env.BASE_URL;
  if (!base) return <p className="p-6">Content backend is not configured.</p>;
  let authorized = false;
  try {
    const response = await fetch(base.replace(/\/$/, '') + '/visual-content/admin?path=%2F', {
      cache: 'no-store', headers: { access_token: token }, signal: AbortSignal.timeout(10000),
    });
    authorized = response.ok;
  } catch {
    return <p className="p-6">Content backend is currently unavailable.</p>;
  }
  if (!authorized) redirect('/dashboard');
  return <VisualEditor />;
}
