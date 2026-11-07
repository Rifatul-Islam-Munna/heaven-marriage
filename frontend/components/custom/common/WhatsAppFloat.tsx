"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Phone } from "lucide-react";
import { FaFacebookMessenger } from "react-icons/fa";
import { usePathname } from "next/navigation";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { contacts } from "@/lib/contact-config";
import { normalizeMessengerUrl } from "@/lib/messenger-url";

const SIZE = 48;
const STORAGE_PREFIX = "niqaha-contact-position-v1:";
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(n, high));

export function clampContactPosition(x: number, y: number, w: number, h: number, bottom: number) {
  return {
    x: clamp(x, 8, Math.max(8, w - SIZE - 8)),
    y: clamp(y, 72, Math.max(72, h - SIZE - bottom)),
  };
}

type ContactActionProps = {
  id: "call" | "messenger";
  href: string;
  title: string;
  slot: number;
  details: boolean;
};
function ContactAction({ id, href, title, slot, details }: ContactActionProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const positionRef = useRef<{ x: number; y: number } | null>(null);
  const drag = useRef<{ id: number; startX: number; startY: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const viewport = useRef({ w: 400, h: 800, bottom: 90 });
  const storageKey = STORAGE_PREFIX + id;

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const mobile = window.matchMedia("(max-width: 1023px)").matches;
      const bottom = mobile ? (details ? 132 : 88) : (details ? 26 : 12);
      viewport.current = { w, h, bottom };
      let stored: { x: number; y: number } | null = null;
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && "x" in parsed && "y" in parsed) {
            const { x, y } = parsed as { x: unknown; y: unknown };
            if (typeof x === "number" && Number.isFinite(x) && typeof y === "number" && Number.isFinite(y))
              stored = { x, y };
          }
        }
      } catch { /* Private mode: moving still works during this visit. */ }
      const defaults = { x: w - SIZE - 16, y: h - bottom - SIZE - slot * 58 - 14 };
      const next = clampContactPosition(
        stored ? stored.x * w : defaults.x, stored ? stored.y * h : defaults.y,
        w, h, bottom,
      );
      positionRef.current = next;
      setPosition(next);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [details, slot, storageKey]);

  const onPointerDown = (e: PointerEvent<HTMLAnchorElement>) => {
    if (e.button !== 0) return;
    const { w, h, bottom } = viewport.current;
    const current = positionRef.current || clampContactPosition(w - SIZE - 16, h - bottom - 60 - slot * 58, w, h, bottom);
    drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, x: current.x, y: current.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLAnchorElement>) => {
    const start = drag.current;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.startX, dy = e.clientY - start.startY;
    if (!start.moved && Math.hypot(dx, dy) < 6) return;
    start.moved = true;
    const { w, h, bottom } = viewport.current;
    const next = clampContactPosition(start.x + dx, start.y + dy, w, h, bottom);
    positionRef.current = next;
    setPosition(next);
  };
  const finish = (e: PointerEvent<HTMLAnchorElement>) => {
    const start = drag.current;
    if (!start || start.id !== e.pointerId) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (!start.moved) return;
    suppressClick.current = true;
    const { w, h } = viewport.current;
    const next = positionRef.current;
    if (next) {
      try { window.localStorage.setItem(storageKey, JSON.stringify({ x: next.x / w, y: next.y / h })); }
      catch { /* Storage is optional. */ }
    }
    // React's click event follows pointer-up; then clear the suppression.
    window.setTimeout(() => { suppressClick.current = false; }, 100);
  };

  return (
    <a href={href} target={id === "messenger" ? "_blank" : undefined}
      rel={id === "messenger" ? "noopener noreferrer" : undefined}
      aria-label={title + " — আইকনটি টেনে জায়গা পরিবর্তন করা যায়"}
      title={title + " · টেনে সরানো যায়"}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={finish} onPointerCancel={finish}
      onClick={e => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; } }}
      style={position
        ? { left: position.x, top: position.y, touchAction: "none" }
        : { right: 16, bottom: 120 + slot * 58, touchAction: "none" }}
      className="fixed z-40 inline-flex size-12 select-none items-center justify-center rounded-full border border-white/80 bg-pink-600 text-white shadow-[0_6px_20px_rgba(190,24,93,0.27)] outline-none transition-colors hover:bg-pink-700 focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 active:cursor-grabbing"
      data-visual-global="true">
      {id === "messenger" ? <FaFacebookMessenger className="text-xl" aria-hidden /> :
        <Phone className="size-5" aria-hidden />}
    </a>
  );
}

export default function WhatsAppFloat() {
  const path = usePathname();
  const { data } = useQueryWrapper<{ messengerUrl: string }>(
    ["public-settings"], "/public/settings",
    { staleTime: 0, refetchOnWindowFocus: true },
  );
  if (path.startsWith("/dashboard") || path.startsWith("/profile")) return null;
  const url = normalizeMessengerUrl(data?.messengerUrl ?? contacts.messenger);
  const details = path.startsWith("/biodata/");
  return (
    <>
      <ContactAction id="call" href={"tel:" + contacts.general}
        title="সরাসরি ফোন করুন" slot={0} details={details} />
      {url && <ContactAction id="messenger" href={url} title="Messenger-এ যোগাযোগ করুন"
        slot={1} details={details} />}
    </>
  );
}
