import type { MetadataRoute } from "next"

import {
  absoluteUrl,
  localizedAlternates,
  localizedPath,
  PUBLIC_INDEXABLE_PATHS,
  SITE_LAST_REVIEWED,
} from "../lib/site.ts"

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_INDEXABLE_PATHS.flatMap((pathname) =>
    (["tr", "en"] as const).map((locale) => ({
      url: absoluteUrl(localizedPath(locale, pathname)),
      lastModified: SITE_LAST_REVIEWED,
      changeFrequency: "monthly" as const,
      priority: pathname === "" ? 1 : 0.7,
      alternates: {
        languages: localizedAlternates(pathname),
      },
    }))
  )
}
