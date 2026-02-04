"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Video,
  Image as ImageIcon,
  Upload,
  Loader2,
  Home,
  Info,
  Monitor,
  Smartphone,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";

interface WebData {
  _id: string;
  home?: {
    heroVideo?: {
      bigScreen?: string;
      mobileScreen?: string;
    };
    images?: {
      left?: string;
      right?: string;
    };
  };
  about?: {
    images?: {
      left?: string;
      right?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export default function WebDataDashboard() {
  const queryClient = useQueryClient();
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Fetch web data
  const { data: webData, isLoading } = useQueryWrapper<WebData>(
    ["web-data"],
    "/web-data",
  );

  // Upload mutation - returns object with {data, error}
  const uploadMutation = useCommonMutationApi<any>({
    method: "POST",
    url: "/image/upload-image",
    successMessage: "আপলোড সফল হয়েছে",
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["web-data"], exact: false });
      setUploadingField(null);
    },
    onError: () => {
      setUploadingField(null);
    },
  });

  // Update web data mutation
  const updateMutation = useCommonMutationApi({
    method: "PATCH",
    url: "/web-data",
    successMessage: "সফলভাবে আপডেট হয়েছে",
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["web-data"], exact: false });
    },
  });

  // Handle file upload - FIXED to handle {data, error} response
  const handleFileUpload = async (
    file: File,
    section: string,
    field: string,
  ) => {
    const fieldKey = `${section}-${field}`;
    setUploadingField(fieldKey);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Response is {data: "url", error: null}
      const uploadResponse = await uploadMutation.mutateAsync(formData);

      // Extract the actual URL from response.data
      const uploadedUrl = uploadResponse?.data || uploadResponse;

      console.log("Uploaded URL:", uploadedUrl);
      console.log("Current webData:", webData);

      // Update web data with new URL - PRESERVE EXISTING DATA
      const updateData: any = {};

      if (section === "home-heroVideo") {
        updateData.home = {
          heroVideo: {
            bigScreen: webData?.home?.heroVideo?.bigScreen || "",
            mobileScreen: webData?.home?.heroVideo?.mobileScreen || "",
            [field]: uploadedUrl || "",
          },
        };
      } else if (section === "home-images") {
        updateData.home = {
          images: {
            left: webData?.home?.images?.left || "",
            right: webData?.home?.images?.right || "",
            [field]: uploadedUrl || "",
          },
        };
      } else if (section === "about-images") {
        updateData.about = {
          images: {
            left: webData?.about?.images?.left || "",
            right: webData?.about?.images?.right || "",
            [field]: uploadedUrl || "",
          },
        };
      }

      console.log("Update payload:", updateData);

      const updateResult = await updateMutation.mutateAsync(updateData);
      console.log("Update response:", updateResult);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("আপলোড ব্যর্থ হয়েছে");
    }
  };

  // Trigger file input
  const triggerFileInput = (inputId: string) => {
    const input = document.getElementById(inputId);
    if (input) {
      input.click();
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ImageIcon className="h-7 w-7 text-pink-600" />
          ওয়েবসাইট ডাটা ম্যানেজমেন্ট
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          ছবি এবং ভিডিও আপলোড ও আপডেট করুন
        </p>
      </div>

      {/* Home Section */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="border-b-2 border-gray-100 bg-gray-50">
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Home className="h-6 w-6 text-pink-600" />
            হোম পেজ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          {/* Hero Videos */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Video className="h-5 w-5 text-pink-600" />
              হিরো ভিডিও
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Big Screen Video */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  ডেস্কটপ ভিডিও
                </Label>
                <div className="relative aspect-video bg-gray-100 border-2 border-gray-300 rounded-lg overflow-hidden group">
                  {webData?.home?.heroVideo?.bigScreen ? (
                    <>
                      <video
                        src={webData.home.heroVideo.bigScreen}
                        className="w-full h-full object-cover"
                        controls
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          onClick={() => triggerFileInput("bigScreen-video")}
                          disabled={
                            uploadingField === "home-heroVideo-bigScreen"
                          }
                          className="bg-pink-600 hover:bg-pink-700"
                        >
                          {uploadingField === "home-heroVideo-bigScreen" ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              আপলোড হচ্ছে...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              নতুন ভিডিও আপলোড করুন
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Video className="h-12 w-12 text-gray-400 mb-3" />
                      <Button
                        onClick={() => triggerFileInput("bigScreen-video")}
                        disabled={uploadingField === "home-heroVideo-bigScreen"}
                        variant="outline"
                        className="border-2"
                      >
                        {uploadingField === "home-heroVideo-bigScreen" ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            আপলোড হচ্ছে...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            ভিডিও আপলোড করুন
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  <input
                    id="bigScreen-video"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file, "home-heroVideo", "bigScreen");
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              </div>

              {/* Mobile Screen Video */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  মোবাইল ভিডিও
                </Label>
                <div className="relative aspect-video bg-gray-100 border-2 border-gray-300 rounded-lg overflow-hidden group">
                  {webData?.home?.heroVideo?.mobileScreen ? (
                    <>
                      <video
                        src={webData.home.heroVideo.mobileScreen}
                        className="w-full h-full object-cover"
                        controls
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          onClick={() => triggerFileInput("mobileScreen-video")}
                          disabled={
                            uploadingField === "home-heroVideo-mobileScreen"
                          }
                          className="bg-pink-600 hover:bg-pink-700"
                        >
                          {uploadingField === "home-heroVideo-mobileScreen" ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              আপলোড হচ্ছে...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              নতুন ভিডিও আপলোড করুন
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Video className="h-12 w-12 text-gray-400 mb-3" />
                      <Button
                        onClick={() => triggerFileInput("mobileScreen-video")}
                        disabled={
                          uploadingField === "home-heroVideo-mobileScreen"
                        }
                        variant="outline"
                        className="border-2"
                      >
                        {uploadingField === "home-heroVideo-mobileScreen" ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            আপলোড হচ্ছে...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            ভিডিও আপলোড করুন
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  <input
                    id="mobileScreen-video"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(
                          file,
                          "home-heroVideo",
                          "mobileScreen",
                        );
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Home Images */}
          <div className="space-y-4 pt-6 border-t-2 border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-pink-600" />
              হোম পেজ ছবি
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Image */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  বাম পাশের ছবি
                </Label>
                <div className="relative aspect-square bg-gray-100 border-2 border-gray-300 rounded-lg overflow-hidden group">
                  {webData?.home?.images?.left ? (
                    <>
                      <img
                        src={webData.home.images.left}
                        alt="Home Left"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          onClick={() => triggerFileInput("home-left-image")}
                          disabled={uploadingField === "home-images-left"}
                          className="bg-pink-600 hover:bg-pink-700"
                        >
                          {uploadingField === "home-images-left" ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              আপলোড হচ্ছে...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              নতুন ছবি আপলোড করুন
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
                      <Button
                        onClick={() => triggerFileInput("home-left-image")}
                        disabled={uploadingField === "home-images-left"}
                        variant="outline"
                        className="border-2"
                      >
                        {uploadingField === "home-images-left" ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            আপলোড হচ্ছে...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            ছবি আপলোড করুন
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  <input
                    id="home-left-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file, "home-images", "left");
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              </div>

              {/* Right Image */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  ডান পাশের ছবি
                </Label>
                <div className="relative aspect-square bg-gray-100 border-2 border-gray-300 rounded-lg overflow-hidden group">
                  {webData?.home?.images?.right ? (
                    <>
                      <img
                        src={webData.home.images.right}
                        alt="Home Right"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          onClick={() => triggerFileInput("home-right-image")}
                          disabled={uploadingField === "home-images-right"}
                          className="bg-pink-600 hover:bg-pink-700"
                        >
                          {uploadingField === "home-images-right" ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              আপলোড হচ্ছে...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              নতুন ছবি আপলোড করুন
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
                      <Button
                        onClick={() => triggerFileInput("home-right-image")}
                        disabled={uploadingField === "home-images-right"}
                        variant="outline"
                        className="border-2"
                      >
                        {uploadingField === "home-images-right" ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            আপলোড হচ্ছে...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            ছবি আপলোড করুন
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  <input
                    id="home-right-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file, "home-images", "right");
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About Section */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="border-b-2 border-gray-100 bg-gray-50">
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Info className="h-6 w-6 text-pink-600" />
            আমাদের সম্পর্কে পেজ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-pink-600" />
              সম্পর্কে পেজ ছবি
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Image */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  বাম পাশের ছবি
                </Label>
                <div className="relative aspect-square bg-gray-100 border-2 border-gray-300 rounded-lg overflow-hidden group">
                  {webData?.about?.images?.left ? (
                    <>
                      <img
                        src={webData.about.images.left}
                        alt="About Left"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          onClick={() => triggerFileInput("about-left-image")}
                          disabled={uploadingField === "about-images-left"}
                          className="bg-pink-600 hover:bg-pink-700"
                        >
                          {uploadingField === "about-images-left" ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              আপলোড হচ্ছে...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              নতুন ছবি আপলোড করুন
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
                      <Button
                        onClick={() => triggerFileInput("about-left-image")}
                        disabled={uploadingField === "about-images-left"}
                        variant="outline"
                        className="border-2"
                      >
                        {uploadingField === "about-images-left" ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            আপলোড হচ্ছে...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            ছবি আপলোড করুন
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  <input
                    id="about-left-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file, "about-images", "left");
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              </div>

              {/* Right Image */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  ডান পাশের ছবি
                </Label>
                <div className="relative aspect-square bg-gray-100 border-2 border-gray-300 rounded-lg overflow-hidden group">
                  {webData?.about?.images?.right ? (
                    <>
                      <img
                        src={webData.about.images.right}
                        alt="About Right"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          onClick={() => triggerFileInput("about-right-image")}
                          disabled={uploadingField === "about-images-right"}
                          className="bg-pink-600 hover:bg-pink-700"
                        >
                          {uploadingField === "about-images-right" ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              আপলোড হচ্ছে...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              নতুন ছবি আপলোড করুন
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
                      <Button
                        onClick={() => triggerFileInput("about-right-image")}
                        disabled={uploadingField === "about-images-right"}
                        variant="outline"
                        className="border-2"
                      >
                        {uploadingField === "about-images-right" ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            আপলোড হচ্ছে...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            ছবি আপলোড করুন
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  <input
                    id="about-right-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file, "about-images", "right");
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
