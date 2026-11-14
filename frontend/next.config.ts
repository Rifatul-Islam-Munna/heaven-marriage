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
      {
        protocol: 'https',
        hostname: 'multi-vendor-minio.pixs1x.easypanel.host',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'multi-vendor-minio.pixs1x.easypanel.host',
        port: '',
        pathname: '/niqha-public-bukcet/**',
      },
      
    ],
     unoptimized: process.env.NODE_ENV === "development",
  

  },
  typedRoutes: true,
  // Send clients back to the correct build during rolling deployments.
  deploymentId: process.env.DEPLOYMENT_VERSION || undefined,
     experimental: {
    serverActions: {
      bodySizeLimit: '80mb',
    },
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  output:"standalone"
 
};

export default nextConfig;
