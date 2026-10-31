"use client";
import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProfileStore } from "@/zustan/useProfileStore";
import { extractBiodata } from "@/actions/ai";
import { PostRequestAxios } from "@/api-hooks/api-hooks";
import type { User } from "@/@types/user";
import { toast } from "sonner";
type Field = { path: string; value: string | number; evidence: string };
export default function AiBiodataAssistant() {
  const [consent, setConsent] = useState(false),
    [text, setText] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [fields, setFields] = useState<Field[]>([]),
    [advice, setAdvice] = useState("");
  const extract = async () => {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("consent", String(consent));
      form.set("text", text);
      if (file) form.set("file", file);
      const r = await extractBiodata(form);
      if (r.error) toast.error(r.error);
      else setFields(r.data?.fields || []);
    } catch {
      toast.error("Unable to extract. Please complete the form manually.");
    } finally {
      setBusy(false);
    }
  };
  const apply = () => {
    const store = useProfileStore.getState();
    for (const f of fields) {
      const [parent, child] = f.path.split(".");
      if (child) store.updateNestedField(parent as keyof User, child, f.value);
      else store.updateField(parent as keyof User, f.value);
    }
    setFields([]);
    setFile(null);
    toast.success("Suggestions applied to draft. Review before submission.");
  };
  return (
    <Card className="mb-5 shadow-none border-pink-100">
      <CardContent className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-gray-600">প্রশ্নের উত্তর দিয়ে নিজের বায়োডাটা পূরণ করুন।</p><Button asChild className="bg-pink-600 hover:bg-pink-700"><Link href={"/profile/ai-profile" as Route}><Sparkles className="h-4 w-4" />AI দিয়ে প্রশ্নোত্তর শুরু করুন</Link></Button></div>
        <details>
          <summary className="cursor-pointer font-semibold text-pink-700">
            AI দিয়ে বায়োডাটা পূরণে সহায়তা (ঐচ্ছিক)
          </summary>
          <div className="space-y-3 mt-4">
            <p className="text-sm">
              PDF, DOCX, ছবি বা লেখা থেকে তথ্য প্রস্তাব করা হবে। অজানা উত্তর
              ফাঁকা থাকবে। প্রতিটি তথ্য যাচাই করে প্রয়োগ করুন।
            </p>
            <textarea
              aria-label="Biodata text or question"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={50000}
              className="w-full rounded border p-3"
              rows={4}
              placeholder="আপনার বায়োডাটা অথবা প্রশ্ন লিখুন"
            />
            <input
              aria-label="Upload biodata"
              type="file"
              accept=".pdf,.docx,.png,.jpg,.jpeg,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size > 4 * 1024 * 1024) {
                  toast.error("Maximum 4 MB");
                  e.target.value = "";
                  return;
                }
                setFile(f || null);
              }}
            />
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              আমি এই লেখা/ফাইল AI-তে প্রক্রিয়াকরণের অনুমতি দিচ্ছি।
              প্রক্রিয়াকরণের জন্য ফাইল পাঠানো হবে; সার্ভারে কপি রাখা হবে না।
            </label>
            <div className="flex gap-3 flex-wrap">
              <Button
                disabled={!consent || busy || (!text && !file)}
                onClick={extract}
              >
                {busy ? "প্রক্রিয়া চলছে..." : "তথ্য বের করুন"}
              </Button>
              <Button
                variant="outline"
                disabled={!consent || busy || !text}
                onClick={async () => {
                  setBusy(true);
                  const [data, error] = await PostRequestAxios<{
                    advice: string;
                  }>("/platform/ai/help", { text, consent });
                  setBusy(false);
                  if (data) setAdvice(data.advice);
                  else toast.error(error?.message || "AI unavailable");
                }}
              >
                প্রশ্ন বুঝতে / ভাষা ঠিক করতে সাহায্য
              </Button>
            </div>
            {advice && (
              <p className="whitespace-pre-wrap rounded bg-pink-50 p-3 text-sm">
                {advice}
              </p>
            )}
            {fields.length > 0 && (
              <div className="space-y-2">
                {fields.map((f, i) => (
                  <label key={f.path} className="block border-b py-2 text-sm">
                    {f.path}
                    <input
                      className="w-full border rounded p-2"
                      value={String(f.value)}
                      onChange={(e) =>
                        setFields((old) =>
                          old.map((x, j) =>
                            j === i
                              ? {
                                  ...x,
                                  value:
                                    typeof x.value === "number"
                                      ? Number(e.target.value)
                                      : e.target.value,
                                }
                              : x,
                          ),
                        )
                      }
                    />
                    <span className="text-gray-500">উৎস: {f.evidence}</span>
                  </label>
                ))}
                <Button onClick={apply}>
                  যাচাই করেছি — ড্রাফটে প্রয়োগ করুন
                </Button>
                <Button variant="outline" onClick={() => setFields([])}>
                  বাতিল
                </Button>
              </div>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
