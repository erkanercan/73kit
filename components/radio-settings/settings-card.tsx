import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type SettingsCardProps = {
  id: string
  title: string
  description: string
  className?: string
  children: ReactNode
}

function SettingsCard({
  id,
  title,
  description,
  className,
  children,
}: SettingsCardProps) {
  return (
    <Card id={id} className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export { SettingsCard }
