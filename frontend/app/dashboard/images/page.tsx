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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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

type SignedMediaUpload = {
  putUrl: string;
  key: string;
  ticket: string;
  contentType: string;
  expiresIn: number;
};

function putDirectToRustFs(
  putUrl: string,
  file: File,
  contentType: string,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', putUrl);
    xhr.withCredentials = false;
    xhr.timeout = 20 * 60 * 1000;
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(100, Math.round(event.loaded / event.total * 100)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`RustFS rejected the upload (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error(
      'Cannot reach RustFS directly. Check RustFS CORS and storage availability.',
    ));
    xhr.ontimeout = () => reject(new Error('RustFS upload timed out. Retry with a smaller file.'));
    xhr.onabort = () => reject(new Error('RustFS upload was cancelled.'));
    xhr.send(file);
  });
}

export default function WebDataDashboard() {
  const queryClient = useQueryClient();
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Use normal API routes for both reading and writing; Server Actions post to
  // /dashboard/images and can be rejected by the hosting layer for large uploads.
  const { data: webData, isLoading, isError, error: loadError } = useQuery<WebData>({
    queryKey: ["web-data"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard-media", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || `Could not load website media (${response.status})`);
      return data as WebData;
    },
  });

  const saveWebData = async (updateData: Partial<WebData>) => {
    const response = await fetch("/api/dashboard-media", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(updateData),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.message || `Could not save media (${response.status})`);
  };

  // Upload through the authenticated media route, then save the returned URL.
  const handleFileUpload = async (
    file: File,
    section: string,
    field: string,
  ) => {
    if (uploadingField) return;
    const isVideo = section === 'home-heroVideo';
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const videoExtensions = new Set(['mp4','m4v','webm','mov','mkv','avi','wmv','flv','mpeg','mpg','m2v','3gp','3g2','ogv','ts','mts','m2ts']);
    const imageExtensions = new Set(['jpg','jpeg','jpe','jfif','png','apng','webp','avif','gif','ico','bmp','tif','tiff','heic','heif']);
    const typeMatches = isVideo ? file.type.startsWith('video/') : file.type.startsWith('image/');
    if (!(isVideo ? videoExtensions : imageExtensions).has(extension) && !typeMatches) {
      toast.error(isVideo ? 'Choose a supported video file' : 'Choose a supported image file');
      return;
    }
    const maxMB = isVideo ? 80 : 25;
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`File must be ${maxMB} MB or smaller`);
      return;
    }
    const fieldKey = `${section}-${field}`;
    setUploadingField(fieldKey);
    const loadingToast = toast.loading('Preparing secure RustFS upload...');
    setUploadProgress(0);

    try {
      // Only the file metadata and temporary upload authorization go through Next.
      const signedResponse = await fetch('/api/dashboard-media?action=presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name: file.name, type: file.type || 'application/octet-stream', size: file.size }),
      });
      const signed = await signedResponse.json().catch(() => null) as SignedMediaUpload & { message?: string } | null;
      if (!signedResponse.ok || !signed?.putUrl || !signed.key || !signed.ticket || !signed.contentType) {
        throw new Error(signed?.message || `Could not authorize RustFS upload (HTTP ${signedResponse.status})`);
      }

      toast.loading('Uploading directly to RustFS...', { id: loadingToast });
      await putDirectToRustFs(signed.putUrl, file, signed.contentType, setUploadProgress);

      // Verify the object exists in RustFS before writing a URL into MongoDB.
      toast.loading('Verifying and processing uploaded media...', { id: loadingToast });
      const confirmResponse = await fetch('/api/dashboard-media?action=complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          key: signed.key,
          ticket: signed.ticket,
          contentType: signed.contentType,
          size: file.size,
        }),
      });
      const confirmed = await confirmResponse.json().catch(() => null) as
        { url?: string; message?: string } | null;
      if (!confirmResponse.ok || typeof confirmed?.url !== 'string') {
        throw new Error(confirmed?.message || `Could not verify upload (HTTP ${confirmResponse.status})`);
      }
      const uploadedUrl = confirmed.url;

      // Update web data with new URL - PRESERVE EXISTING DATA
      const updateData: Partial<WebData> = {};

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

      await saveWebData(updateData);
      toast.success(isVideo ? 'ভিডিও সফলভাবে আপলোড হয়েছে' : 'ছবি সফলভাবে আপলোড হয়েছে');
      await queryClient.invalidateQueries({ queryKey: ['web-data'] });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'আপলোড ব্যর্থ হয়েছে');
    } finally {
      toast.dismiss(loadingToast);
      setUploadProgress(null);
      setUploadingField(null);
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

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-3">
        <p className="text-sm text-red-700">{loadError?.message || 'Could not load website media'}</p>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['web-data'] })}>Retry</Button>
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
        <p className="text-xs text-gray-500 mt-2">
          Direct RustFS upload: videos up to 80 MB, images up to 25 MB. MOV/MKV/AVI and HEIC/TIFF are converted for browsers.
        </p>
        {uploadingField && (
          <p role="status" className="text-sm font-medium text-pink-700 mt-2">
            {uploadProgress === 100 ? 'Upload complete — processing and saving...' :
              `Uploading directly to RustFS: ${uploadProgress ?? 0}%`}
          </p>
        )}
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
                    accept="video/*,.mp4,.m4v,.mov,.webm,.mkv,.avi,.wmv,.flv,.mpeg,.mpg,.m2v,.3gp,.3g2,.ogv,.ts,.mts,.m2ts"
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
                    accept="video/*,.mp4,.m4v,.mov,.webm,.mkv,.avi,.wmv,.flv,.mpeg,.mpg,.m2v,.3gp,.3g2,.ogv,.ts,.mts,.m2ts"
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
                    accept="image/*,.jpg,.jpeg,.jpe,.jfif,.png,.apng,.webp,.avif,.gif,.ico,.bmp,.tif,.tiff,.heic,.heif"
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
                    accept="image/*,.jpg,.jpeg,.jpe,.jfif,.png,.apng,.webp,.avif,.gif,.ico,.bmp,.tif,.tiff,.heic,.heif"
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
                    accept="image/*,.jpg,.jpeg,.jpe,.jfif,.png,.apng,.webp,.avif,.gif,.ico,.bmp,.tif,.tiff,.heic,.heif"
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
                    accept="image/*,.jpg,.jpeg,.jpe,.jfif,.png,.apng,.webp,.avif,.gif,.ico,.bmp,.tif,.tiff,.heic,.heif"
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
