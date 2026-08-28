import { Suspense } from "react"
import { notFound } from "next/navigation"

import { FirmwareCompatibilityPrototype } from "@/components/prototype/firmware-compatibility-prototype"

// Four development-only firmware simulator variants, switchable via ?variant=.
export default function Page() {
  if (process.env.NODE_ENV !== "development") {
    notFound()
  }

  return (
    <Suspense fallback={null}>
      <FirmwareCompatibilityPrototype />
    </Suspense>
  )
}
