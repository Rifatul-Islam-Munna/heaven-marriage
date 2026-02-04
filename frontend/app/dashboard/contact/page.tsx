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
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Phone,
  User,
  Trash2,
  Eye,
  CheckCircle2,
  Circle,
  Inbox,
  MailOpen,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { useDebounce } from "use-debounce";

interface Contact {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  description: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedContactsResponse {
  data: Contact[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface ContactStats {
  total: number;
  read: number;
  unread: number;
}

export default function AdminContactDashboard() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "read" | "unread">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Debounce search
  const [debouncedSearch] = useDebounce(searchQuery, 1000);

  // Fetch contacts with pagination
  const { data, isLoading } = useQueryWrapper<PaginatedContactsResponse>(
    ["contacts", page, filter, debouncedSearch],
    `/contact?page=${page}&filter=${filter}&search=${debouncedSearch}`,
  );

  // Fetch stats
  const { data: stats } = useQueryWrapper<ContactStats>(
    ["contact-stats"],
    "/contact/stats",
  );

  // Mark as read mutation
  const markAsReadMutation = useCommonMutationApi({
    method: "PATCH",
    url: "/contact/mark-as-read",
    successMessage: "স্ট্যাটাস আপডেট হয়েছে",
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["contacts"], exact: false });
      queryClient.refetchQueries({ queryKey: ["contact-stats"], exact: false });
    },
  });

  // Delete contact mutation
  const deleteMutation = useCommonMutationApi({
    method: "DELETE",
    url: "/contact/delete",
    successMessage: "মেসেজ মুছে ফেলা হয়েছে",
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["contacts"], exact: false });
      queryClient.refetchQueries({ queryKey: ["contact-stats"], exact: false });
      setDeleteId(null);
    },
  });

  // Handle mark as read toggle
  const handleToggleRead = (contact: Contact) => {
    markAsReadMutation.mutate({
      id: contact._id,
      isRead: !contact.isRead,
    });
  };

  // Handle delete
  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  // Handle filter change
  const handleFilterChange = (value: string) => {
    setFilter(value as any);
    setPage(1); // Reset to first page
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1); // Reset to first page
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("bn-BD", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const contacts = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  // Loading skeleton
  if (isLoading && !data) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Inbox className="h-7 w-7 text-pink-600" />
            যোগাযোগ মেসেজ
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            মোট {stats?.total || 0} টি মেসেজ
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="নাম, ইমেইল বা মোবাইল নম্বর খুঁজুন..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 border-2"
            />
          </div>
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-full sm:w-48 border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল মেসেজ</SelectItem>
              <SelectItem value="unread">অপঠিত</SelectItem>
              <SelectItem value="read">পঠিত</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="border-2 border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">মোট মেসেজ</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.total || 0}
                </p>
              </div>
              <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
                <Inbox className="h-7 w-7 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 mb-1">অপঠিত</p>
                <p className="text-3xl font-bold text-blue-700">
                  {stats?.unread || 0}
                </p>
              </div>
              <div className="w-14 h-14 bg-blue-200 rounded-xl flex items-center justify-center">
                <Mail className="h-7 w-7 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 mb-1">পঠিত</p>
                <p className="text-3xl font-bold text-green-700">
                  {stats?.read || 0}
                </p>
              </div>
              <div className="w-14 h-14 bg-green-200 rounded-xl flex items-center justify-center">
                <MailOpen className="h-7 w-7 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border-2 border-gray-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold w-[5%]">স্ট্যাটাস</TableHead>
              <TableHead className="font-semibold w-[15%]">নাম</TableHead>
              <TableHead className="font-semibold w-[15%]">যোগাযোগ</TableHead>
              <TableHead className="font-semibold w-[30%]">মেসেজ</TableHead>
              <TableHead className="font-semibold w-[15%]">সময়</TableHead>
              <TableHead className="font-semibold text-right w-[20%]">
                অ্যাকশন
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {searchQuery
                      ? "কোন মেসেজ পাওয়া যায়নি"
                      : "এখনো কোন মেসেজ নেই"}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow
                  key={contact._id}
                  className={`hover:bg-gray-50 ${!contact.isRead ? "bg-blue-50/30" : ""}`}
                >
                  <TableCell>
                    {contact.isRead ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-blue-600" />
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {contact.name}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate max-w-[150px]">
                          {contact.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span>{contact.mobile}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {contact.description}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-gray-500">
                      {formatDate(contact.createdAt)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedContact(contact)}
                        className="border-2"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleRead(contact)}
                        disabled={markAsReadMutation.isPending}
                        className={`border-2 ${
                          contact.isRead
                            ? "border-gray-300"
                            : "border-blue-300 bg-blue-50"
                        }`}
                      >
                        {contact.isRead ? (
                          <Circle className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteId(contact._id)}
                        className="border-2 border-red-300 text-red-600 hover:bg-red-50"
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
        {contacts.length === 0 ? (
          <Card className="border-2">
            <CardContent className="py-12 text-center">
              <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">
                {searchQuery ? "কোন মেসেজ পাওয়া যায়নি" : "এখনো কোন মেসেজ নেই"}
              </p>
            </CardContent>
          </Card>
        ) : (
          contacts.map((contact) => (
            <Card
              key={contact._id}
              className={`border-2 ${!contact.isRead ? "border-blue-300 bg-blue-50/30" : "border-gray-200"}`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {contact.isRead ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    )}
                    <h3 className="text-base font-bold text-gray-900 truncate">
                      {contact.name}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  {formatDate(contact.createdAt)}
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{contact.mobile}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 border-t pt-3">
                  {contact.description}
                </p>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-2"
                    onClick={() => setSelectedContact(contact)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    দেখুন
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleRead(contact)}
                    disabled={markAsReadMutation.isPending}
                    className={`flex-1 border-2 ${
                      contact.isRead
                        ? "border-gray-300"
                        : "border-blue-300 bg-blue-50"
                    }`}
                  >
                    {contact.isRead ? (
                      <>
                        <Circle className="h-4 w-4 mr-2" />
                        অপঠিত
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2 text-blue-600" />
                        পঠিত
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteId(contact._id)}
                    className="border-2 border-red-300 text-red-600"
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t-2 pt-6">
          <div className="text-sm text-gray-600">
            পেজ {data?.page} / {totalPages} · {((data?.page ?? 1) - 1) * 10 + 1}{" "}
            - {Math.min((data?.page ?? 1) * 10, data?.totalItems ?? 0)} টি
            দেখানো হচ্ছে
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={!data?.hasPreviousPage || isLoading}
              className="h-9 px-3 border-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">পূর্ববর্তী</span>
            </Button>

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
                      className={`h-9 w-9 border-2 ${
                        page === pageNum ? "bg-pink-600 hover:bg-pink-700" : ""
                      }`}
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
              className="h-9 px-3 border-2"
            >
              <span className="hidden sm:inline">পরবর্তী</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* View Message Dialog */}
      <Dialog
        open={!!selectedContact}
        onOpenChange={() => setSelectedContact(null)}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              মেসেজ বিস্তারিত
            </DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">নাম</p>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selectedContact.name}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">
                    স্ট্যাটাস
                  </p>
                  <Badge
                    variant={selectedContact.isRead ? "default" : "secondary"}
                    className={
                      selectedContact.isRead ? "bg-green-600" : "bg-blue-600"
                    }
                  >
                    {selectedContact.isRead ? "পঠিত" : "অপঠিত"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900">ইমেইল</p>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {selectedContact.email}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900">মোবাইল</p>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {selectedContact.mobile}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900">মেসেজ</p>
                <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedContact.description}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900">সময়</p>
                <p className="text-sm text-gray-600">
                  {formatDate(selectedContact.createdAt)}
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleToggleRead(selectedContact)}
                  disabled={markAsReadMutation.isPending}
                  className="flex-1 border-2"
                >
                  {selectedContact.isRead
                    ? "অপঠিত হিসেবে চিহ্নিত করুন"
                    : "পঠিত হিসেবে চিহ্নিত করুন"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteId(selectedContact._id);
                    setSelectedContact(null);
                  }}
                  className="border-2 border-red-300 text-red-600 hover:bg-red-50"
                >
                  মুছে ফেলুন
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">
              মেসেজ মুছে ফেলবেন?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না। এটি স্থায়ীভাবে মেসেজ মুছে
              দেবে।
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
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  মুছছে...
                </div>
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
