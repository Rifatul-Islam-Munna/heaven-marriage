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
import { Input } from "@/components/ui/input";
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
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  MessageSquareQuoteIcon as MessageSquareQuestion,
} from "lucide-react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";

interface Faq {
  _id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminFaqDashboard() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
  });

  // Fetch all FAQs
  const { data: faqs, isLoading } = useQueryWrapper<Faq[]>(["faqs"], "/faq");

  // Create FAQ mutation
  const createMutation = useCommonMutationApi({
    method: "POST",
    url: "/faq",
    successMessage: "FAQ তৈরি হয়েছে",
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["faqs"], exact: false });
      setIsCreateOpen(false);
      setCreateForm({ title: "", description: "" });
    },
  });

  // Update FAQ mutation
  const updateMutation = useCommonMutationApi({
    method: "PATCH",
    url: "/faq/update-faq-one",
    successMessage: "FAQ আপডেট হয়েছে",
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["faqs"], exact: false });
      setIsEditOpen(false);
      setEditingFaq(null);
    },
  });

  // Delete FAQ mutation
  const deleteMutation = useCommonMutationApi({
    method: "DELETE",
    url: "/faq/delete-faq",
    successMessage: "FAQ মুছে ফেলা হয়েছে",
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["faqs"], exact: false });
      setDeleteId(null);
    },
  });

  // Handle create submit
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.description.trim()) {
      toast.error("সকল ফিল্ড পূরণ করুন");
      return;
    }
    createMutation.mutate(createForm);
  };

  // Handle edit submit
  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.description.trim()) {
      toast.error("সকল ফিল্ড পূরণ করুন");
      return;
    }
    updateMutation.mutate({
      id: editingFaq?._id,
      ...editForm,
    });
  };

  // Handle delete
  const handleDelete = () => {
    if (deleteId) {
      console.log("deleteid", deleteId);
      deleteMutation.mutate(deleteId);
    }
  };

  // Open edit dialog
  const openEditDialog = (faq: Faq) => {
    setEditingFaq(faq);
    setEditForm({
      title: faq.title,
      description: faq.description,
    });
    setIsEditOpen(true);
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
          <h1 className="text-2xl sm:text-3xl  font-bold flex items-center gap-2">
            <MessageSquareQuestion className="h-7 w-7 text-pink-600" />
            FAQ ম্যানেজমেন্ট
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground  mt-1">
            মোট {faqs?.length?.toLocaleString() || 0} টি FAQ
          </p>
        </div>

        {/* Create Button */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-pink-600 hover:bg-pink-700">
              <Plus className="h-4 w-4 mr-2" />
              নতুন FAQ তৈরি করুন
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className=" text-xl">নতুন FAQ তৈরি করুন</DialogTitle>
              <DialogDescription className="">
                নিচের ফর্মটি পূরণ করুন
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-title" className="">
                  প্রশ্ন / টাইটেল <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create-title"
                  placeholder="প্রশ্ন লিখুন..."
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, title: e.target.value })
                  }
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-description" className="">
                  উত্তর / বিবরণ <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="create-description"
                  placeholder="উত্তর লিখুন..."
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                  required
                  maxLength={2000}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {createForm.description.length}/2000
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
                      তৈরি করা হচ্ছে...
                    </>
                  ) : (
                    "তৈরি করুন"
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
              <TableHead className=" font-semibold w-[30%]">প্রশ্ন</TableHead>
              <TableHead className=" font-semibold w-[50%]">উত্তর</TableHead>
              <TableHead className=" font-semibold text-right w-[20%]">
                অ্যাকশন
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!faqs || faqs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  <p className="text-muted-foreground ">
                    কোন FAQ পাওয়া যায়নি
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              faqs.map((faq) => (
                <TableRow key={faq._id} className="hover:bg-pink-50/50">
                  <TableCell className="font-medium ">{faq.title}</TableCell>
                  <TableCell className="">
                    <p className="line-clamp-2">{faq.description}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(faq)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(faq._id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {!faqs || faqs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground ">কোন FAQ পাওয়া যায়নি</p>
            </CardContent>
          </Card>
        ) : (
          faqs.map((faq) => (
            <Card key={faq._id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base ">{faq.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {faq.description}
                </p>
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-blue-600 hover:text-blue-700"
                    onClick={() => openEditDialog(faq)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    এডিট
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 hover:text-red-700"
                    onClick={() => setDeleteId(faq._id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    মুছুন
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className=" text-xl">FAQ এডিট করুন</DialogTitle>
            <DialogDescription className="">
              আপডেট করতে চাইলে পরিবর্তন করুন
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="">
                প্রশ্ন / টাইটেল <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-title"
                placeholder="প্রশ্ন লিখুন..."
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                required
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description" className="">
                উত্তর / বিবরণ <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="edit-description"
                placeholder="উত্তর লিখুন..."
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    description: e.target.value,
                  })
                }
                required
                maxLength={2000}
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {editForm.description.length}/2000
              </p>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="w-full sm:w-auto"
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    আপডেট করা হচ্ছে...
                  </>
                ) : (
                  "আপডেট করুন"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className=" text-lg">
              FAQ মুছে ফেলবেন?
            </AlertDialogTitle>
            <AlertDialogDescription className=" text-sm">
              এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না। এটি স্থায়ীভাবে FAQ মুছে
              দেবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className=" w-full sm:w-auto">
              বাতিল
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700  w-full sm:w-auto"
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
