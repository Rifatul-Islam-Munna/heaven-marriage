"use client";
import { useUser } from "@/lib/useUser";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Shield,
} from "lucide-react";
import { UserType } from "@/@types/user";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const handleEdit = () => {
    router.push("/profile/my-profile");
  };

  const handleVisitProfile = () => {
    console.log("Visit profile");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
                আপনার সম্পর্কে তথ্য
              </h1>
              <p className="text-sm text-gray-600">
                আপনার ব্যক্তিগত তথ্য এবং প্রোফাইল বিবরণ
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
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
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                <Eye className="w-4 h-4 mr-2" />
                আমার প্রোফাইল দেখুন
              </Button>
            </div>
          </div>
        </div>

        {/* Main Profile Card */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader className="border-b border-gray-200 bg-gray-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-pink-600" />
                </div>
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

          <CardContent className="p-6">
            {/* Grid Layout for Profile Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      নাম
                    </p>
                    <p className="text-lg font-semibold text-gray-900 break-words">
                      {user?.name || "তথ্য নেই"}
                    </p>
                  </div>
                </div>
              </div>

              {/* User ID */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <IdCard className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      ব্যবহারকারী আইডি
                    </p>
                    <p className="text-lg font-semibold text-gray-900 break-words">
                      {user?.userId || "তথ্য নেই"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      ইমেইল
                    </p>
                    <p className="text-lg font-semibold text-gray-900 break-all">
                      {user?.email || "তথ্য নেই"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Phone Number */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      ফোন নম্বর
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {user?.phoneNumber || "তথ্য নেই"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Role */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      ভূমিকা
                    </p>
                    <Badge
                      variant="secondary"
                      className="text-base font-semibold"
                    >
                      {user?.role || "তথ্য নেই"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Account ID */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <IdCard className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      অ্যাকাউন্ট আইডি
                    </p>
                    <p className="text-lg font-semibold text-gray-900 break-all font-mono text-sm">
                      {user?.userId || "তথ্য নেই"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info Card */}
        <Card className="border border-gray-200 bg-white mt-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  প্রোফাইল সম্পূর্ণ করুন
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  আপনার প্রোফাইল সম্পূর্ণ এবং সঠিক তথ্য প্রদান করুন যাতে আরও
                  ভালো ম্যাচ পেতে পারেন। সম্পূর্ণ প্রোফাইল আপনার সাফল্যের
                  সম্ভাবনা বৃদ্ধি করে।
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default User;
