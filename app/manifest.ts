import type { MetadataRoute } from "next"

import { SITE_DESCRIPTIONS, SITE_NAME } from "@/lib/site"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "UVL-15W CPS",
    description: SITE_DESCRIPTIONS.en,
    start_url: "/tr",
    scope: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: "/icons/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  }
}
