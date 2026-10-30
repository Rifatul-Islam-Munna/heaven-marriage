"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto max-w-xl space-y-4 rounded-xl border border-pink-200 bg-white p-6 my-6"
    >
      <p>AI সহায়তাটি লোড করা যায়নি। আবার চেষ্টা করুন।</p>
      <Button onClick={reset} className="bg-pink-600 hover:bg-pink-700">
        আবার চেষ্টা করুন
      </Button>
    </div>
  );
}
