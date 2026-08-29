"use client"

import * as React from "react"
import { ChevronDownIcon, CircleHelpIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  MENU_VISIBILITY_ITEMS,
  type MenuVisibility,
  type MenuVisibilityItem,
  type MenuVisibilityItemId,
} from "@/modules/codeplug/index"

const childrenByParent = new Map<
  MenuVisibilityItemId,
  readonly MenuVisibilityItem[]
>()

for (const parent of MENU_VISIBILITY_ITEMS) {
  const children = MENU_VISIBILITY_ITEMS.filter(
    (candidate) => candidate.parentId === parent.id
  )
  if (children.length > 0) childrenByParent.set(parent.id, children)
}

function MenuVisibilityTree({
  visibility,
  query,
  onSetVisibility,
}: {
  visibility: MenuVisibility
  query: string
  onSetVisibility(id: MenuVisibilityItemId, visible: boolean): void
}) {
  const t = useTranslations()
  const rootChildren = childrenByParent.get("main-menu") ?? []
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const matchingChildren = rootChildren.filter((item) =>
    subtreeMatches(item, normalizedQuery, (id) => t(`menuVisibilityItem-${id}`))
  )

  return (
    <div className="flex flex-col gap-3">
      {matchingChildren.map((item) => (
        <MenuVisibilityBranch
          key={item.id}
          item={item}
          visibility={visibility}
          query={normalizedQuery}
          depth={0}
          onSetVisibility={onSetVisibility}
        />
      ))}
    </div>
  )
}

function MenuVisibilityBranch({
  item,
  visibility,
  query,
  depth,
  onSetVisibility,
}: {
  item: MenuVisibilityItem
  visibility: MenuVisibility
  query: string
  depth: number
  onSetVisibility(id: MenuVisibilityItemId, visible: boolean): void
}) {
  const t = useTranslations()
  const itemT = (id: MenuVisibilityItemId) => t(`menuVisibilityItem-${id}`)
  const [open, setOpen] = React.useState(false)
  const children = childrenByParent.get(item.id) ?? []
  const label = itemT(item.id)

  if (children.length === 0) {
    return (
      <Field
        orientation="horizontal"
        className={cn(
          "min-h-9 rounded-lg px-3 py-2 hover:bg-muted/50",
          depth > 0 && "ml-6"
        )}
      >
        <Checkbox
          id={`menu-visibility-${item.id}`}
          checked={visibility[item.id]}
          onCheckedChange={(checked) => onSetVisibility(item.id, checked)}
        />
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <FieldLabel
            htmlFor={`menu-visibility-${item.id}`}
            className="min-w-0"
          >
            <span className="truncate">{label}</span>
          </FieldLabel>
          <MenuVisibilityHelp label={label} group={false} />
        </div>
      </Field>
    )
  }

  const descendants = collectDescendants(item.id)
  const visibleCount = descendants.filter(
    (descendant) => visibility[descendant.id]
  ).length
  const allVisible = visibleCount === descendants.length
  const noneVisible = visibleCount === 0
  const selfMatches =
    query.length > 0 && label.toLocaleLowerCase().includes(query)
  const displayedChildren =
    query.length === 0 || selfMatches
      ? children
      : children.filter((child) =>
          subtreeMatches(child, query, (id) => itemT(id))
        )
  const expanded = query.length > 0 || open

  return (
    <Collapsible open={expanded} onOpenChange={setOpen}>
      <div
        className={cn(
          "flex min-h-10 items-center gap-2 rounded-lg px-3 py-2",
          depth === 0 ? "bg-muted/50" : "ml-6 border bg-background"
        )}
      >
        <Checkbox
          id={`menu-visibility-${item.id}`}
          checked={allVisible}
          indeterminate={!allVisible && !noneVisible}
          onCheckedChange={(checked) => onSetVisibility(item.id, checked)}
        />
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <FieldLabel
            htmlFor={`menu-visibility-${item.id}`}
            className="min-w-0"
          >
            <span className="truncate">{label}</span>
          </FieldLabel>
          <MenuVisibilityHelp label={label} group />
        </div>
        <span className="text-xs text-muted-foreground">
          {t("menuVisibilityGroupCount", {
            visible: visibleCount,
            total: descendants.length,
          })}
        </span>
        <CollapsibleTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={label}
            />
          }
        >
          <ChevronDownIcon className="transition-transform group-data-open/button:rotate-180" />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="pt-2">
        <div className="flex flex-col gap-1 border-l pl-3">
          {displayedChildren.map((child) => (
            <MenuVisibilityBranch
              key={child.id}
              item={child}
              visibility={visibility}
              query={query}
              depth={depth + 1}
              onSetVisibility={onSetVisibility}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function MenuVisibilityHelp({
  label,
  group,
}: {
  label: string
  group: boolean
}) {
  const t = useTranslations()

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t("settingHelpLabel", { setting: label })}
          />
        }
      >
        <CircleHelpIcon />
      </TooltipTrigger>
      <TooltipContent side="top" align="end">
        {t(group ? "menuVisibilityGroupHint" : "menuVisibilityItemHint", {
          item: label,
        })}
      </TooltipContent>
    </Tooltip>
  )
}

function collectDescendants(parentId: MenuVisibilityItemId) {
  const descendants: MenuVisibilityItem[] = []
  const pending = [...(childrenByParent.get(parentId) ?? [])]

  while (pending.length > 0) {
    const item = pending.shift()
    if (!item) continue
    descendants.push(item)
    pending.push(...(childrenByParent.get(item.id) ?? []))
  }

  return descendants
}

function subtreeMatches(
  item: MenuVisibilityItem,
  query: string,
  labelFor: (id: MenuVisibilityItemId) => string
): boolean {
  if (query.length === 0) return true
  if (labelFor(item.id).toLocaleLowerCase().includes(query)) return true
  return (childrenByParent.get(item.id) ?? []).some((child) =>
    subtreeMatches(child, query, labelFor)
  )
}

export { MenuVisibilityTree }
