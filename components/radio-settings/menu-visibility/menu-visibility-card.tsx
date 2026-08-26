"use client"

import * as React from "react"
import { EyeIcon, EyeOffIcon, SearchIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import {
  MENU_VISIBILITY_ASSIGNED_BIT_COUNT,
  MENU_VISIBILITY_ITEMS,
  type MenuVisibility,
  type MenuVisibilityItemId,
} from "@/modules/codeplug/index"

import { MenuVisibilityTree } from "./menu-visibility-tree"

function MenuVisibilityCard({
  visibility,
  onSetVisibility,
}: {
  visibility: MenuVisibility
  onSetVisibility(id: MenuVisibilityItemId, visible: boolean): void
}) {
  const t = useTranslations()
  const [query, setQuery] = React.useState("")
  const visibleCount = Object.values(visibility).filter(Boolean).length
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const hasSearchMatch =
    normalizedQuery.length === 0 ||
    MENU_VISIBILITY_ITEMS.some((item) =>
      t(`menuVisibilityItem-${item.id}`)
        .toLocaleLowerCase()
        .includes(normalizedQuery)
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("menuVisibilityTitle")}</CardTitle>
        <CardAction className="hidden sm:block">
          <span className="text-sm text-muted-foreground">
            {t("menuVisibilityVisibleCount", {
              visible: visibleCount,
              total: MENU_VISIBILITY_ASSIGNED_BIT_COUNT,
            })}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="min-w-64 flex-1">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("menuVisibilitySearchPlaceholder")}
              aria-label={t("menuVisibilitySearchLabel")}
            />
          </InputGroup>
          <Button
            type="button"
            variant="outline"
            onClick={() => onSetVisibility("main-menu", true)}
          >
            <EyeIcon data-icon="inline-start" />
            {t("menuVisibilityShowAll")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onSetVisibility("main-menu", false)}
          >
            <EyeOffIcon data-icon="inline-start" />
            {t("menuVisibilityHideAll")}
          </Button>
        </div>
        <Separator />
        {hasSearchMatch ? (
          <MenuVisibilityTree
            visibility={visibility}
            query={query}
            onSetVisibility={onSetVisibility}
          />
        ) : (
          <Empty className="min-h-40 border">
            <EmptyHeader>
              <EmptyTitle>{t("menuVisibilityNoResults")}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  )
}

export { MenuVisibilityCard }
