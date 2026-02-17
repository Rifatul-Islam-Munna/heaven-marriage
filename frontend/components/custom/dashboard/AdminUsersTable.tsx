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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Mail,
  Phone,
  User as UserIcon,
  Check,
  X,
  Edit,
  Users,
} from "lucide-react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "use-debounce";
import { Card, CardContent } from "@/components/ui/card";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { useRouter } from "next/navigation";
import { parseAsInteger, useQueryState } from "nuqs";
interface User {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  maritalStatus: string;
  isSubscriber: boolean;
  isOtpVerified: boolean;
  numberOfConnections: number;
  isPublished?: boolean;
  isPublishFromAdmin?: boolean;
  userId: string;
}

interface PaginatedUsersResponse {
  data: User[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function AdminUsersTable() {
  const queryClient = useQueryClient();

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [searchQuery, setSearchQuery] = useState("");
  const [gender, setGender] = useState("all");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [text] = useDebounce(searchQuery, 1000);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(
    null,
  );
  const [connectionValue, setConnectionValue] = useState<string>("");
  const router = useRouter();

  // Fetch users
  const { data, isLoading, error } = useQueryWrapper<PaginatedUsersResponse>(
    ["admin-users", page, text, gender],
    `/user/get-all-user-for-admin?page=${page}&query=${text}&gender=${gender}`,
  );

  // Delete user mutation
  const deleteMutation = useCommonMutationApi({
    method: "DELETE",
    url: `/user/delete-user-admin`,
    successMessage: "ব্যবহারকারী মুছে ফেলা হয়েছে",
    onSuccess: () =>
      queryClient.refetchQueries({ queryKey: ["admin-users"], exact: false }),
  });

  // Toggle subscriber mutation
  const toggleSubscriberMutation = useCommonMutationApi({
    method: "PATCH",
    url: `/user/update-user-subscriber`,
    successMessage: "সাবস্ক্রাইবার স্ট্যাটাস আপডেট করা হয়েছে",
    onSuccess: () =>
      queryClient.refetchQueries({ queryKey: ["admin-users"], exact: false }),
  });

  // Update connections mutation
  const updateConnectionsMutation = useCommonMutationApi({
    method: "PATCH",
    url: `/user/update-user-admin`,
    successMessage: "সংযোগ সংখ্যা আপডেট করা হয়েছে",
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["admin-users"], exact: false });
      setEditingConnectionId(null);
      setConnectionValue("");
    },
  });

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleGenderFilter = (value: string) => {
    setGender(value);
    setPage(1);
  };

  const startEditingConnections = (userId: string, currentValue: number) => {
    setEditingConnectionId(userId);
    setConnectionValue(currentValue.toString());
  };

  const cancelEditingConnections = () => {
    setEditingConnectionId(null);
    setConnectionValue("");
  };

  const saveConnections = (userId: string) => {
    const numValue = parseInt(connectionValue);
    if (isNaN(numValue) || numValue < 0) {
      toast.error("অনুগ্রহ করে সঠিক সংখ্যা লিখুন");
      return;
    }
    updateConnectionsMutation.mutate({
      id: userId,
      numberOfConnections: numValue,
    });
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4 container mx-auto px-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-full sm:w-40" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-red-500 font-heading">ডেটা লোড করতে সমস্যা হয়েছে</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          আবার চেষ্টা করুন
        </Button>
      </div>
    );
  }

  const users = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6 container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-heading font-bold">
          ব্যবহারকারী তালিকা
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground ">
          মোট {data?.totalItems?.toLocaleString() ?? 0} জন ব্যবহারকারী
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="নাম, ইমেইল, ফোন বা আইডি দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={gender} onValueChange={handleGenderFilter}>
          <SelectTrigger className="w-full sm:w-40 font-heading">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল</SelectItem>
            <SelectItem value="male">পুরুষ</SelectItem>
            <SelectItem value="female">মহিলা</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-pink-50">
              <TableHead className="font-heading font-semibold">আইডি</TableHead>
              <TableHead className="font-heading font-semibold">নাম</TableHead>
              <TableHead className="font-heading font-semibold">
                ইমেইল
              </TableHead>
              <TableHead className="font-heading font-semibold">ফোন</TableHead>
              <TableHead className="font-heading font-semibold">
                বৈবাহিক অবস্থা
              </TableHead>
              <TableHead className="font-heading font-semibold text-center">
                সংযোগ
              </TableHead>
              <TableHead className="font-heading font-semibold text-center">
                OTP যাচাই
              </TableHead>
              <TableHead className="font-heading font-semibold text-center">
                প্রকাশিত
              </TableHead>
              <TableHead className="font-heading font-semibold text-center">
                সাবস্ক্রাইবার
              </TableHead>
              <TableHead className="font-heading font-semibold text-right">
                অ্যাকশন
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <p className="text-muted-foreground font-heading">
                    কোন ব্যবহারকারী পাওয়া যায়নি
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id} className="hover:bg-pink-50/50">
                  <TableCell className="font-medium">{user?.userId}</TableCell>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user?.email}</TableCell>
                  <TableCell>{user?.phoneNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {user?.maritalStatus ?? "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {editingConnectionId === user._id ? (
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          value={connectionValue}
                          onChange={(e) => setConnectionValue(e.target.value)}
                          className="w-16 h-8 text-center"
                          min="0"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-600 hover:text-green-700"
                          onClick={() => saveConnections(user._id)}
                          disabled={updateConnectionsMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={cancelEditingConnections}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Badge variant="secondary" className="font-semibold">
                          {user?.numberOfConnections}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() =>
                            startEditingConnections(
                              user._id,
                              user.numberOfConnections,
                            )
                          }
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {user.isOtpVerified ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {user.isPublishFromAdmin ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant={user.isSubscriber ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        toggleSubscriberMutation.mutate({
                          id: user._id,
                        })
                      }
                      disabled={toggleSubscriberMutation.isPending}
                      className={
                        user.isSubscriber
                          ? "bg-green-600 hover:bg-green-700"
                          : ""
                      }
                    >
                      {user.isSubscriber ? "সক্রিয়" : "নিষ্ক্রিয়"}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        router.push(`/dashboard/edit-profile/${user._id}`)
                      }
                      className="text-green-600 hover:text-green-700 hover:bg-red-50"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteUserId(user._id)}
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
        {users.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground font-heading">
                কোন ব্যবহারকারী পাওয়া যায়নি
              </p>
            </CardContent>
          </Card>
        ) : (
          users.map((user) => (
            <Card key={user._id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                {/* Name and Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <UserIcon className="h-5 w-5 text-pink-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading font-semibold text-base truncate">
                        {user.name}
                      </h3>
                      <Badge variant="outline" className="text-xs mt-1">
                        {user.maritalStatus}
                      </Badge>
                    </div>
                  </div>
                  {user.isOtpVerified ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  )}
                </div>

                {/* Contact Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{user.phoneNumber}</span>
                  </div>
                </div>

                {/* Connections */}
                <div className="flex items-center justify-between p-2 bg-pink-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-pink-600" />
                    <span className="text-sm font-heading font-semibold">
                      সংযোগ:
                    </span>
                  </div>
                  {editingConnectionId === user._id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={connectionValue}
                        onChange={(e) => setConnectionValue(e.target.value)}
                        className="w-16 h-8 text-center"
                        min="0"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-600"
                        onClick={() => saveConnections(user._id)}
                        disabled={updateConnectionsMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-600"
                        onClick={cancelEditingConnections}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-semibold">
                        {user.numberOfConnections}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() =>
                          startEditingConnections(
                            user._id,
                            user.numberOfConnections,
                          )
                        }
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant={user.isSubscriber ? "default" : "outline"}
                    size="sm"
                    className={`flex-1 ${
                      user.isSubscriber ? "bg-green-600 hover:bg-green-700" : ""
                    }`}
                    onClick={() =>
                      toggleSubscriberMutation.mutate({
                        userId: user._id,
                        value: !user.isSubscriber,
                      })
                    }
                    disabled={toggleSubscriberMutation.isPending}
                  >
                    {user.isSubscriber ? "সক্রিয়" : "নিষ্ক্রিয়"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      router.push(`/dashboard/edit-profile/${user._id}`)
                    }
                    className="text-green-600 hover:text-green-700 hover:bg-red-50"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteUserId(user._id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-4">
          {/* Page Info */}
          <div className="text-sm text-center text-muted-foreground font-heading">
            মোট {data?.totalItems?.toLocaleString("bn-BD")} টির মধ্যে{" "}
            {(((data?.page ?? 1) - 1) * 10 + 1).toLocaleString("bn-BD")} -{" "}
            {Math.min(
              (data?.page ?? 1) * 10,
              data?.totalItems ?? 0,
            ).toLocaleString("bn-BD")}{" "}
            দেখানো হচ্ছে (পেজ {data?.page?.toLocaleString("bn-BD")}/
            {totalPages?.toLocaleString("bn-BD")})
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={!data?.hasPreviousPage || isLoading}
              className="h-9 px-3"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">পূর্ববর্তী</span>
            </Button>

            {/* Page Numbers - Responsive */}
            <div className="flex items-center gap-1">
              {Array.from(
                {
                  length: Math.min(
                    totalPages <= 5 ? totalPages : 3,
                    totalPages,
                  ),
                },
                (_, i) => {
                  let pageNum;
                  if (totalPages <= 3) {
                    pageNum = i + 1;
                  } else if (page <= 2) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 1) {
                    pageNum = totalPages - 2 + i;
                  } else {
                    pageNum = page - 1 + i;
                  }

                  return (
                    <Button
                      key={i}
                      variant={page === pageNum ? "default" : "outline"}
                      size="icon"
                      onClick={() => setPage(pageNum)}
                      className="h-9 w-9 text-sm"
                    >
                      {pageNum}
                    </Button>
                  );
                },
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!data?.hasNextPage || isLoading}
              className="h-9 px-3"
            >
              <span className="hidden sm:inline">পরবর্তী</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteUserId}
        onOpenChange={() => setDeleteUserId(null)}
      >
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-lg">
              ব্যবহারকারী মুছে ফেলবেন?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-heading text-sm">
              এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না। এটি স্থায়ীভাবে
              ব্যবহারকারীর ডেটা মুছে দেবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="font-heading w-full sm:w-auto">
              বাতিল
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteUserId && deleteMutation.mutate({ id: deleteUserId })
              }
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 font-heading w-full sm:w-auto"
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
