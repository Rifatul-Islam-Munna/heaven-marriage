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
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, BookOpen, List } from "lucide-react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";

interface Guideline {
  _id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminGuidelinesDashboard() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingGuideline, setEditingGuideline] = useState<Guideline | null>(
    null,
  );

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

  // Fetch all Guidelines
  const { data: guidelines, isLoading } = useQueryWrapper<Guideline[]>(
    ["guidelines"],
    "/guidelines",
  );

  // Create Guideline mutation
  const createMutation = useCommonMutationApi({
    method: "POST",
    url: "/guidelines",
    successMessage: "নির্দেশনা তৈরি হয়েছে",
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["guidelines"], exact: false });
      setIsCreateOpen(false);
      setCreateForm({ title: "", description: "" });
    },
  });

  // Update Guideline mutation
  const updateMutation = useCommonMutationApi({
    method: "PATCH",
    url: "/guidelines/update-faq-one",
    successMessage: "নির্দেশনা আপডেট হয়েছে",
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["guidelines"], exact: false });
      setIsEditOpen(false);
      setEditingGuideline(null);
    },
  });

  // Delete Guideline mutation
  const deleteMutation = useCommonMutationApi({
    method: "DELETE",
    url: "/guidelines/delete-faq",
    successMessage: "নির্দেশনা মুছে ফেলা হয়েছে",
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["guidelines"], exact: false });
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
      id: editingGuideline?._id,
      ...editForm,
    });
  };

  // Handle delete
  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  // Open edit dialog
  const openEditDialog = (guideline: Guideline) => {
    setEditingGuideline(guideline);
    setEditForm({
      title: guideline.title,
      description: guideline.description,
    });
    setIsEditOpen(true);
  };

  // Count items in description
  const countItems = (description: string) => {
    return description.split(",").filter((item) => item.trim().length > 0)
      .length;
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
            <BookOpen className="h-7 w-7 text-pink-600" />
            নির্দেশনা ম্যানেজমেন্ট
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            মোট {guidelines?.length || 0} টি নির্দেশনা
          </p>
        </div>

        {/* Create Button */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-pink-600 hover:bg-pink-700">
              <Plus className="h-4 w-4 mr-2" />
              নতুন নির্দেশনা তৈরি করুন
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                নতুন নির্দেশনা তৈরি করুন
              </DialogTitle>
              <DialogDescription className="">
                নিচের ফর্মটি পূরণ করুন
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-title" className="">
                  শিরোনাম <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create-title"
                  placeholder="যেমন: বায়োডাটা তৈরির নিয়ম"
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
                  নির্দেশনা তালিকা (কমা দিয়ে আলাদা করুন){" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="create-description"
                  placeholder="যেমন: সঠিক তথ্য দিন, ছবি আপলোড করুন, ফোন নম্বর যাচাই করুন"
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
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    <List className="h-3 w-3 inline mr-1" />
                    {countItems(createForm.description)} টি আইটেম
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {createForm.description.length}/2000
                  </p>
                </div>
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
              <TableHead className="font-semibold w-[25%]">শিরোনাম</TableHead>
              <TableHead className="font-semibold w-[50%]">
                নির্দেশনা তালিকা
              </TableHead>
              <TableHead className="font-semibold text-center w-[10%]">
                আইটেম
              </TableHead>
              <TableHead className="font-semibold text-right w-[15%]">
                অ্যাকশন
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!guidelines || guidelines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <p className="text-muted-foreground ">
                    কোন নির্দেশনা পাওয়া যায়নি
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              guidelines.map((guideline) => (
                <TableRow key={guideline._id} className="hover:bg-pink-50/50">
                  <TableCell className="font-medium ">
                    {guideline.title}
                  </TableCell>
                  <TableCell className="">
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {guideline.description}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="">
                      {countItems(guideline.description)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(guideline)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(guideline._id)}
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
        {!guidelines || guidelines.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground ">
                কোন নির্দেশনা পাওয়া যায়নি
              </p>
            </CardContent>
          </Card>
        ) : (
          guidelines.map((guideline) => (
            <Card key={guideline._id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base ">
                    {guideline.title}
                  </CardTitle>
                  <Badge variant="secondary" className="">
                    {countItems(guideline.description)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {guideline.description}
                </p>
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-blue-600 hover:text-blue-700"
                    onClick={() => openEditDialog(guideline)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    এডিট
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 hover:text-red-700"
                    onClick={() => setDeleteId(guideline._id)}
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
            <DialogTitle className="text-xl">নির্দেশনা এডিট করুন</DialogTitle>
            <DialogDescription className="">
              আপডেট করতে চাইলে পরিবর্তন করুন
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="">
                শিরোনাম <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-title"
                placeholder="যেমন: বায়োডাটা তৈরির নিয়ম"
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
                নির্দেশনা তালিকা (কমা দিয়ে আলাদা করুন){" "}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="edit-description"
                placeholder="যেমন: সঠিক তথ্য দিন, ছবি আপলোড করুন, ফোন নম্বর যাচাই করুন"
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
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  <List className="h-3 w-3 inline mr-1" />
                  {countItems(editForm.description)} টি আইটেম
                </p>
                <p className="text-xs text-muted-foreground">
                  {editForm.description.length}/2000
                </p>
              </div>
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
            <AlertDialogTitle className="text-lg">
              নির্দেশনা মুছে ফেলবেন?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না। এটি স্থায়ীভাবে নির্দেশনা
              মুছে দেবে।
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
