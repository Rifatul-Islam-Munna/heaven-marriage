"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Heart, Eye, EyeOff } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { loginUser } from "@/actions/auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/useUser";
import LoginWithGoogle from "./GoogleLogin";
import Image from "next/image";

export default function SignIn() {
  const { refetch } = useUser();
  const [formData, setFormData] = useState({
    phoneNumber: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const { mutate, isPending } = useMutation({
    mutationKey: ["login-user"],
    mutationFn: () => loginUser(formData.phoneNumber, formData.password),
    onSuccess: (data) => {
      if (data.data) {
        data?.data?.user?.role === "admin"
          ? router.push("/dashboard")
          : router.push("/profile");
        return toast.success("সফলভাবে লগইন হয়েছে");
      }
      return toast.error(data?.error?.message);
    },
    onError: (error) => {
      return toast.error(error?.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 p-4">
      <Card className="w-full max-w-md border-pink-200">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16  rounded-full flex items-center justify-center ">
            <Image src={"/logo.png"} width={64} height={64} alt="logo" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
            স্বাগতম
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            আপনার যাত্রা চালিয়ে যেতে লগইন করুন
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="phoneNumber"
                className="text-gray-700 font-medium"
              >
                মোবাইল নম্বর
              </Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                placeholder="০১৭১২৩৪৫৬৭৮"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                className="border-pink-200 focus:border-pink-500 focus:ring-pink-500 h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  পাসওয়ার্ড
                </Label>
                <a
                  href="/forgot-password"
                  className="text-sm text-pink-600 hover:text-pink-700 hover:underline"
                >
                  ভুলে গেছেন?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="আপনার পাসওয়ার্ড লিখুন"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="border-pink-200 focus:border-pink-500 focus:ring-pink-500 h-11 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>

            <div className="w-full mx-auto">
              <LoginWithGoogle />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={isPending}
            >
              {isPending ? "লগইন হচ্ছে..." : "লগইন করুন"}
            </Button>

            <p className="text-center text-sm text-gray-600 pt-2">
              অ্যাকাউন্ট নেই?{" "}
              <a
                href="/signup"
                className="text-pink-600 hover:text-pink-700 font-semibold hover:underline"
              >
                সাইন আপ করুন
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
