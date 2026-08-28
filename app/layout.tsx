import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google"
import { getLocale } from "next-intl/server"

import "./globals.css"
import { CpsWorkspaceProvider } from "@/components/cps-workspace-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { UpdateCoordinatorProvider } from "@/components/update-coordinator-provider"
import { cn } from "@/lib/utils"

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
