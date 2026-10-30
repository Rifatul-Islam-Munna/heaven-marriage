"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import type {
  ProfileChatMessage,
  ProfileProgress,
  ProfileSession,
} from "@/lib/profile-assistant-types";

export default function ProfileAiChat() {
  const [state, setState] = useState<ProfileProgress | null>(null),
    [input, setInput] = useState(""),
    [consent, setConsent] = useState(false),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState("");
  const meta = useRef<ProfileProgress | null>(null),
    permission = useRef(false),
    end = useRef<HTMLDivElement>(null);
  permission.current = consent;
  const queryClient = useQueryClient();
  const transport = useMemo(
    () =>
      new DefaultChatTransport<ProfileChatMessage>({
        api: "/api/profile-assistant",
        prepareSendMessagesRequest: ({ messages }) => {
          const last = messages.at(-1);
          return {
            body: {
              message:
                last?.parts
                  .filter((p) => p.type === "text")
                  .map((p) => p.text)
                  .join("\n") || "",
              requestId: last?.id,
              revision: meta.current?.revision,
              consent: permission.current,
            },
          };
        },
      }),
    [],
  );
  const { messages, sendMessage, setMessages, status, error, clearError } =
    useChat<ProfileChatMessage>({
      id: "own-profile-assistant",
      transport,
      generateId: () => crypto.randomUUID(),
      onData: (part) => {
        if (part.type === "data-profile") {
          meta.current = part.data;
          setState(part.data);
        }
      },
      onFinish: ({ isError, isAbort }) => {
        if (!isError && !isAbort) {
          setInput("");
          void queryClient.invalidateQueries({ queryKey: ["get-my-profile"] });
          void queryClient.invalidateQueries({
            queryKey: ["get-my-profile-for-success"],
          });
        }
      },
    });
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setLoadError("");
      try {
        const response = await fetch("/api/profile-assistant", {
          cache: "no-store",
          signal,
        });
        const data = (await response.json()) as ProfileSession & {
          message?: unknown;
        };
        if (!response.ok)
          throw Error(
            typeof data.message === "string"
              ? data.message
              : "কথোপকথন লোড করা যায়নি।",
          );
        if (signal?.aborted) return;
        meta.current = data;
        setState(data);
        setMessages(data.messages || []);
        clearError();
      } catch (e) {
        if (!signal?.aborted)
          setLoadError(e instanceof Error ? e.message : "আবার চেষ্টা করুন।");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [setMessages, clearError],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, status]);
  const busy = status === "submitted" || status === "streaming";
  const canSend =
    !!state?.enabled && consent && !state.done && !busy && !loading && !error;
  const submit = (text: string) => {
    if (!canSend || !text.trim()) return;
    void sendMessage({ text: text.trim() });
  };
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-3 py-5 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-pink-700">
          <Sparkles className="h-6 w-6" />
          প্রশ্নোত্তরে বায়োডাটা পূরণ
        </h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/profile/my-profile">
            <ArrowLeft className="h-4 w-4" />
            ফর্মে ফিরে যান
          </Link>
        </Button>
      </div>
      <Card className="border-pink-200 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">আপনার নিজের বায়োডাটা</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            AI একবারে একটি প্রশ্ন করবে। স্পষ্ট উত্তর দিলে তা আপনার এই
            অ্যাকাউন্টের ড্রাফটে সংরক্ষিত হবে। শেষে ফর্মে সব তথ্য ও অঙ্গীকার
            যাচাই করে জমা দিন।
          </p>
          <label className="flex items-start gap-3 text-sm leading-6">
            <Checkbox
              id="profile-ai-consent"
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              disabled={busy || !state?.enabled}
              className="mt-1 shrink-0"
            />
            <span>
              আমি আমার উত্তর Google Gemini-তে প্রক্রিয়াকরণ এবং আমার নিজের
              বায়োডাটার ড্রাফটে সংরক্ষণের অনুমতি দিচ্ছি। প্রয়োজন না হলে
              ব্যক্তিগত প্রশ্ন এড়িয়ে যেতে পারি।
            </span>
          </label>
          {state && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>আবশ্যিক তথ্য পূরণ</span>
                <span>{state.completion.percentage}%</span>
              </div>
              <Progress value={state.completion.percentage} />
            </div>
          )}
          {state && !state.enabled && (
            <p
              role="status"
              className="rounded-lg bg-pink-50 p-3 text-sm text-pink-800"
            >
              AI সহায়তা এখন চালু নেই। আপাতত ফর্মে বায়োডাটা পূরণ করতে পারবেন।
            </p>
          )}
        </CardContent>
      </Card>
      {loading && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-gray-600"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          কথোপকথন লোড হচ্ছে...
        </p>
      )}
      {(loadError || error) && (
        <div
          role="alert"
          className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p>{loadError || error?.message}</p>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || loading}
            onClick={() => void load()}
          >
            <RotateCcw className="h-4 w-4" />
            আবার লোড করুন
          </Button>
        </div>
      )}
      {state?.enabled && !loadError && (
        <Card className="border-pink-200 overflow-hidden">
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div
              role="log"
              aria-label="বায়োডাটা প্রশ্নোত্তর"
              aria-live="polite"
              aria-relevant="additions text"
              className="max-h-[55vh] min-h-40 space-y-4 overflow-y-auto overscroll-contain pr-1"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === "user"
                      ? "ml-auto max-w-[90%] rounded-xl bg-pink-600 p-3 text-sm text-white"
                      : "mr-auto max-w-[95%] rounded-xl bg-pink-50 p-3 text-sm text-gray-800"
                  }
                >
                  <p className="mb-1 text-xs font-semibold opacity-75">
                    {m.role === "user" ? "আপনি" : "AI সহায়ক"}
                  </p>
                  <p className="whitespace-pre-wrap break-words">
                    {m.parts
                      .filter((p) => p.type === "text")
                      .map((p) => p.text)
                      .join("\n")}
                  </p>
                </div>
              ))}
              {busy && (
                <p
                  role="status"
                  className="flex items-center gap-2 text-sm text-pink-700"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  উত্তর বুঝে সংরক্ষণ করা হচ্ছে...
                </p>
              )}
              <div ref={end} />
            </div>
            {state.changed && (
              <p
                role="status"
                className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {state.changed.label} সংরক্ষিত: {String(state.changed.value)}
                </span>
              </p>
            )}
            {state.currentField && !state.done && (
              <div className="space-y-2 border-t border-pink-100 pt-4">
                <p className="text-sm font-semibold text-pink-700">
                  {state.currentField.question}
                </p>
                <div className="flex flex-wrap gap-2">
                  {state.currentField.options?.slice(0, 6).map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canSend}
                      onClick={() => submit(option.label)}
                      className="h-auto max-w-full whitespace-normal py-2 text-left"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {!state.done ? (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(input);
                }}
              >
                <label
                  htmlFor="profile-ai-answer"
                  className="text-sm font-medium"
                >
                  আপনার উত্তর
                </label>
                <Textarea
                  id="profile-ai-answer"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={2000}
                  disabled={!canSend}
                  placeholder={
                    consent
                      ? "বাংলায় বা ইংরেজিতে উত্তর লিখুন"
                      : "উপরের অনুমতির ঘরে টিক দিন"
                  }
                  rows={3}
                  className="resize-y border-pink-200"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    disabled={!canSend || !input.trim()}
                    className="bg-pink-600 hover:bg-pink-700"
                  >
                    <Send className="h-4 w-4" />
                    উত্তর পাঠান
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canSend}
                    onClick={() => submit("আপাতত এড়িয়ে যান")}
                  >
                    আপাতত এড়িয়ে যান
                  </Button>
                  <span className="text-xs text-gray-500">
                    {input.length}/2000
                  </span>
                </div>
              </form>
            ) : (
              <div className="space-y-3 rounded-lg bg-pink-50 p-4 text-sm">
                <p>
                  প্রশ্নোত্তরের এই অংশ শেষ হয়েছে। বাদ দেওয়া তথ্য ও
                  অঙ্গীকারগুলো ফর্মে পূরণ করে জমা দিন।
                </p>
                <Button asChild className="bg-pink-600 hover:bg-pink-700">
                  <Link href="/profile/my-profile">ফর্ম যাচাই করুন</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
