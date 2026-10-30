import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  // Private biodata and authentication pages are deliberately excluded.
  return [
    "/",
    "/about",
    "/biodata",
    "/contact",
    "/faq",
    "/guidelines",
    "/pricing",
    "/policies/terms",
    "/policies/refund",
  ].map((path) => ({
    url: "https://niqaha.com" + (path === "/" ? "" : path),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
