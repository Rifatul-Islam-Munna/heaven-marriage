import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { getDashboardSession } from '@/lib/dashboard-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };
type Action = 'email' | 'otp' | 'verify';

async function proxy(action: 'status' | Action, body?: string) {
  const session = await getDashboardSession();
  if (session?.role !== 'admin') return Response.json({ message: 'Administrator access required.' }, { status: 403, headers: noStore });
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return Response.json({ message: 'Please sign in.' }, { status: 401, headers: noStore });
  if (!process.env.BASE_URL) return Response.json({ message: 'Delivery service is unavailable.' }, { status: 503, headers: noStore });
  try {
    const res = await fetch(process.env.BASE_URL.replace(/\/$/, '') + '/staff-access/admin/delivery/' + action, {
      method: body ? 'POST' : 'GET',
      cache: 'no-store',
      headers: { access_token: token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body } : {}),
      signal: AbortSignal.timeout(19000),
    });
    return new Response(await res.text(), {
      status: res.status, headers: { ...noStore, 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch {
    return Response.json({ message: 'Could not reach the email/OTP backend.' }, { status: 503, headers: noStore });
  }
}

export async function GET() {
  return proxy('status');
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.get('host')) throw new Error();
    } catch {
      return Response.json({ message: 'Invalid request origin.' }, { status: 403, headers: noStore });
    }
  }
  let input: unknown;
  try {
    const raw = await req.text();
    if (raw.length > 1200) return Response.json({ message: 'Request too large.' }, { status: 413, headers: noStore });
    input = JSON.parse(raw);
  } catch {
    return Response.json({ message: 'Invalid JSON.' }, { status: 400, headers: noStore });
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return Response.json({ message: 'Invalid request.' }, { status: 400, headers: noStore });
  }
  const { action, ...data } = input as Record<string, unknown>;
  if (action !== 'email' && action !== 'otp' && action !== 'verify') {
    return Response.json({ message: 'Unknown action.' }, { status: 404, headers: noStore });
  }
  return proxy(action, JSON.stringify(data));
}
