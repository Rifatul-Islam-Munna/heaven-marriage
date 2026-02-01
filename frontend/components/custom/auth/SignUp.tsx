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
import { Heart } from "lucide-react";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    password: "",
  });
  const { mutate, isPending } = useCommonMutationApi({
    url: "/user",
    method: "POST",
    successMessage: "user created successfully",
    mutationKey: ["user-created"],
    onSuccess: () => {
      router.push("/login");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(formData);
    console.log("Signup Data:", formData);
    // Handle signup logic here
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 p-4">
      <Card className="w-full max-w-md  border-pink-200">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
            <Heart className="w-8 h-8 text-white fill-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
            Create Account
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            Begin your halal journey to find your perfect match
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 font-medium">
                Full Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
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
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                placeholder="+880 1XXX-XXXXXX"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                className="border-pink-200 focus:border-pink-500 focus:ring-pink-500 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Create a strong password"
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
              {isPending ? "Sign Up..." : "Sign Up"}
            </Button>

            <p className="text-center text-sm text-gray-600 pt-2">
              Already have an account?{" "}
              <a
                href="/login"
                className="text-pink-600 hover:text-pink-700 font-semibold hover:underline"
              >
                Sign In
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
