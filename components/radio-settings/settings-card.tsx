import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type SettingsCardProps = {
  id: string
  title: string
  className?: string
  children: ReactNode
}

function SettingsCard({ id, title, className, children }: SettingsCardProps) {
  return (
    <Card id={id} className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export { SettingsCard }
