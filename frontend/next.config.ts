import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
   
     
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
       {
        protocol: "http",
        hostname: "localhost",
        port: "9000", // Add the MinIO port
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/niqha-public-bukcet/**",
      },
      
    ],
     unoptimized: process.env.NODE_ENV === "development",
  

  },
  typedRoutes: true,
     experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  }
};

export default nextConfig;
