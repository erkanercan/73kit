"use client"

import { ChevronDownIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import type {
  BandScanListSelections,
  RadioBand,
  ScanList,
} from "@/modules/codeplug/index"

function BandScanListSelectors({
  scanLists,
  selections,
  onChange,
}: {
  scanLists: readonly ScanList[]
  selections: BandScanListSelections
  onChange(band: RadioBand, scanListNumbers: readonly number[]): void
}) {
  return (
    <div className="ml-auto flex flex-wrap items-end gap-2">
      <BandScanListSelector
        band="A"
        scanLists={scanLists}
        selected={selections.A}
        onChange={onChange}
      />
      <BandScanListSelector
        band="B"
        scanLists={scanLists}
        selected={selections.B}
        onChange={onChange}
      />
    </div>
  )
}

function BandScanListSelector({
  band,
  scanLists,
  selected,
  onChange,
}: {
  band: RadioBand
  scanLists: readonly ScanList[]
  selected: readonly number[]
  onChange(band: RadioBand, scanListNumbers: readonly number[]): void
}) {
  const t = useTranslations()
  const label = band === "A" ? t("bandAScanLists") : t("bandBScanLists")
  const triggerId = `band-${band.toLowerCase()}-scan-lists`

  function toggleScanList(number: number, checked: boolean) {
    const next = checked
      ? [...selected, number].sort((left, right) => left - right)
      : selected.filter((candidate) => candidate !== number)
    onChange(band, next)
  }

  return (
    <Field className="w-40 gap-1">
      <FieldLabel htmlFor={triggerId} className="text-xs">
        {label}
      </FieldLabel>
      <DropdownMenu>
        <DropdownMenuTrigger
          id={triggerId}
          render={<Button variant="outline" size="sm" />}
          className="justify-between"
        >
          <span className="truncate">
            {selected.length === 0
              ? t("allScanLists")
              : t("selectedScanListsCount", { count: selected.length })}
          </span>
          <ChevronDownIcon data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{label}</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={selected.length === 0}
              onCheckedChange={(checked) => {
                if (checked) onChange(band, [])
              }}
            >
              {t("allScanLists")}
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {scanLists.map((scanList) => (
              <DropdownMenuCheckboxItem
                key={scanList.number}
                checked={selected.includes(scanList.number)}
                onCheckedChange={(checked) =>
                  toggleScanList(scanList.number, checked)
                }
              >
                <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                  {t("scanListNumber", { number: scanList.number - 1 })}
                </span>
                <span className="truncate">{scanList.name || t("unused")}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Field>
  )
}

export { BandScanListSelectors }
