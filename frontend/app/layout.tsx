import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Inter,
  Cormorant_Garamond,
  Lato,
} from "next/font/google";
import "./globals.css";
import Navbar from "@/components/custom/Navbar/Navbar";
import Footer from "@/components/custom/common/footer";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import QueryClint from "@/lib/QueryClint";
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
import { Toaster } from "@/components/ui/sonner";
import WhatsAppFloat from "@/components/custom/common/WhatsAppFloat";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

// Configure Lato for body text
const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-lato",
  display: "swap",
});
// app/layout.tsx
import type { Metadata } from "next";
import { GoogleTagManager } from "@next/third-parties/google";
import { PageViewTracker } from "@/lib/PageViewTracker";
import { Suspense } from "react";
export const metadata: Metadata = {
  title:
    "নিকাহা - বাংলাদেশের সেরা হালাল ম্যাট্রিমনি ওয়েবসাইট | Halal Marriage Platform",
  description:
    "বাংলাদেশের বিশ্বস্ত হালাল ম্যাট্রিমনি সেবা। নিকাহা তে খুঁজে পান আপনার জীবনসঙ্গী সম্পূর্ণ ইসলামিক নিয়ম মেনে। বিয়ে, বিবাহ এবং বৈবাহিক সম্পর্কের জন্য সেরা প্ল্যাটফর্ম।",

  keywords: [
    "নিকাহা",
    "হালাল ম্যাট্রিমনি",
    "বাংলাদেশ ম্যাট্রিমনি",
    "ইসলামিক বিবাহ",
    "মুসলিম বিয়ে",
    "বাংলাদেশী বিয়ে",
    "halal matrimony bangladesh",
    "niqaha",
    "muslim marriage bd",
    "বৈবাহিক সম্পর্ক",
    "জীবনসঙ্গী খুঁজুন",
    "ইসলামিক ম্যারেজ",
    "বিয়ের সাইট বাংলাদেশ",
  ],

  authors: [{ name: "Niqaha" }],
  creator: "Niqaha",
  publisher: "Niqaha",

  metadataBase: new URL("https://niqaha.com"), // Replace with your actual domain

  alternates: {
    canonical: "/",
    languages: {
      "bn-BD": "/",
      "en-US": "/en",
    },
  },

  openGraph: {
    type: "website",
    locale: "bn_BD",
    alternateLocale: ["en_US"],
    url: "https://niqaha.com",
    siteName: "নিকাহা - Niqaha",
    title: "নিকাহা - বাংলাদেশের সেরা হালাল ম্যাট্রিমনি ওয়েবসাইট",
    description:
      "বাংলাদেশের বিশ্বস্ত হালাল ম্যাট্রিমনি সেবা। নিকাহা তে খুঁজে পান আপনার জীবনসঙ্গী সম্পূর্ণ ইসলামিক নিয়ম মেনে।",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "নিকাহা - Halal Matrimony Bangladesh",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "নিকাহা - বাংলাদেশের সেরা হালাল ম্যাট্রিমনি",
    description:
      "বাংলাদেশের বিশ্বস্ত হালাল ম্যাট্রিমনি সেবা। খুঁজে পান আপনার জীবনসঙ্গী।",
    images: ["/logo.png"],
    creator: "@niqaha", // Add your Twitter handle
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  icons: {
    icon: [
      { url: "/logo.png" },
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/logo.png" }],
    shortcut: ["/logo.png"],
  },

  manifest: "/site.webmanifest",

  verification: {
    google: "your-google-verification-code", // Add after Google Search Console setup
    // yandex: "your-yandex-code",
    // bing: "your-bing-code",
  },

  category: "Matrimony",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <GoogleTagManager gtmId="GTM-K8LP7V8D" />
      <body className={` ${cormorant.variable} ${lato.variable} antialiased`}>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-K8LP7V8D"
            height="0"
            width="0"
            className="display:none;visibility:hidden"
          ></iframe>
        </noscript>

        <WhatsAppFloat />
        <Suspense>
          <PageViewTracker />
        </Suspense>

        <QueryClint>
          <NuqsAdapter>
            <Navbar />
            {children}
            <Footer />
          </NuqsAdapter>
        </QueryClint>
        <Toaster />
      </body>
    </html>
  );
}
