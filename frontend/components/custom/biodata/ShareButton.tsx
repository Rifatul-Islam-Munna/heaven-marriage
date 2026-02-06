"use client";

import { useState } from "react";
import { Share2, Download, Copy, Check } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShareButton() {
  const [currentUrl, setCurrentUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Get current URL when modal opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }
  };

  // Copy URL to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Download QR Code
  const downloadQRCode = () => {
    const canvas = document.getElementById("qr-code") as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "qr-code.png";
      link.href = url;
      link.click();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          শেয়ার করুন
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">এই পেজ শেয়ার করুন</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* URL Display and Copy */}
          <div className="space-y-2">
            <label className="text-sm font-medium">পেজ লিংক:</label>
            <div className="flex gap-2">
              <Input value={currentUrl} readOnly className="flex-1" />
              <Button
                size="icon"
                variant="outline"
                onClick={copyToClipboard}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {copied && <p className="text-sm text-green-600">কপি হয়েছে!</p>}
          </div>

          {/* QR Code */}
          <div className="space-y-3">
            <label className="text-sm font-medium">QR কোড:</label>
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <QRCodeCanvas
                  id="qr-code"
                  value={currentUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <Button
                onClick={downloadQRCode}
                className="w-full gap-2"
                variant="default"
              >
                <Download className="h-4 w-4" />
                QR কোড ডাউনলোড করুন
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
