import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/metadata";

const privatePaths = ["/admin/", "/api/", "/preview/", "/search"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "OAI-SearchBot", allow: "/", disallow: privatePaths },
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "Claude-SearchBot", allow: "/", disallow: privatePaths },
      { userAgent: "Claude-User", allow: "/", disallow: privatePaths },
      { userAgent: "ClaudeBot", disallow: "/" },
      { userAgent: "Googlebot", allow: "/", disallow: privatePaths },
      { userAgent: "Yeti", allow: "/", disallow: privatePaths },
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
