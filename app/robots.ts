import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/login", "/signup"], disallow: ["/dashboard", "/customers", "/sales", "/follow-up", "/settings", "/insights", "/ai-assistant", "/voice-assistant", "/templates"] }],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://tenda-delta.vercel.app"}/sitemap.xml`,
  };
}
