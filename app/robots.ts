import type { MetadataRoute } from "next"

import { absoluteUrl, SITE_ORIGIN } from "../lib/site.ts"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: ["GPTBot", "ClaudeBot"],
        disallow: "/",
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_ORIGIN.hostname,
  }
}
