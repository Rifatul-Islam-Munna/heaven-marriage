"use client";

import LoginWithGoogle from "./GoogleLogin";
import AuthDivider from "./AuthDivider";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Heart } from "lucide-react";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { useRouter } from "next/navigation";
import Image from "next/image";
export default function SignUp() {
  const router = useRouter();
  const [mode,setMode]=useState<"phone"|"email">("phone");
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    password: "",
    gender: "",
  });

  const { mutate, isPending } = useCommonMutationApi({
    url: "/user",
    method: "POST",
    successMessage: mode === "email" ? "আপনার ইমেইলে OTP পাঠানো হয়েছে" : "আপনার মোবাইল নম্বরে OTP পাঠানো হয়েছে",
    mutationKey: ["user-created"],
    onSuccess: (data) => {
      sessionStorage.setItem("niqaha_challenge",data.challengeId);
      sessionStorage.setItem("niqaha_registration_method",mode);
      router.push("/otp");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({...formData,phoneNumber:mode==="phone"?formData.phoneNumber:undefined,email:mode==="email"?formData.email:undefined});

  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleGenderChange = (value: string) => {
    setFormData({
      ...formData,
      gender: value,
    });
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 px-3 py-6 sm:items-center sm:p-4">
      <Card className="w-full max-w-md border-pink-200">
        <CardHeader className="space-y-2 px-5 pb-2 text-center sm:space-y-3 sm:px-6">
          <div className="mx-auto flex size-12 items-center justify-center sm:size-16">
            <Image src={"/logo.png"} width={64} height={64} alt="logo" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent sm:text-3xl">
            অ্যাকাউন্ট তৈরি করুন
          </CardTitle>
          <CardDescription className="text-sm text-gray-600 sm:text-base">
            আপনার নিখুঁত জীবনসঙ্গী খুঁজে পেতে হালাল যাত্রা শুরু করুন
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 sm:px-6">
          <div className="space-y-2">
            <p className="text-center text-sm font-medium text-gray-700">
              সবচেয়ে সহজ: Google দিয়ে এক ক্লিকে অ্যাকাউন্ট খুলুন
            </p>
            <LoginWithGoogle signup />
          </div>
          <AuthDivider label="অথবা মোবাইল / ইমেইল দিয়ে" />
          <div role="radiogroup" aria-label="যাচাইয়ের মাধ্যম" className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-pink-50 p-1">
            {([["phone", "মোবাইল OTP"], ["email", "ইমেইল OTP"]] as const).map(([value, label]) => (
              <button key={value} type="button" role="radio" aria-checked={mode === value} onClick={() => setMode(value)}
                className={`h-10 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-pink-600 ${mode === value ? "bg-white text-pink-700 shadow-sm" : "text-gray-600 hover:text-pink-700"}`}>
                {label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 font-medium">
                পুরো নাম
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="আপনার পুরো নাম লিখুন"
                value={formData.name}
                onChange={handleChange}
                required
                className="border-pink-200 focus:border-pink-500 focus:ring-pink-500 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="phoneNumber"
                className="text-gray-700 font-medium"
              >
                {mode==="email"?"ইমেইল":"মোবাইল (+country code)"}
              </Label>
              <Input
                id="phoneNumber"
                name={mode==="email"?"email":"phoneNumber"}
                type={mode==="email"?"email":"tel"}
                placeholder={mode==="email"?"name@example.com":"+8801712345678"}
                value={mode==="email"?formData.email:formData.phoneNumber}
                onChange={handleChange}
                required
                className="border-pink-200 focus:border-pink-500 focus:ring-pink-500 h-11"
              />
            </div>

            {/* Gender Field */}
            <div className="space-y-3">
              <Label className="text-gray-700 font-medium">লিঙ্গ</Label>
              <RadioGroup
                value={formData.gender}
                onValueChange={handleGenderChange}
                required
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="male"
                    id="male"
                    className="border-pink-300 text-pink-600"
                  />
                  <Label htmlFor="male" className="cursor-pointer font-normal">
                    পুরুষ
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="female"
                    id="female"
                    className="border-pink-300 text-pink-600"
                  />
                  <Label
                    htmlFor="female"
                    className="cursor-pointer font-normal"
                  >
                    মহিলা
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                পাসওয়ার্ড
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                placeholder="একটি শক্তিশালী পাসওয়ার্ড তৈরি করুন"
                value={formData.password}
                onChange={handleChange}
                required
                className="border-pink-200 focus:border-pink-500 focus:ring-pink-500 h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={isPending}
            >
              {isPending ? "সাইন আপ হচ্ছে..." : "সাইন আপ করুন"}
            </Button>

            <p className="text-center text-sm text-gray-600 pt-2">
              ইতিমধ্যে একটি অ্যাকাউন্ট আছে?{" "}
              <a
                href="/login"
                className="text-pink-600 hover:text-pink-700 font-semibold hover:underline"
              >
                লগইন করুন
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
