"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  DownloadIcon,
  ScanLineIcon,
  XIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  type ChannelStepKHz,
  type RadioBand,
  type VfoScanEdge,
  type VfoScanEdgePatch,
  type VfoScanEdgeSelections,
} from "@/modules/codeplug/index"

function VfoScanEdgesWorkspace() {
  const {
    busy,
    capability,
    changes,
    completedRead,
    editVfoScanEdge,
    editVfoScanEdgeSelection,
    readRadio,
  } = useCpsWorkspace()
  const t = useTranslations()
  const [selected, setSelected] = React.useState<VfoScanEdge | null>(null)
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
            <Button
              disabled={busy || capability !== "available"}
              onClick={() => void readRadio()}
            >
              <DownloadIcon data-icon="inline-start" />
              {t("readRadio")}
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    )
  }

  const edges = codeplug.getVfoScanEdges()
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("vfoScanEdgesTitle")}>
        {changes.length > 0 && (
          <Badge>{t("pendingChangeCount", { count: changes.length })}</Badge>
        )}
        <VfoScanEdgeSelectors
          edges={edges}
          selections={codeplug.getVfoScanEdgeSelections()}
          onChange={editVfoScanEdgeSelection}
        />
      </PageHeader>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-card">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>{t("vfoScanEdgeName")}</TableHead>
                <TableHead>{t("vfoScanEdgeLowFrequency")}</TableHead>
                <TableHead>{t("vfoScanEdgeHighFrequency")}</TableHead>
                <TableHead>{t("frequencyStep")}</TableHead>
                <TableHead>{t("channelMode")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {edges.map((edge) => (
                <TableRow key={edge.number}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      className="h-auto w-full justify-start px-0 py-1"
                      aria-label={t("vfoScanEdgeTitle", {
                        number: edge.number,
                      })}
                      onClick={() => setSelected(edge)}
                    >
                      <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">
                        {edge.number}
                      </span>
                      <span className="truncate">
                        {edge.valid
                          ? edge.name || t("unnamedScanEdge")
                          : t("unused")}
                      </span>
                    </Button>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {edge.valid ? formatMHz(edge.lowFrequencyHz) : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {edge.valid ? formatMHz(edge.highFrequencyHz) : "—"}
                  </TableCell>
                  <TableCell>
                    {edge.valid ? `${edge.stepKHz} kHz` : "—"}
                  </TableCell>
                  <TableCell>
                    {edge.valid ? modeLabel(t, edge.modulation) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
      <VfoScanEdgeDrawer
        key={
          selected
            ? `${selected.number}-${selected.name}-${selected.lowFrequencyHz}-${selected.highFrequencyHz}-${selected.stepKHz}-${selected.modulation}`
            : "closed"
        }
        edge={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        onSave={(number, patch) => {
          editVfoScanEdge(number, patch)
          setSelected(null)
        }}
      />
    </main>
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

function VfoScanEdgeDrawer({
  edge,
  onOpenChange,
  onSave,
}: {
  edge: VfoScanEdge | null
  onOpenChange(open: boolean): void
  onSave(number: number, patch: VfoScanEdgePatch): void
}) {
  const t = useTranslations()
  const [draft, setDraft] = React.useState(() => edgeDraft(edge))
  const validation = validateDraft(draft)
  const stepItems = VFO_SCAN_EDGE_STEPS.map((step) => ({
    value: String(step),
    label: `${step} kHz`,
  }))
  const modeItems = VFO_SCAN_EDGE_MODES.map((mode) => ({
    value: mode,
    label: modeLabel(t, mode),
  }))

  return (
    <Drawer
      open={edge !== null}
      swipeDirection="right"
      onOpenChange={onOpenChange}
    >
      <DrawerContent className="w-[min(30rem,calc(100vw-1rem))]">
        {edge && (
          <>
            <DrawerHeader className="flex-row items-center justify-between">
              <DrawerTitle>
                {t("vfoScanEdgeTitle", { number: edge.number })}
              </DrawerTitle>
              <DrawerClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("close")}
                  />
                }
              >
                <XIcon />
              </DrawerClose>
            </DrawerHeader>
            <ScrollArea className="min-h-0 flex-1 px-4">
              <FieldGroup>
                <Field data-invalid={Boolean(validation.name)}>
                  <FieldLabel htmlFor="scan-edge-name">
                    {t("vfoScanEdgeName")}
                  </FieldLabel>
                  <Input
                    id="scan-edge-name"
                    value={draft.name}
                    aria-invalid={Boolean(validation.name)}
                    onChange={(event) =>
                      setDraft({ ...draft, name: event.target.value })
                    }
                  />
                  {validation.name && (
                    <FieldError>{t(validation.name)}</FieldError>
                  )}
                </Field>
                <FrequencyField
                  id="scan-edge-low"
                  label={t("vfoScanEdgeLowFrequency")}
                  value={draft.low}
                  error={validation.low ? t(validation.low) : undefined}
                  onChange={(low) => setDraft({ ...draft, low })}
                />
                <FrequencyField
                  id="scan-edge-high"
                  label={t("vfoScanEdgeHighFrequency")}
                  value={draft.high}
                  error={validation.high ? t(validation.high) : undefined}
                  onChange={(high) => setDraft({ ...draft, high })}
                />
                <Field>
                  <FieldLabel htmlFor="scan-edge-step">
                    {t("frequencyStep")}
                  </FieldLabel>
                  <Select
                    items={stepItems}
                    value={draft.step}
                    onValueChange={(step) =>
                      step && setDraft({ ...draft, step })
                    }
                  >
                    <SelectTrigger id="scan-edge-step" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        {stepItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="scan-edge-mode">
                    {t("channelMode")}
                  </FieldLabel>
                  <Select
                    items={modeItems}
                    value={draft.mode}
                    onValueChange={(mode) =>
                      mode && setDraft({ ...draft, mode })
                    }
                  >
                    <SelectTrigger id="scan-edge-mode" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        {modeItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                {validation.combination && (
                  <FieldError>{t(validation.combination)}</FieldError>
                )}
              </FieldGroup>
            </ScrollArea>
            <DrawerFooter>
              <Button
                disabled={Object.values(validation).some(Boolean)}
                onClick={() => onSave(edge.number, draftPatch(draft))}
              >
                {t("saveScanEdge")}
              </Button>
              <DrawerClose render={<Button variant="outline" />}>
                {t("close")}
              </DrawerClose>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}

type Draft = {
  name: string
  low: string
  high: string
  step: string
  mode: string
}

function FrequencyField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string
  label: string
  value: string
  error?: string
  onChange(value: string): void
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          className="pr-12"
          value={value}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
          MHz
        </span>
      </div>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

function edgeDraft(edge: VfoScanEdge | null): Draft {
  return {
    name: edge?.name ?? "",
    low: edge?.valid ? formatMHz(edge.lowFrequencyHz) : "144.000000",
    high: edge?.valid ? formatMHz(edge.highFrequencyHz) : "148.000000",
    step: String(
      edge?.valid && edge.stepKHz !== "unknown" ? edge.stepKHz : 12.5
    ),
    mode: edge?.valid && edge.modulation !== "unknown" ? edge.modulation : "fm",
  }
}

function validateDraft(draft: Draft) {
  const low = parseMHz(draft.low)
  const high = parseMHz(draft.high)
  return {
    name:
      new TextEncoder().encode(draft.name).byteLength > 24
        ? ("vfoScanEdgeNameTooLong" as const)
        : undefined,
    low: low === null ? ("vfoScanEdgeFrequencyInvalid" as const) : undefined,
    high:
      high === null
        ? ("vfoScanEdgeFrequencyInvalid" as const)
        : low !== null && high < low
          ? ("vfoScanEdgeRangeInvalid" as const)
          : undefined,
    combination:
      draft.step === "8.33" &&
      (draft.mode === "fm" || draft.mode === "fm-narrow")
        ? ("vfoScanEdgeStepModeInvalid" as const)
        : undefined,
  }
}

function draftPatch(draft: Draft): VfoScanEdgePatch {
  return {
    name: draft.name,
    lowFrequencyHz: parseMHz(draft.low)!,
    highFrequencyHz: parseMHz(draft.high)!,
    stepKHz: Number(draft.step) as Exclude<ChannelStepKHz, "unknown">,
    modulation: draft.mode as Exclude<ChannelModulation, "unknown">,
  }
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
