"use client"

import * as React from "react"

const TEST_OVERRIDE = process.env.NEXT_PUBLIC_ENABLE_PWA_TEST === "1"

function ServiceWorkerRegistration() {
  React.useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      (process.env.NODE_ENV !== "production" && !TEST_OVERRIDE)
    ) {
      return
    }

    const register = () => {
      void navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
    }

    if (document.readyState === "complete") {
      register()
      return
    }

    window.addEventListener("load", register, { once: true })
    return () => window.removeEventListener("load", register)
  }, [])

  return null
}

export { ServiceWorkerRegistration }
