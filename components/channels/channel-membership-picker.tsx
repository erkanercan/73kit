"use client"

import * as React from "react"
import { CheckIcon, SearchIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { ScanList, Zone } from "@/modules/codeplug/index"

type MembershipKind = "zone" | "scan-list"
type MembershipCollection = Zone | ScanList

function ChannelMembershipPicker({
  id,
  kind,
  channelNumber,
  collections,
  compact = false,
  onChange,
}: {
  id: string
  kind: MembershipKind
  channelNumber: number
  collections: readonly MembershipCollection[]
  compact?: boolean
  onChange(numbers: readonly number[]): void
}) {
  const t = useTranslations()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const selectedNumbers = React.useMemo(
    () =>
      collections
        .filter((collection) =>
          collection.channelNumbers.includes(channelNumber)
        )
        .map((collection) => collection.number),
    [channelNumber, collections]
  )
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const filteredCollections = collections.filter((collection) => {
    if (!normalizedSearch) {
      return true
    }

    const displayNumber = collection.number - 1
    return `${displayNumber} ${collection.name}`
      .toLocaleLowerCase()
      .includes(normalizedSearch)
  })
  const label = kind === "zone" ? t("channelZones") : t("channelScanLists")
  const selectedCollections = collections.filter((collection) =>
    selectedNumbers.includes(collection.number)
  )
  const firstSelection = selectedCollections[0]
  const summary = firstSelection
    ? `${firstSelection.name || membershipFallback(kind, firstSelection.number, t)}${
        selectedCollections.length > 1
          ? ` +${selectedCollections.length - 1}`
          : ""
      }`
    : t("noMembership")

  function toggleMembership(collection: MembershipCollection) {
    const selected = selectedNumbers.includes(collection.number)
    const nextNumbers = selected
      ? selectedNumbers.filter((number) => number !== collection.number)
      : [...selectedNumbers, collection.number].sort(
          (left, right) => left - right
        )

    onChange(nextNumbers)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setSearch("")
        }
      }}
    >
      <PopoverTrigger
        id={id}
        render={
          <Button
            variant={compact ? "ghost" : "outline"}
            size={compact ? "sm" : "default"}
          />
        }
        className={cn(
          "min-w-0 justify-start font-normal",
          compact ? "w-full px-1.5" : "w-full justify-between"
        )}
        aria-label={t("editChannelMemberships", {
          membership: label,
          number: channelNumber,
        })}
      >
        <span className="truncate">{summary}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))]">
        <PopoverHeader>
          <PopoverTitle>{label}</PopoverTitle>
        </PopoverHeader>
        <div className="relative">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground"
          />
          <Input
            value={search}
            className="pl-8"
            aria-label={t("searchMemberships", { membership: label })}
            placeholder={t("searchMemberships", { membership: label })}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
        </div>
        <ScrollArea className="h-64">
          <div className="flex flex-col gap-0.5 pr-2">
            {filteredCollections.map((collection) => {
              const selected = selectedNumbers.includes(collection.number)
              const full = !selected && collection.channelNumbers.length >= 128

              return (
                <Button
                  key={collection.number}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start font-normal"
                  disabled={full}
                  aria-pressed={selected}
                  title={full ? t("membershipFull") : undefined}
                  onClick={() => toggleMembership(collection)}
                >
                  <CheckIcon
                    data-icon="inline-start"
                    className={cn(!selected && "invisible")}
                  />
                  <span
                    className={cn(
                      "shrink-0 truncate font-mono text-xs text-muted-foreground",
                      kind === "zone" ? "w-20" : "w-28"
                    )}
                  >
                    {membershipNumber(kind, collection.number, t)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-left">
                    {collection.name || t("unnamedMembership")}
                  </span>
                  {full && (
                    <span className="text-xs text-muted-foreground">
                      {t("membershipFull")}
                    </span>
                  )}
                </Button>
              )
            })}
            {filteredCollections.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {t("noMatchingMemberships")}
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

function membershipNumber(
  kind: MembershipKind,
  number: number,
  t: ReturnType<typeof useTranslations>
) {
  return kind === "zone"
    ? t("zoneNumber", { number: number - 1 })
    : t("scanListNumber", { number: number - 1 })
}

function membershipFallback(
  kind: MembershipKind,
  number: number,
  t: ReturnType<typeof useTranslations>
) {
  return `${membershipNumber(kind, number, t)} · ${t("unnamedMembership")}`
}

export { ChannelMembershipPicker }
export type { MembershipKind }
