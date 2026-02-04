"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Key, AlertCircle, Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";

interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

const Setting = () => {
  const [passwordData, setPasswordData] = useState<ChangePasswordData>({
    oldPassword: "",
    newPassword: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");

  // State for password visibility
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const changePasswordMutation = useCommonMutationApi({
    mutationKey: ["change-password"],
    method: "PATCH",
    url: "/user/update-user-password",
    successMessage: "পাসওয়ার্ড পরিবর্তন করা হয়েছে",
  });

  // Handle password change
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.oldPassword || !passwordData.newPassword) {
      toast.error("ত্রুটি", {
        description: "সকল ফিল্ড পূরণ করুন",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("ত্রুটি", {
        description: "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে",
      });
      return;
    }

    if (passwordData.newPassword !== confirmPassword) {
      toast.error("ত্রুটি", {
        description: "নতুন পাসওয়ার্ড এবং নিশ্চিত পাসওয়ার্ড মিলছে না",
      });
      return;
    }

    changePasswordMutation.mutate(passwordData);
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold mb-2">সেটিংস</h1>
        <p className="text-muted-foreground font-heading">
          আপনার পাসওয়ার্ড পরিবর্তন করুন
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <Key className="h-5 w-5" />
            পাসওয়ার্ড পরিবর্তন
          </CardTitle>
          <CardDescription className="font-heading">
            আপনার অ্যাকাউন্টের পাসওয়ার্ড পরিবর্তন করুন
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-heading">
              নিরাপত্তার জন্য, একটি শক্তিশালী পাসওয়ার্ড ব্যবহার করুন যা কমপক্ষে
              ৬ অক্ষরের হতে হবে।
            </AlertDescription>
          </Alert>

          <form onSubmit={handleChangePassword} className="space-y-6">
            {/* Old Password */}
            <div className="space-y-2">
              <Label htmlFor="oldPassword" className="font-heading">
                পুরাতন পাসওয়ার্ড <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="oldPassword"
                  type={showOldPassword ? "text" : "password"}
                  placeholder="পুরাতন পাসওয়ার্ড লিখুন"
                  value={passwordData.oldPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      oldPassword: e.target.value,
                    })
                  }
                  className=" pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                >
                  {showOldPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="font-heading">
                নতুন পাসওয়ার্ড <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="নতুন পাসওয়ার্ড লিখুন (কমপক্ষে ৬ অক্ষর)"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  className=" pr-10"
                  minLength={6}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-heading">
                পাসওয়ার্ড নিশ্চিত করুন <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="নতুন পাসওয়ার্ড পুনরায় লিখুন"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className=" pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPasswordData({ oldPassword: "", newPassword: "" });
                  setConfirmPassword("");
                }}
                className="font-heading"
              >
                বাতিল করুন
              </Button>
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="font-heading"
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    পরিবর্তন করা হচ্ছে...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    পাসওয়ার্ড পরিবর্তন করুন
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Setting;
