"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Plus } from "lucide-react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";

interface Pricing {
  _id: string;
  title: string;
  description?: string;
  originalPrice: number;
  discountPrice?: number;
  numberOfConnections: number;
}

interface PricingFormData {
  id?: string;
  title: string;
  description: string;
  originalPrice: string;
  discountPrice: string;
  numberOfConnections: string;
}

// Convert English numbers to Bangla
const toBanglaNumber = (num: number): string => {
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return num
    ?.toString()
    ?.replace(/\d/g, (digit) => banglaDigits[parseInt(digit)]);
};

const PricingDashboard = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PricingFormData>({
    title: "",
    description: "",
    originalPrice: "",
    discountPrice: "",
    numberOfConnections: "",
  });

  // Fetch all pricings
  const { data: pricings = [], isLoading } = useQueryWrapper<Pricing[]>(
    ["pricings"],
    "/pricing",
    {
      staleTime: 5000,
    },
  );

  // Create mutation
  const createMutation = useCommonMutationApi<Pricing, any>({
    url: "/pricing",
    method: "POST",
    mutationKey: ["create-pricing"],
    successMessage: "প্রাইসিং সফলভাবে তৈরি হয়েছে!",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricings"] });
      resetForm();
      setIsModalOpen(false);
    },
  });

  // Update mutation
  const updateMutation = useCommonMutationApi<Pricing, any>({
    url: "/pricing",
    method: "PATCH",
    mutationKey: ["update-pricing"],
    successMessage: "প্রাইসিং সফলভাবে আপডেট হয়েছে!",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricings"] });
      resetForm();
      setIsModalOpen(false);
      setIsEditing(false);
    },
  });

  // Delete mutation
  const deleteMutation = useCommonMutationApi<void, string>({
    url: "/pricing/delete-one",
    method: "DELETE",
    mutationKey: ["delete-pricing"],
    successMessage: "প্রাইসিং সফলভাবে ডিলিট হয়েছে!",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricings"] });
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
    },
  });

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...(isEditing && { id: formData.id }),
      title: formData.title,
      description: formData.description,
      originalPrice: Number(formData.originalPrice),
      discountPrice: formData.discountPrice
        ? Number(formData.discountPrice)
        : undefined,
      numberOfConnections: Number(formData.numberOfConnections),
    };

    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  // Open create modal
  const openCreateModal = () => {
    resetForm();
    setIsEditing(false);
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (pricing: Pricing) => {
    setFormData({
      id: pricing._id,
      title: pricing.title,
      description: pricing.description || "",
      originalPrice: pricing.originalPrice.toString(),
      discountPrice: pricing.discountPrice
        ? pricing.discountPrice.toString()
        : "",
      numberOfConnections: pricing.numberOfConnections.toString(),
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (id: string) => {
    setDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      originalPrice: "",
      discountPrice: "",
      numberOfConnections: "",
    });
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    resetForm();
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            প্রাইসিং ম্যানেজমেন্ট
          </h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">
            আপনার প্রাইসিং প্ল্যান পরিচালনা করুন
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-pink-600 hover:bg-pink-700 text-white w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          নতুন প্রাইসিং তৈরি করুন
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-500">লোড হচ্ছে...</div>
      ) : pricings.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          কোনো প্রাইসিং ডেটা নেই। আপনার প্রথম প্রাইসিং প্ল্যান তৈরি করুন!
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4">
            {pricings.map((pricing) => (
              <div
                key={pricing._id}
                className="bg-white rounded-lg border border-gray-200 p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {pricing.title}
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(pricing)}
                      className="border-pink-200 text-pink-600 hover:bg-pink-50 h-8 w-8 p-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(pricing._id)}
                      className="border-red-200 text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {pricing.description && (
                    <div>
                      <span className="text-xs font-medium text-gray-500">
                        বিবরণ:
                      </span>
                      <p className="text-sm text-gray-700 mt-1">
                        {pricing.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-gray-50 rounded-md p-3">
                      <span className="text-xs font-medium text-gray-500 block mb-1">
                        মূল মূল্য
                      </span>
                      <span className="text-base font-semibold text-gray-900">
                        ৳{toBanglaNumber(pricing.originalPrice)}
                      </span>
                    </div>

                    <div className="bg-pink-50 rounded-md p-3">
                      <span className="text-xs font-medium text-gray-500 block mb-1">
                        ছাড়ের মূল্য
                      </span>
                      <span className="text-base font-semibold text-pink-600">
                        {pricing.discountPrice
                          ? `৳${toBanglaNumber(pricing.discountPrice)}`
                          : "-"}
                      </span>
                    </div>

                    <div className="bg-blue-50 rounded-md p-3 col-span-2">
                      <span className="text-xs font-medium text-gray-500 block mb-1">
                        কানেকশন সংখ্যা
                      </span>
                      <span className="text-base font-semibold text-blue-600">
                        {toBanglaNumber(pricing.numberOfConnections)} টি
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-pink-50">
                  <TableHead className="font-semibold">শিরোনাম</TableHead>
                  <TableHead className="font-semibold">বিবরণ</TableHead>
                  <TableHead className="font-semibold">মূল মূল্য</TableHead>
                  <TableHead className="font-semibold">ছাড়ের মূল্য</TableHead>
                  <TableHead className="font-semibold">
                    কানেকশন সংখ্যা
                  </TableHead>
                  <TableHead className="font-semibold text-right">
                    অ্যাকশন
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricings.map((pricing) => (
                  <TableRow key={pricing._id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {pricing.title}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {pricing.description || "-"}
                    </TableCell>
                    <TableCell className="text-gray-900">
                      ৳{toBanglaNumber(pricing.originalPrice)}
                    </TableCell>
                    <TableCell className="text-pink-600 font-medium">
                      {pricing.discountPrice
                        ? `৳${toBanglaNumber(pricing.discountPrice)}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-blue-600 font-medium">
                      {toBanglaNumber(pricing.numberOfConnections)} টি
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(pricing)}
                          className="border-pink-200 text-pink-600 hover:bg-pink-50"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(pricing._id)}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-bold text-gray-900">
              {isEditing ? "প্রাইসিং এডিট করুন" : "নতুন প্রাইসিং তৈরি করুন"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label
                htmlFor="title"
                className="text-gray-700 text-sm md:text-base"
              >
                শিরোনাম <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="প্রাইসিং শিরোনাম লিখুন"
                required
                className="border-gray-300 focus:border-pink-500 focus:ring-pink-500 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-gray-700 text-sm md:text-base"
              >
                বিবরণ{" "}
                <span className="text-gray-500 text-xs font-normal">
                  (কমা দিয়ে আলাদা করুন)
                </span>
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="যেমন: সীমাহীন প্রোফাইল দেখুন, মেসেজ পাঠান, ফোন নম্বর দেখুন"
                rows={3}
                className="border-gray-300 focus:border-pink-500 focus:ring-pink-500 text-base"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="originalPrice"
                  className="text-gray-700 text-sm md:text-base"
                >
                  মূল মূল্য <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="originalPrice"
                  name="originalPrice"
                  type="number"
                  value={formData.originalPrice}
                  onChange={handleInputChange}
                  placeholder="০.০০"
                  min="0"
                  step="0.01"
                  required
                  className="border-gray-300 focus:border-pink-500 focus:ring-pink-500 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="discountPrice"
                  className="text-gray-700 text-sm md:text-base"
                >
                  ছাড়ের মূল্য
                </Label>
                <Input
                  id="discountPrice"
                  name="discountPrice"
                  type="number"
                  value={formData.discountPrice}
                  onChange={handleInputChange}
                  placeholder="০.০০"
                  min="0"
                  step="0.01"
                  className="border-gray-300 focus:border-pink-500 focus:ring-pink-500 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="numberOfConnections"
                className="text-gray-700 text-sm md:text-base"
              >
                কানেকশন সংখ্যা <span className="text-red-500">*</span>
              </Label>
              <Input
                id="numberOfConnections"
                name="numberOfConnections"
                type="number"
                value={formData.numberOfConnections}
                onChange={handleInputChange}
                placeholder="০"
                min="0"
                step="1"
                required
                className="border-gray-300 focus:border-pink-500 focus:ring-pink-500 text-base"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                className="border-gray-300 w-full sm:w-auto"
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-pink-600 hover:bg-pink-700 text-white w-full sm:w-auto"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "সেভ হচ্ছে..."
                  : isEditing
                    ? "আপডেট করুন"
                    : "তৈরি করুন"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg md:text-xl font-bold text-gray-900">
              আপনি কি নিশ্চিত?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm md:text-base text-gray-600">
              এই প্রাইসিং ডিলিট করলে তা আর ফিরিয়ে আনা যাবে না। আপনি কি সত্যিই
              এটি ডিলিট করতে চান?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="border-gray-300 w-full sm:w-auto mt-0">
              বাতিল
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
            >
              {deleteMutation.isPending
                ? "ডিলিট হচ্ছে..."
                : "হ্যাঁ, ডিলিট করুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PricingDashboard;
