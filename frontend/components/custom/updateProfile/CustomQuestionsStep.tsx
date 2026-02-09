"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProfileStore } from "@/zustan/useProfileStore";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface CustomQuestion {
  _id: string;
  question: string;
  createdAt: string;
  updatedAt: string;
}

export function CustomQuestionsStep() {
  const formData = useProfileStore((state) => state.formData);
  const updateCustomField = useProfileStore((state) => state.updateCustomField);

  // Fetch all custom questions
  const {
    data: questions,
    isLoading,
    isError,
  } = useQueryWrapper<CustomQuestion[]>(
    ["custom-questions"],
    "/admin/custom-questions",
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <AlertCircle className="h-5 w-5" />
        <p>প্রশ্ন লোড করতে সমস্যা হয়েছে</p>
      </div>
    );
  }

  // No questions
  if (!questions || questions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-muted-foreground">কোনো অতিরিক্ত প্রশ্ন নেই</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-gray-900">অতিরিক্ত তথ্য</h3>
        <p className="text-sm text-muted-foreground">
          নিচের প্রশ্নগুলোর উত্তর দিন
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        {questions.map((question, index) => (
          <div key={question._id} className="space-y-2">
            <Label
              htmlFor={`custom-${question._id}`}
              className="text-sm font-medium"
            >
              <span className="text-pink-600 font-semibold">#{index + 1}</span>{" "}
              {question.question}
            </Label>
            <Textarea
              id={`custom-${question._id}`}
              value={formData.customFields?.[question.question] || ""}
              onChange={(e) =>
                updateCustomField(question.question, e.target.value)
              }
              placeholder="আপনার উত্তর লিখুন..."
              rows={4}
              className="resize-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
