import type { Metadata } from "next"
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google"

import "./globals.css"
import { CpsAppShell } from "@/components/cps-app-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
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

export const metadata: Metadata = {
  title: "UVL-15W CPS",
  description: "Read, inspect, and manage a TYT UVL-15W Codeplug locally.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        fontMono.variable,
        geist.variable,
        spaceGroteskHeading.variable
      )}
    >
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <CpsAppShell>{children}</CpsAppShell>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
