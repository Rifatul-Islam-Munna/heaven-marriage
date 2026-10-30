import { cookies } from 'next/headers';
import { revalidateTag, unstable_cache } from 'next/cache';
import type { NextRequest } from 'next/server';
import type { PublicVisualPage } from '@/lib/visual-content';

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' };
const CACHE_SECONDS = 20 * 60;
const CACHE_TAG = 'visual-content-published-v2';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function originAllowed(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return parsed.host === request.headers.get('host') &&
      (parsed.protocol === 'http:' || parsed.protocol === 'https:');
  } catch { return false; }
}
const publicContent = unstable_cache(
  async (path: string, base: string): Promise<PublicVisualPage> => {
    if (!base) throw new Error('Content API is not configured');
    // This fetch is executed at most once per cached page/20 minutes, not per visitor.
    const response = await fetch(base.replace(/\/$/, '') +
      '/visual-content?path=' + encodeURIComponent(path), {
        cache: 'no-store', signal: AbortSignal.timeout(12000),
      });
    if (!response.ok) throw new Error('Content API unavailable');
    return await response.json() as PublicVisualPage;
  },
  ['visual-public-page-v3'], // Runtime base URL is also part of the function arguments/cache key.
  { revalidate: CACHE_SECONDS, tags: [CACHE_TAG] },
);

async function forwardPrivate(method: string, endpoint: string, body?: string) {
  const base = process.env.BASE_URL;
  if (!base) return Response.json({ message: 'Content API is not configured' }, { status: 503, headers: NO_STORE });
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return Response.json({ message: 'Admin login required' }, { status: 401, headers: NO_STORE });
  try {
    const response = await fetch(base.replace(/\/$/, '') + endpoint, {
      method, cache: 'no-store',
      headers: {
        access_token: token, ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body } : {}), signal: AbortSignal.timeout(15000),
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { ...NO_STORE, 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch {
    return Response.json({ message: 'Content backend is unreachable' }, { status: 503, headers: NO_STORE });
  }
}
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('mode');
  const path = request.nextUrl.searchParams.get('path') || '/';
  if (mode === 'list') return forwardPrivate('GET', '/visual-content/admin/list');
  if (mode === 'admin') return forwardPrivate('GET', '/visual-content/admin?path=' + encodeURIComponent(path));
  if (mode) return Response.json({ message: 'Unknown mode' }, { status: 400, headers: NO_STORE });
  if (path.length > 180 || !/^\/(?:[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)?$/.test(path) ||
    /^\/(?:api|_next)(?:\/|$)/.test(path)) {
    return Response.json({ message: 'Invalid page path' }, { status: 400, headers: NO_STORE });
  }
  try {
    // Next's persistent Data Cache is shared across visitors. We deliberately
    // do NOT cache the HTTP response in browsers/CDNs, so publishing is fresh
    // after tag invalidation rather than pinned to stale CDN data for 20min.
    const data = await publicContent(path, process.env.BASE_URL || '');
    return Response.json(data, { headers: { ...NO_STORE, 'X-Content-Cache-TTL': String(CACHE_SECONDS) } });
  } catch {
    // Fail open to the original static JSX content when MongoDB/API is down.
    return Response.json({ path, page: {}, global: {} }, { headers: NO_STORE });
  }
}
async function write(request: NextRequest, method: string, endpoint: string) {
  if (!originAllowed(request)) return Response.json({ message: 'Invalid request origin' }, { status: 403, headers: NO_STORE });
  let parsed: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 15000) throw Error();
    parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error();
  } catch {
    return Response.json({ message: 'Invalid JSON body' }, { status: 400, headers: NO_STORE });
  }
  const result = await forwardPrivate(method, endpoint, JSON.stringify(parsed));
  if (result.ok && method === 'POST') {
    // Expire immediately on publish; drafts never invalidate the live cache.
    revalidateTag(CACHE_TAG, { expire: 0 });
  }
  return result;
}
export async function PATCH(request: NextRequest) {
  return write(request, 'PATCH', '/visual-content/admin');
}
export async function POST(request: NextRequest) {
  return write(request, 'POST', '/visual-content/admin/publish');
}
export async function DELETE(request: NextRequest) {
  return write(request, 'DELETE', '/visual-content/admin');
}
