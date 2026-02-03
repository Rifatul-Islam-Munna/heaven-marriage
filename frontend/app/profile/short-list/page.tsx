"use client";
import { useUser } from "@/lib/useUser";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  User as UserIcon,
  Mail,
  Phone,
  IdCard,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { UserType } from "@/@types/user";

export interface UserInfo {
  _id: string;
  name: string;
  userId: string;
  role: UserType;
  email: string;
  phoneNumber: string;
  password: string;
  isOtpVerified: boolean;
}

const User = () => {
  const { user } = useUser();

  const handleEdit = () => {
    // Add edit functionality
    console.log("Edit profile");
  };

  const handleVisitProfile = () => {
    // Add visit profile functionality
    console.log("Visit profile");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with buttons */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            আপনার সম্পর্কে তথ্য
          </h1>
          <div className="flex gap-3">
            <Button
              onClick={handleEdit}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              সম্পাদনা করুন
            </Button>
            <Button
              onClick={handleVisitProfile}
              variant="outline"
              className="border-pink-300 text-pink-700 hover:bg-pink-50"
            >
              <Eye className="w-4 h-4 mr-2" />
              আমার প্রোফাইল দেখুন
            </Button>
          </div>
        </div>

        {/* Main Profile Card */}
        <Card className="shadow-lg border-t-4 border-t-pink-400">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl text-gray-800 flex items-center gap-2">
                <UserIcon className="w-6 h-6 text-pink-500" />
                প্রোফাইল তথ্য
              </CardTitle>
              {user?.isOtpVerified !== undefined && (
                <Badge
                  variant={user?.isOtpVerified ? "default" : "destructive"}
                  className={
                    user?.isOtpVerified
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-red-500"
                  }
                >
                  {user?.isOtpVerified ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      যাচাইকৃত
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      যাচাই করা হয়নি
                    </>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Name */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-6 h-6 text-pink-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">নাম</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {user?.name || "তথ্য নেই"}
                  </p>
                </div>
              </div>

              <Separator />

              {/* User ID */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                  <IdCard className="w-6 h-6 text-pink-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">ব্যবহারকারী আইডি</p>
                  <p className="text-lg font-medium text-gray-700">
                    {user?.userId || "তথ্য নেই"}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-pink-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">ইমেইল</p>
                  <p className="text-lg font-medium text-gray-700 break-all">
                    {user?.email || "তথ্য নেই"}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Phone Number */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-pink-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">ফোন নম্বর</p>
                  <p className="text-lg font-medium text-gray-700">
                    {user?.phoneNumber || "তথ্য নেই"}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Role */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-6 h-6 text-pink-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">ভূমিকা</p>
                  <Badge variant="secondary" className="text-base">
                    {user?.role || "তথ্য নেই"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info Card */}
        <Card className="mt-6 shadow-md border-l-4 border-l-pink-400">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 text-center">
              আপনার প্রোফাইল সম্পূর্ণ এবং সঠিক তথ্য প্রদান করুন যাতে আরও ভালো
              ম্যাচ পেতে পারেন
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default User;
