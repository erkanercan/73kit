import type { Metadata } from "next"
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google"
import { getLocale } from "next-intl/server"

import "./globals.css"
import { CpsWorkspaceProvider } from "@/components/cps-workspace-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { UpdateCoordinatorProvider } from "@/components/update-coordinator-provider"
import { SITE_DESCRIPTIONS, SITE_NAME, SITE_ORIGIN } from "@/lib/site"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  metadataBase: SITE_ORIGIN,
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTIONS.en,
}

const spaceGroteskHeading = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
})

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "h-full overflow-hidden font-sans antialiased",
        fontMono.variable,
        geist.variable,
        spaceGroteskHeading.variable
      )}
    >
      <body className="h-full overflow-hidden">
        <ThemeProvider>
          <CpsWorkspaceProvider>
            <UpdateCoordinatorProvider>{children}</UpdateCoordinatorProvider>
          </CpsWorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
