"use client"

import { CpsAppShell } from "@/components/cps-app-shell"
import { CpsWorkspaceProvider } from "@/components/cps-workspace-provider"
import { KitAppShell } from "@/components/kit/kit-app-shell"
import { RadioModelProvider } from "@/components/radio-model-provider"
import { UpdateCoordinatorProvider } from "@/components/update-coordinator-provider"
import { usePathname } from "@/i18n/navigation"
import { isRadioModelId } from "@/modules/radio-support/index"

function ApplicationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  const radioModelId = segments[0] === "cps" ? segments[1] : undefined

  if (radioModelId && isRadioModelId(radioModelId)) {
    return (
      <RadioModelProvider radioModelId={radioModelId}>
        <CpsWorkspaceProvider>
          <UpdateCoordinatorProvider>
            <CpsAppShell>{children}</CpsAppShell>
          </UpdateCoordinatorProvider>
        </CpsWorkspaceProvider>
      </RadioModelProvider>
    )
  }

  return <KitAppShell>{children}</KitAppShell>
}

export { ApplicationShell }
