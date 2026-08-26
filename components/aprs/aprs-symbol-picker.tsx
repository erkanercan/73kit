"use client"

import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  isUnknownSettingValue,
  type AprsSymbolTable,
  type UnknownSettingValue,
} from "@/modules/codeplug/index"

import { AprsHelp } from "./aprs-fields"
import { AprsSymbolIcon } from "./aprs-symbol-icon"
import {
  getAprsSymbolMetadata,
  getAprsSymbols,
  type AprsSymbolLocale,
} from "./aprs-symbol-metadata"

function AprsSymbolPicker({
  id,
  label,
  hint,
  table,
  index,
  unknownLabel,
  onChange,
}: {
  id: string
  label: string
  hint: string
  table: AprsSymbolTable | UnknownSettingValue
  index: number | UnknownSettingValue
  unknownLabel: string
  onChange(table: AprsSymbolTable, index: number): void
}) {
  const locale = useLocale() === "tr" ? "tr" : "en"
  const t = useTranslations()
  const selectedTable = isUnknownSettingValue(table) ? null : table
  const selectedIndex = isUnknownSettingValue(index) ? null : index
  const [open, setOpen] = React.useState(false)
  const [browseTable, setBrowseTable] = React.useState<AprsSymbolTable>(
    selectedTable ?? "primary"
  )
  const [search, setSearch] = React.useState("")
  const symbols = React.useMemo(
    () => getAprsSymbols(browseTable, locale, t("aprsSymbolReserved")),
    [browseTable, locale, t]
  )
  const normalizedSearch = search.trim().toLocaleLowerCase(locale)
  const filteredSymbols = symbols.filter((symbol) =>
    `${symbol.name} ${symbol.code}`
      .toLocaleLowerCase(locale)
      .includes(normalizedSearch)
  )
  const selectedSymbol =
    selectedTable !== null && selectedIndex !== null
      ? getAprsSymbolMetadata(
          selectedTable,
          selectedIndex,
          locale as AprsSymbolLocale,
          t("aprsSymbolReserved")
        )
      : null

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) setBrowseTable(selectedTable ?? "primary")
    else setSearch("")
  }

  function moveGridFocus(
    event: React.KeyboardEvent<HTMLButtonElement>,
    itemIndex: number
  ) {
    const columnCount = 4
    const movement: Partial<Record<string, number>> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -columnCount,
      ArrowDown: columnCount,
    }
    let nextIndex = movement[event.key]
    if (event.key === "Home") nextIndex = -itemIndex
    if (event.key === "End") nextIndex = filteredSymbols.length - 1 - itemIndex
    if (nextIndex === undefined) return

    const buttons = event.currentTarget
      .closest("[data-symbol-grid]")
      ?.querySelectorAll<HTMLButtonElement>("[data-symbol-option]")
    const nextButton = buttons?.item(itemIndex + nextIndex)
    if (!nextButton) return
    event.preventDefault()
    nextButton.focus()
  }

  return (
    <Field orientation="responsive">
      <FieldContent>
        <div className="flex min-w-0 items-center gap-1">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <AprsHelp label={label} hint={hint} />
        </div>
      </FieldContent>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          id={id}
          render={
            <Button
              type="button"
              variant="outline"
              className="w-full! justify-start font-normal sm:w-64!"
            />
          }
        >
          {selectedSymbol && selectedTable ? (
            <>
              {selectedSymbol.reserved ? (
                <SymbolPlaceholder size="small" />
              ) : (
                <AprsSymbolIcon
                  table={selectedTable}
                  index={selectedSymbol.index}
                  size={20}
                />
              )}
              <span className="min-w-0 flex-1 truncate text-left">
                {selectedSymbol.name}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {selectedSymbol.code}
              </span>
            </>
          ) : (
            <span className="min-w-0 flex-1 truncate text-left">
              {unknownSettingLabel(table, index, unknownLabel)}
            </span>
          )}
          <ChevronsUpDownIcon className="ml-auto text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[40rem] gap-3 p-3">
          <PopoverHeader>
            <PopoverTitle>{t("aprsSymbolPickerTitle")}</PopoverTitle>
          </PopoverHeader>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label={t("aprsSymbolSearch")}
                placeholder={t("aprsSymbolSearch")}
                value={search}
                className="pl-8"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <ToggleGroup
              aria-label={t("aprsSymbolTable")}
              value={[browseTable]}
              variant="outline"
              spacing={0}
              onValueChange={(value) => {
                const nextTable = value[0]
                if (nextTable === "primary" || nextTable === "secondary") {
                  setBrowseTable(nextTable)
                }
              }}
            >
              <ToggleGroupItem value="primary">
                {t("aprsSymbolPrimary")}
              </ToggleGroupItem>
              <ToggleGroupItem value="secondary">
                {t("aprsSymbolSecondary")}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <ScrollArea className="h-[24rem] pr-2">
            {filteredSymbols.length > 0 ? (
              <div data-symbol-grid className="grid grid-cols-4 gap-2">
                {filteredSymbols.map((symbol, itemIndex) => {
                  const selected =
                    browseTable === selectedTable &&
                    symbol.index === selectedIndex

                  return (
                    <Button
                      key={symbol.code}
                      type="button"
                      data-symbol-option
                      variant={selected ? "secondary" : "outline"}
                      aria-label={t("aprsSymbolOptionLabel", {
                        name: symbol.name,
                        code: symbol.code,
                      })}
                      aria-pressed={selected}
                      className="relative h-auto min-h-16 justify-start gap-2 overflow-hidden p-2 text-left font-normal whitespace-normal"
                      onClick={() => {
                        onChange(browseTable, symbol.index)
                        handleOpenChange(false)
                      }}
                      onKeyDown={(event) => moveGridFocus(event, itemIndex)}
                    >
                      {symbol.reserved ? (
                        <SymbolPlaceholder size="large" />
                      ) : (
                        <AprsSymbolIcon
                          table={browseTable}
                          index={symbol.index}
                        />
                      )}
                      <span className="min-w-0">
                        <span className="line-clamp-2 block leading-tight">
                          {symbol.name}
                        </span>
                        <span className="mt-1 block font-mono text-xs text-muted-foreground">
                          {symbol.code}
                        </span>
                      </span>
                      {selected && (
                        <CheckIcon className="absolute top-1.5 right-1.5 size-3.5" />
                      )}
                    </Button>
                  )
                })}
              </div>
            ) : (
              <div className="flex h-full min-h-40 items-center justify-center text-sm text-muted-foreground">
                {t("aprsSymbolNoResults")}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </Field>
  )
}

function SymbolPlaceholder({ size }: { size: "small" | "large" }) {
  return (
    <span
      aria-hidden="true"
      className={
        size === "small"
          ? "flex size-5 shrink-0 items-center justify-center rounded border text-xs text-muted-foreground"
          : "flex size-8 shrink-0 items-center justify-center rounded border text-muted-foreground"
      }
    >
      —
    </span>
  )
}

function unknownSettingLabel(
  table: AprsSymbolTable | UnknownSettingValue,
  index: number | UnknownSettingValue,
  label: string
) {
  const unknown = isUnknownSettingValue(table)
    ? table
    : isUnknownSettingValue(index)
      ? index
      : null
  return unknown
    ? `${label}: 0x${unknown.raw.toString(16).padStart(2, "0")}`
    : label
}

export { AprsSymbolPicker }
