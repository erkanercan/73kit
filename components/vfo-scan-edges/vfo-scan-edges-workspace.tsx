"use client"

import * as React from "react"
import { ChevronDownIcon, ScanLineIcon, SearchIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  EditableSelectCell,
  EditableTextCell,
} from "@/components/channels/editable-channel-cells"
import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { PageHeader } from "@/components/page-header"
import { RadioReadButton } from "@/components/radio-read-button"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  VFO_SCAN_EDGE_MAX_FREQUENCY_HZ,
  VFO_SCAN_EDGE_MIN_FREQUENCY_HZ,
  VFO_SCAN_EDGE_MODES,
  VFO_SCAN_EDGE_STEPS,
  type ChannelModulation,
  type RadioBand,
  type VfoScanEdge,
  type VfoScanEdgePatch,
  type VfoScanEdgeSelections,
} from "@/modules/codeplug/index"

const EMPTY_SCAN_EDGE_DEFAULTS = {
  name: "",
  lowFrequencyHz: 144_000_000,
  highFrequencyHz: 148_000_000,
  stepKHz: 12.5,
  modulation: "fm",
} as const satisfies VfoScanEdgePatch

function VfoScanEdgesWorkspace() {
  const {
    busy,
    capability,
    completedRead,
    editVfoScanEdge,
    editVfoScanEdgeSelection,
    readRadio,
  } = useCpsWorkspace()
  const t = useTranslations()
  const [search, setSearch] = React.useState("")
  const codeplug = completedRead?.workingCodeplug.codeplug ?? null

  if (!codeplug) {
    return (
      <main className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-6 lg:p-8">
        <PageHeader title={t("vfoScanEdgesTitle")} />
        <Empty className="min-h-[32rem] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScanLineIcon />
            </EmptyMedia>
            <EmptyTitle>{t("vfoScanEdgesReadRequiredTitle")}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <RadioReadButton
              busy={busy}
              disabled={capability !== "available"}
              onClick={() => void readRadio()}
            />
          </EmptyContent>
        </Empty>
      </main>
    )
  }

  const edges = codeplug.getVfoScanEdges()
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const visibleEdges = edges.filter((edge) => {
    if (!normalizedSearch) return true

    return [
      edge.number,
      String(edge.number).padStart(2, "0"),
      edge.name,
      edge.valid ? formatMHz(edge.lowFrequencyHz) : t("unused"),
      edge.valid ? formatMHz(edge.highFrequencyHz) : "",
      edge.valid ? edge.stepKHz : "",
      edge.valid ? modeLabel(t, edge.modulation) : "",
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedSearch)
  })

  function updateEdge(edge: VfoScanEdge, patch: VfoScanEdgePatch) {
    editVfoScanEdge(
      edge.number,
      edge.valid ? patch : { ...EMPTY_SCAN_EDGE_DEFAULTS, ...patch }
    )
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("vfoScanEdgesTitle")}>
        <VfoScanEdgeSelectors
          edges={edges}
          selections={codeplug.getVfoScanEdgeSelections()}
          onChange={editVfoScanEdgeSelection}
        />
      </PageHeader>
      <section className="flex min-h-0 flex-1 flex-col gap-3">
        <InputGroup>
          <InputGroupInput
            value={search}
            aria-label={t("searchScanEdges")}
            placeholder={t("searchScanEdgesPlaceholder")}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
        {visibleEdges.length === 0 ? (
          <Empty className="min-h-72 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon />
              </EmptyMedia>
              <EmptyTitle>{t("noMatchingScanEdges")}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table
            containerClassName="min-h-0 flex-1 overflow-auto overscroll-contain rounded-lg border"
            className="min-w-[54rem] table-fixed"
          >
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-16">{t("channelNumber")}</TableHead>
                <TableHead className="w-48">{t("vfoScanEdgeName")}</TableHead>
                <TableHead className="w-44">
                  {t("vfoScanEdgeLowFrequency")}
                </TableHead>
                <TableHead className="w-44">
                  {t("vfoScanEdgeHighFrequency")}
                </TableHead>
                <TableHead className="w-28">{t("frequencyStep")}</TableHead>
                <TableHead className="w-28">{t("channelMode")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleEdges.map((edge) => (
                <TableRow key={edge.number}>
                  <TableCell className="font-mono font-medium">
                    {String(edge.number).padStart(2, "0")}
                  </TableCell>
                  <TableCell>
                    <EditableTextCell
                      value={edge.name}
                      displayValue={
                        edge.valid
                          ? edge.name || t("unnamedScanEdge")
                          : t("unused")
                      }
                      ariaLabel={`${t("vfoScanEdgeName")} ${edge.number}`}
                      invalidMessage={t("vfoScanEdgeNameTooLong")}
                      validate={(name) =>
                        !name.includes("\0") &&
                        new TextEncoder().encode(name).byteLength <= 24
                      }
                      onCommit={(name) => updateEdge(edge, { name })}
                    />
                  </TableCell>
                  <TableCell>
                    <ScanEdgeFrequencyCell
                      value={
                        edge.valid
                          ? edge.lowFrequencyHz
                          : EMPTY_SCAN_EDGE_DEFAULTS.lowFrequencyHz
                      }
                      displayValue={
                        edge.valid ? formatMHz(edge.lowFrequencyHz) : "—"
                      }
                      otherValue={
                        edge.valid
                          ? edge.highFrequencyHz
                          : EMPTY_SCAN_EDGE_DEFAULTS.highFrequencyHz
                      }
                      boundary="low"
                      ariaLabel={`${t("vfoScanEdgeLowFrequency")} ${edge.number}`}
                      invalidMessage={t("vfoScanEdgeFrequencyInvalid")}
                      rangeInvalidMessage={t("vfoScanEdgeRangeInvalid")}
                      onCommit={(lowFrequencyHz) =>
                        updateEdge(edge, { lowFrequencyHz })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <ScanEdgeFrequencyCell
                      value={
                        edge.valid
                          ? edge.highFrequencyHz
                          : EMPTY_SCAN_EDGE_DEFAULTS.highFrequencyHz
                      }
                      displayValue={
                        edge.valid ? formatMHz(edge.highFrequencyHz) : "—"
                      }
                      otherValue={
                        edge.valid
                          ? edge.lowFrequencyHz
                          : EMPTY_SCAN_EDGE_DEFAULTS.lowFrequencyHz
                      }
                      boundary="high"
                      ariaLabel={`${t("vfoScanEdgeHighFrequency")} ${edge.number}`}
                      invalidMessage={t("vfoScanEdgeFrequencyInvalid")}
                      rangeInvalidMessage={t("vfoScanEdgeRangeInvalid")}
                      onCommit={(highFrequencyHz) =>
                        updateEdge(edge, { highFrequencyHz })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <EditableSelectCell
                      value={edge.valid ? String(edge.stepKHz) : ""}
                      placeholder={edge.valid ? undefined : "—"}
                      ariaLabel={`${t("frequencyStep")} ${edge.number}`}
                      options={VFO_SCAN_EDGE_STEPS.filter(
                        (step) =>
                          step !== 8.33 ||
                          (edge.valid &&
                            (edge.modulation === "am" ||
                              edge.modulation === "am-narrow"))
                      ).map((step) => ({
                        value: String(step),
                        label: `${step} kHz`,
                        original: step,
                      }))}
                      onCommit={(_, option) =>
                        updateEdge(edge, { stepKHz: option.original })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <EditableSelectCell
                      value={edge.valid ? edge.modulation : ""}
                      placeholder={edge.valid ? undefined : "—"}
                      ariaLabel={`${t("channelMode")} ${edge.number}`}
                      options={VFO_SCAN_EDGE_MODES.filter(
                        (mode) =>
                          !edge.valid ||
                          edge.stepKHz !== 8.33 ||
                          mode === "am" ||
                          mode === "am-narrow"
                      ).map((mode) => ({
                        value: mode,
                        label: modeLabel(t, mode),
                        original: mode,
                      }))}
                      onCommit={(_, option) =>
                        updateEdge(edge, { modulation: option.original })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  )
}

function ScanEdgeFrequencyCell({
  value,
  displayValue,
  otherValue,
  boundary,
  ariaLabel,
  invalidMessage,
  rangeInvalidMessage,
  onCommit,
}: {
  value: number
  displayValue: string
  otherValue: number
  boundary: "low" | "high"
  ariaLabel: string
  invalidMessage: string
  rangeInvalidMessage: string
  onCommit(value: number): void
}) {
  return (
    <EditableTextCell
      value={formatMHz(value)}
      displayValue={displayValue}
      ariaLabel={ariaLabel}
      inputMode="decimal"
      invalidMessage={`${invalidMessage} ${rangeInvalidMessage}`}
      validate={(draft) => {
        const parsed = parseMHz(draft)
        if (parsed === null) return false
        return boundary === "low" ? parsed <= otherValue : parsed >= otherValue
      }}
      onCommit={(draft) => {
        const parsed = parseMHz(draft)
        if (parsed === null) throw new RangeError(invalidMessage)
        onCommit(parsed)
      }}
    />
  )
}

function VfoScanEdgeSelectors({
  edges,
  selections,
  onChange,
}: {
  edges: readonly VfoScanEdge[]
  selections: VfoScanEdgeSelections
  onChange(band: RadioBand, numbers: readonly number[]): void
}) {
  return (
    <div className="ml-auto flex flex-wrap items-end gap-2">
      {(["A", "B"] as const).map((band) => (
        <VfoScanEdgeSelector
          key={band}
          band={band}
          edges={edges}
          selected={selections[band]}
          onChange={onChange}
        />
      ))}
    </div>
  )
}

function VfoScanEdgeSelector({
  band,
  edges,
  selected,
  onChange,
}: {
  band: RadioBand
  edges: readonly VfoScanEdge[]
  selected: readonly number[]
  onChange(band: RadioBand, numbers: readonly number[]): void
}) {
  const t = useTranslations()
  const label = t(band === "A" ? "vfoAScanEdges" : "vfoBScanEdges")
  const triggerId = `vfo-${band.toLowerCase()}-scan-edges`
  return (
    <Field className="w-44 gap-1">
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
              ? t("noScanEdges")
              : t("selectedScanEdgesCount", { count: selected.length })}
          </span>
          <ChevronDownIcon data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="max-h-96 w-72 overflow-y-auto"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>{label}</DropdownMenuLabel>
            {edges.map((edge) => (
              <DropdownMenuCheckboxItem
                key={edge.number}
                checked={selected.includes(edge.number)}
                disabled={!edge.valid && !selected.includes(edge.number)}
                onCheckedChange={(checked) =>
                  onChange(
                    band,
                    checked
                      ? [...selected, edge.number].sort(
                          (left, right) => left - right
                        )
                      : selected.filter((number) => number !== edge.number)
                  )
                }
              >
                <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">
                  {edge.number}
                </span>
                <span className="truncate">
                  {edge.valid ? edge.name || t("unnamedScanEdge") : t("unused")}
                </span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Field>
  )
}

function parseMHz(value: string) {
  const mhz = Number(value.trim().replace(",", "."))
  const hz = Math.round(mhz * 1_000_000)
  return Number.isFinite(mhz) &&
    hz >= VFO_SCAN_EDGE_MIN_FREQUENCY_HZ &&
    hz <= VFO_SCAN_EDGE_MAX_FREQUENCY_HZ
    ? hz
    : null
}

function formatMHz(value: number) {
  return (value / 1_000_000).toFixed(6)
}

function modeLabel(
  t: ReturnType<typeof useTranslations>,
  mode: ChannelModulation
) {
  const keys = {
    fm: "valueFm",
    "fm-narrow": "valueFmNarrow",
    am: "valueAm",
    "am-narrow": "valueAmNarrow",
    unknown: "valueUnknown",
  } as const
  return t(keys[mode])
}

export { VfoScanEdgesWorkspace }
