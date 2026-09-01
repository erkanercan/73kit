import { Suspense } from "react"
import { notFound } from "next/navigation"

import { FirmwareCompatibilityPrototype } from "@/components/prototype/firmware-compatibility-prototype"

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound()
  return (
    <Suspense fallback={null}>
      <FirmwareCompatibilityPrototype />
    </Suspense>
  )
}
