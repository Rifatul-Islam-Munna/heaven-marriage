// components/UserNav.tsx
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import Link from "next/link";
import {
  User,
  Settings,
  LogOut,
  Heart,
  HeartCrack,
  ShoppingBag,
  Flag,
  Trash2,
  Edit,
  LayoutDashboard,
} from "lucide-react";
import { logOutUser } from "@/actions/auth";
import { useUser } from "@/lib/useUser";
import { useRouter } from "next/navigation";
import { User as UserType, UserInfo } from "@/@types/user";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { currentBiodataStage, biodataStageLabels, deletionStatusLabels, profileCompletion as completionPercentage, type DeletionRequest } from "@/lib/biodata-status";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";

export function UserNav({ user }: { user: UserInfo | null }) {
  const { refetch } = useUser();
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const queryClient = useQueryClient();

  const { data: users, refetch: refreshProfile } = useQueryWrapper<UserType>(
    ["get-my-profile-for-success"],
    "/user/get-my-profile",
  );
  const { data: deletionRequest, refetch: refreshDeletion } = useQueryWrapper<DeletionRequest | null>(
    ["biodata-deletion-request"], "/platform/deletion-request",
    { enabled: user?.role === "user", staleTime: 15000 },
  );
  const awaitingDeletion = deletionRequest?.status === "pending" ||
    deletionRequest?.status === "contacted";

  // Backend dynamic-question completion is the only source of truth.
  // Never inflate 55% to 100%, and never nudge submitted members to start again.
  const profileCompletion=completionPercentage(users);
  const biodataStage = currentBiodataStage(users);
  const isProfileIncomplete = profileCompletion < 100 && biodataStage === "draft";

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  const { mutate: requestDeletion, isPending: isDeleting } = useCommonMutationApi({
    method: "POST",
    url: "/platform/deletion-request",
    mutationKey: ["request-biodata-deletion"],
    successMessage: "বায়োডাটা মুছে ফেলার অনুরোধ অ্যাডমিনের কাছে পাঠানো হয়েছে।",
    onSuccess: () => {
      setShowDeleteDialog(false);
      setDeletionReason("");
      void refreshDeletion();
      void refreshProfile();
      void queryClient.invalidateQueries({ queryKey: ["platform-summary"] });
    },
  });

  const handellogout = async () => {
    const res = await logOutUser();
    if (res) {
      /*    await refetch();
      router.refresh(); */
      window.location.href = "/";
    }
  };

  const handleDeleteAccount = () => {
    if (isDeleting || awaitingDeletion || biodataStage === "deleted") return;
    requestDeletion({ message: deletionReason.trim() });
  };

  const isAdmin = user?.role === "admin";
  const isStaff = ["admin","seo","blog","manager"].includes(user?.role||"");
  const hasStaffSettings = isAdmin ||
    (user?.role === "manager" && user?.dashboardPermissions?.includes("settings"));
  const url = isStaff ? "/dashboard" : "/profile";
  const settings = hasStaffSettings ? "/dashboard/settings" : "/profile/settings";
  const avatarSrc = user?.gender === "male"
    ? "/male.png"
    : user?.gender === "female"
      ? "/female.png"
      : undefined;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarSrc} alt={user?.name || "User"} />
              <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72" align="center">
          {/* Profile Completion Status - Only for non-admin users */}
          {!isStaff && (
            <>
              <div className="flex flex-col items-center space-y-3 p-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarSrc} alt={user?.name || "User"} />
                  <AvatarFallback className="text-xl">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="text-center">
                  <p className="text-base font-heading font-semibold">
                    বায়োডাটার অবস্থা
                  </p>
                  <Badge
                    variant={isProfileIncomplete ? "destructive" : "default"}
                    className={cn("mt-2", {
                      "bg-blue-500 hover:bg-blue-600": !isProfileIncomplete,
                    })}
                  >
                    {biodataStageLabels[biodataStage]} ({profileCompletion}%)
                  </Badge>
                </div>

                {isProfileIncomplete && (
                  <Button
                    asChild
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Link href="/profile/my-profile">
                      বায়োডাটা সম্পূর্ণ করুন
                    </Link>
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          {/* User Info - Only show for admin */}
          {isAdmin && (
            <>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-heading font-medium leading-none">
                    {user?.name || "ব্যবহারকারী"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuGroup>
            {/* Dashboard */}
            <DropdownMenuItem asChild className="py-3 cursor-pointer">
              <Link href={url}>
                <LayoutDashboard className="mr-3 h-5 w-5" />
                <span className="font-heading text-base">ড্যাশবোর্ড</span>
              </Link>
            </DropdownMenuItem>

            {/* Edit Biodata - Only for non-admin */}
            {!isStaff && (
              <DropdownMenuItem asChild className="py-3 cursor-pointer">
                <Link href="/profile/my-profile">
                  <Edit className="mr-3 h-5 w-5" />
                  <span className="font-heading text-base">
                    বায়োডাটা এডিট করুন
                  </span>
                </Link>
              </DropdownMenuItem>
            )}

            {/* Shortlist - Only for non-admin */}
            {!isStaff && (
              <DropdownMenuItem asChild className="py-3 cursor-pointer">
                <Link href="/profile/short-list">
                  <Heart className="mr-3 h-5 w-5" />
                  <span className="font-heading text-base">পছন্দের তালিকা</span>
                </Link>
              </DropdownMenuItem>
            )}

            {/* My Purchases - Only for non-admin */}
            {!isStaff && (
              <DropdownMenuItem asChild className="py-3 cursor-pointer">
                <Link href="/profile/numbers">
                  <ShoppingBag className="mr-3 h-5 w-5" />
                  <span className="font-heading text-base">আমার ক্রয়সমূহ</span>
                </Link>
              </DropdownMenuItem>
            )}

            {/* Settings */}
            <DropdownMenuItem asChild className="py-3 cursor-pointer">
              <Link href={settings}>
                <Settings className="mr-3 h-5 w-5" />
                <span className="font-heading text-base">সেটিংস</span>
              </Link>
            </DropdownMenuItem>

            {/* A request is non-destructive until an administrator approves it. */}
            {!isStaff && (awaitingDeletion || biodataStage === "deleted" ? (
              <DropdownMenuItem asChild className="cursor-pointer py-3 text-orange-700">
                <Link href="/profile#deletion-request">
                  <Trash2 className="mr-3 h-5 w-5" />
                  <span className="font-heading text-sm">মুছে ফেলার অনুরোধের অবস্থা দেখুন</span>
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="cursor-pointer py-3 text-orange-700 focus:text-orange-700"
                onSelect={(event) => { event.preventDefault(); setShowDeleteDialog(true); }}
              >
                <Trash2 className="mr-3 h-5 w-5" />
                <span className="font-heading text-sm">Request Biodata Deletion</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Logout */}
          <DropdownMenuItem
            onClick={handellogout}
            className="py-3 cursor-pointer text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-3 h-5 w-5" />
            <span className="font-heading text-base">লগ আউট</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-xl">
              বায়োডাটা মুছে ফেলার অনুরোধ পাঠাবেন?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-heading text-sm leading-6">
              এটি শুধু একটি অনুরোধ। অ্যাডমিন Approve না করা পর্যন্ত বায়োডাটা মুছে যাবে না। Reject হলে সব তথ্য আগের মতোই থাকবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label htmlFor="navbar-deletion-reason" className="text-sm font-semibold text-gray-800">কারণ (ঐচ্ছিক)</label>
          <textarea id="navbar-deletion-reason" value={deletionReason}
            onChange={(event) => setDeletionReason(event.target.value)}
            maxLength={1000} rows={3} placeholder="আপনি কেন বায়োডাটা মুছে ফেলতে চান?"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-pink-500" />
          <AlertDialogFooter>
            <AlertDialogCancel className="font-heading">না</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => { event.preventDefault(); handleDeleteAccount(); }}
              className="bg-orange-600 hover:bg-orange-700 font-heading"
              disabled={isDeleting}
            >
              {isDeleting ? "অনুরোধ পাঠানো হচ্ছে..." : "অনুরোধ পাঠান"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
