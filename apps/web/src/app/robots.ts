import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// Built per request: the public URL is a runtime variable, unknown at build time.
export const dynamic = "force-dynamic";

/** Public pages are open; signed-in areas, RSVP links and compare stay out (decision 95). */
export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["/app", "/plan", "/vendor/", "/admin", "/account", "/notifications", "/welcome", "/rsvp", "/compare"];
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", ...privatePaths.map((p) => `/*${p}`)],
    },
    sitemap: `${env.appUrl}/sitemap.xml`,
  };
}
