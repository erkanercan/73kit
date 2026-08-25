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
  BandZoneSelections,
  RadioBand,
  Zone,
} from "@/modules/codeplug/index"

function BandZoneSelectors({
  zones,
  selections,
  onChange,
}: {
  zones: readonly Zone[]
  selections: BandZoneSelections
  onChange(band: RadioBand, zoneNumbers: readonly number[]): void
}) {
  return (
    <div className="ml-auto flex flex-wrap items-end gap-2">
      <BandZoneSelector
        band="A"
        zones={zones}
        selected={selections.A}
        onChange={onChange}
      />
      <BandZoneSelector
        band="B"
        zones={zones}
        selected={selections.B}
        onChange={onChange}
      />
    </div>
  )
}

function BandZoneSelector({
  band,
  zones,
  selected,
  onChange,
}: {
  band: RadioBand
  zones: readonly Zone[]
  selected: readonly number[]
  onChange(band: RadioBand, zoneNumbers: readonly number[]): void
}) {
  const t = useTranslations()
  const label = band === "A" ? t("bandAZones") : t("bandBZones")
  const triggerId = `band-${band.toLowerCase()}-zones`

  function toggleZone(number: number, checked: boolean) {
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
              ? t("allZones")
              : t("selectedZonesCount", { count: selected.length })}
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
              {t("allZones")}
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {zones.map((zone) => (
              <DropdownMenuCheckboxItem
                key={zone.number}
                checked={selected.includes(zone.number)}
                onCheckedChange={(checked) => toggleZone(zone.number, checked)}
              >
                <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">
                  {t("zoneNumber", { number: zone.number - 1 })}
                </span>
                <span className="truncate">{zone.name || t("unused")}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Field>
  )
}

export { BandZoneSelectors }
