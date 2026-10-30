import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard/", "/profile/", "/payment/", "/biodata?"] },
    sitemap: "https://niqaha.com/sitemap.xml", host: "https://niqaha.com",
  };
}
