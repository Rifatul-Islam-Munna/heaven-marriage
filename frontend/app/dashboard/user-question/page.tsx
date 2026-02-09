"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Loader2, HelpCircle } from "lucide-react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";

interface CustomQuestion {
  _id: string;
  question: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminCustomQuestionsDashboard() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Create form state
  const [questionText, setQuestionText] = useState("");

  // Fetch all Custom Questions
  const { data: questions, isLoading } = useQueryWrapper<CustomQuestion[]>(
    ["custom-questions"],
    "/admin/custom-questions",
  );

  // Create Question mutation
  const createMutation = useCommonMutationApi({
    method: "POST",
    url: "/admin/custom-questions",
    successMessage: "প্রশ্ন তৈরি হয়েছে",
    onSuccess: () => {
      queryClient.refetchQueries({
        queryKey: ["custom-questions"],
        exact: false,
      });
      setIsCreateOpen(false);
      setQuestionText("");
    },
  });

  // Delete Question mutation
  const deleteMutation = useCommonMutationApi({
    method: "DELETE",
    url: "/admin/custom-questions/delete-question",
    successMessage: "প্রশ্ন মুছে ফেলা হয়েছে",
    onSuccess: () => {
      queryClient.refetchQueries({
        queryKey: ["custom-questions"],
        exact: false,
      });
      setDeleteId(null);
    },
  });

  // Handle create submit
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      toast.error("প্রশ্ন লিখুন");
      return;
    }
    createMutation.mutate({ question: questionText });
  };

  // Handle delete
  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <HelpCircle className="h-7 w-7 text-pink-600" />
            কাস্টম প্রশ্ন ম্যানেজমেন্ট
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            মোট {questions?.length?.toLocaleString() || 0} টি প্রশ্ন
          </p>
        </div>

        {/* Create Button */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-pink-600 hover:bg-pink-700">
              <Plus className="h-4 w-4 mr-2" />
              নতুন প্রশ্ন যোগ করুন
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                নতুন প্রশ্ন যোগ করুন
              </DialogTitle>
              <DialogDescription>
                ইউজাররা এই প্রশ্নের উত্তর দিতে পারবে
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-question">
                  প্রশ্ন <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="create-question"
                  placeholder="প্রশ্ন লিখুন... (উদাহরণ: আপনার প্রিয় বই কোনটি?)"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  required
                  maxLength={500}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {questionText.length}/500
                </p>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="w-full sm:w-auto"
                >
                  বাতিল
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full sm:w-auto bg-pink-600 hover:bg-pink-700"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      যোগ করা হচ্ছে...
                    </>
                  ) : (
                    "যোগ করুন"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-pink-50">
              <TableHead className="font-semibold w-[15%]">ক্রম</TableHead>
              <TableHead className="font-semibold w-[65%]">প্রশ্ন</TableHead>
              <TableHead className="font-semibold text-right w-[20%]">
                অ্যাকশন
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!questions || questions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  <p className="text-muted-foreground">
                    কোন প্রশ্ন পাওয়া যায়নি
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              questions.map((question, index) => (
                <TableRow key={question._id} className="hover:bg-pink-50/50">
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {question.question}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(question._id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {!questions || questions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">কোন প্রশ্ন পাওয়া যায়নি</p>
            </CardContent>
          </Card>
        ) : (
          questions.map((question, index) => (
            <Card key={question._id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex-1">
                    <span className="text-pink-600 font-bold">
                      #{index + 1}
                    </span>{" "}
                    {question.question}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                    onClick={() => setDeleteId(question._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">
              প্রশ্ন মুছে ফেলবেন?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">
              বাতিল
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  মুছছে...
                </>
              ) : (
                "মুছে ফেলুন"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
