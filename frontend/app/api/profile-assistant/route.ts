import { cookies } from "next/headers";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import type {
  ProfileChatMessage,
  ProfileSession,
} from "@/lib/profile-assistant-types";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store, max-age=0" };
async function backend(method: "GET" | "POST", body?: unknown) {
  const token = (await cookies()).get("access_token")?.value;
  if (!token)
    return { status: 401, message: "আগে আপনার অ্যাকাউন্টে লগইন করুন।" };
  const base = process.env.BASE_URL;
  if (!base)
    return {
      status: 503,
      message: "সহায়তাটি এখন উপলব্ধ নেই। পরে চেষ্টা করুন।",
    };
  try {
    const r = await fetch(base.replace(/\/$/, "") + "/platform/ai/profile", {
      method,
      cache: "no-store",
      headers: { "Content-Type": "application/json", access_token: token },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(55000),
    });
    const data = await r.json();
    if (!r.ok)
      return {
        status: r.status,
        message:
          typeof data.message === "string"
            ? data.message
            : Array.isArray(data.message)
              ? data.message.join(" ")
              : "আবার চেষ্টা করুন।",
      };
    return { status: 200, data: data as ProfileSession };
  } catch {
    return {
      status: 503,
      message: "সংযোগ করা যায়নি। আবার লোড করে চেষ্টা করুন।",
    };
  }
}
export async function GET() {
  const result = await backend("GET");
  return Response.json(result.data || { message: result.message }, {
    status: result.status,
    headers,
  });
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const source = new URL(origin);
      // Next can use an internal URL behind a proxy; Host is the browser-facing authority.
      const host = request.headers.get("host") || new URL(request.url).host;
      if (!["http:", "https:"].includes(source.protocol) || source.host !== host)
        return new Response("Invalid request origin", { status: 403, headers });
    } catch { return new Response("Invalid request origin", { status: 403, headers }); }
  }
  let payload: unknown;
  try {
    const text = await request.text();
    if (text.length > 10000) throw Error();
    payload = JSON.parse(text);
  } catch {
    return new Response("উত্তরটি সঠিক নয়।", { status: 400, headers });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return new Response("Invalid request", { status: 400, headers });
  const body = payload as Record<string, unknown>;
  if (
    typeof body.message !== "string" ||
    body.message.length > 2000 ||
    typeof body.requestId !== "string" ||
    !Number.isInteger(body.revision) ||
    body.consent !== true
  )
    return new Response("উত্তর ও AI প্রক্রিয়াকরণের অনুমতি দিন।", {
      status: 400,
      headers,
    });
  // No target user, client conversation history, model, tool or profile patch is forwarded.
  const result = await backend("POST", {
    message: body.message,
    requestId: body.requestId,
    revision: body.revision,
    consent: true,
  });
  if (!result.data?.message)
    return new Response(result.message || "আবার চেষ্টা করুন।", {
      status: result.status,
      headers,
    });
  const { messages: history, message, ...progress } = result.data;
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
  const stream = createUIMessageStream<ProfileChatMessage>({
    execute({ writer }) {
      writer.write({ type: "start", messageId: message.id });
      writer.write({ type: "text-start", id: message.id });
      writer.write({ type: "text-delta", id: message.id, delta: text });
      writer.write({ type: "text-end", id: message.id });
      writer.write({ type: "data-profile", data: progress, transient: true });
      writer.setOutcome({ status: "completed" });
    },
  });
  return createUIMessageStreamResponse({ stream, headers });
}
