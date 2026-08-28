import { Suspense } from "react"
import { notFound } from "next/navigation"

import { RadioWritePrototype } from "@/components/prototype/radio-write-prototype"

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound()

  return (
    <Suspense fallback={null}>
      <RadioWritePrototype />
    </Suspense>
  )
}
