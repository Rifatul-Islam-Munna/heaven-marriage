
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
import TrackingConsent from "@/lib/TrackingConsent";
import { publicMetadata } from "@/lib/seo";
import { PageViewTracker } from "@/lib/PageViewTracker";
import { Suspense } from "react";
export const metadata: Metadata = { ...publicMetadata("Niqaha.com | ইসলামিক ম্যাট্রিমনি", "বাংলাদেশ ও প্রবাসী বাংলাদেশিদের জন্য ইসলামিক ম্যাট্রিমনি। বায়োডাটা জমা দিন, পাত্র-পাত্রীর বায়োডাটা খুঁজুন এবং নিরাপদে সংযোগ নিন।", "/"), metadataBase: new URL("https://niqaha.com"), icons: { icon: "/favicon.ico", apple: "/logo.png" } };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className={inter.variable}>

      <body className={` ${cormorant.variable} ${lato.variable} antialiased`}>
        <TrackingConsent />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "Niqaha.com", url: "https://niqaha.com", logo: "https://niqaha.com/logo.png", email: "niqahabd@gmail.com", telephone: "+8801748919251", address: { "@type": "PostalAddress", addressLocality: "Dashghar, Bishwanath, Sylhet", addressCountry: "BD" } }) }} />


        <Suspense>
          <PageViewTracker />
        </Suspense>

        <QueryClint>
          <NuqsAdapter>
            <WhatsAppFloat />
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
