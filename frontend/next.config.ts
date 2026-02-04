import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ["images.unsplash.com"],
  },
  typedRoutes: true,
     experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  }
};

export default nextConfig;
