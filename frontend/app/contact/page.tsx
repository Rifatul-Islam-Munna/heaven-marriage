"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, User, MessageSquare, Send, MapPin } from "lucide-react";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { toast } from "sonner";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    description: "",
  });

  // Submit contact mutation
  const contactMutation = useCommonMutationApi({
    method: "POST",
    url: "/contact",
    successMessage: "আপনার বার্তা সফলভাবে পাঠানো হয়েছে",
    onSuccess: () => {
      setFormData({ name: "", email: "", mobile: "", description: "" });
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.mobile.trim() ||
      !formData.description.trim()
    ) {
      toast.error("সকল ফিল্ড পূরণ করুন");
      return;
    }

    if (formData.mobile.length < 11) {
      toast.error("সঠিক মোবাইল নম্বর দিন");
      return;
    }

    contactMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-white py-12 sm:py-16 px-4">
      <div className="container max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
            যোগাযোগ করুন
          </h1>
          <div className="w-24 h-1 bg-pink-600 mx-auto rounded-full mb-6"></div>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
            আমরা আপনার সেবায় সর্বদা প্রস্তুত। যেকোনো প্রশ্ন বা সহায়তার জন্য
            আমাদের সাথে যোগাযোগ করুন
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 sm:gap-12">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border shadow-none border-gray-50">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">
                  যোগাযোগের তথ্য
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                      ইমেইল
                    </h3>
                    <a
                      href="mailto:info@heavenmarriage.com"
                      className="text-sm text-gray-600 hover:text-pink-600 transition-colors"
                    >
                      info@heavenmarriage.com
                    </a>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="h-6 w-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                      ফোন
                    </h3>
                    <a
                      href="tel:+8801712345678"
                      className="text-sm text-gray-600 hover:text-pink-600 transition-colors"
                    >
                      +880 1712-345678
                    </a>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                      ঠিকানা
                    </h3>
                    <p className="text-sm text-gray-600">ঢাকা, বাংলাদেশ</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Office Hours */}
            <Card className="border shadow-none border-gray-50">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">
                  অফিস সময়
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">শনি - শুক্র </span>
                  <span className="font-semibold text-gray-900">
                    ০৯:০০ - ২১:০০
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">সোমবার </span>
                  <span className="font-semibold text-gray-900">বন্ধ</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="border shadow-none border-gray-50">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  আমাদের লিখুন
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  নিচের ফর্মটি পূরণ করুন। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-sm font-semibold text-gray-900"
                    >
                      আপনার নাম <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="আপনার পূর্ণ নাম লিখুন"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        maxLength={100}
                        className="pl-10 h-12 border-2 border-gray-200 focus:border-pink-500 focus:ring-0"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-semibold text-gray-900"
                    >
                      ইমেইল <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="example@email.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="pl-10 h-12 border-2 border-gray-200 focus:border-pink-500 focus:ring-0"
                      />
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="mobile"
                      className="text-sm font-semibold text-gray-900"
                    >
                      মোবাইল নম্বর <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="mobile"
                        name="mobile"
                        type="tel"
                        placeholder="01712345678"
                        value={formData.mobile}
                        onChange={handleChange}
                        required
                        maxLength={15}
                        className="pl-10 h-12 border-2 border-gray-200 focus:border-pink-500 focus:ring-0"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-sm font-semibold text-gray-900"
                    >
                      বার্তা <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="আপনার বার্তা লিখুন..."
                        value={formData.description}
                        onChange={handleChange}
                        required
                        maxLength={1000}
                        rows={6}
                        className="pl-10 pt-3 resize-none border-2 border-gray-200 focus:border-pink-500 focus:ring-0"
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-right">
                      {formData.description.length}/1000
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={contactMutation.isPending}
                    className="w-full h-12 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-base"
                  >
                    {contactMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        পাঠানো হচ্ছে...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        বার্তা পাঠান
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
