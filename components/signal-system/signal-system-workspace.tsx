"use client"

import * as React from "react"
import { AudioLinesIcon, CircleAlertIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import {
  EditableSelectCell,
  EditableTextCell,
} from "@/components/channels/editable-channel-cells"
import {
  AprsHelp,
  AprsSelectField,
  AprsSwitchField,
  AprsTextField,
} from "@/components/aprs/aprs-fields"
import { PageHeader } from "@/components/page-header"
import { RadioReadButton } from "@/components/radio-read-button"
import {
  TonePreviewButton,
  useTonePreview,
  type TonePreviewControls,
} from "@/components/signal-system/tone-preview"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  SIGNAL_SYSTEM_OPTIONS,
  isUnknownSettingValue,
  type DtmfSettings,
  type DtmfSettingsPatch,
  type FiveToneSettings,
  type FiveToneSettingsPatch,
  type TwoToneSettings,
  type TwoToneSettingsPatch,
  type UnknownSettingValue,
} from "@/modules/codeplug/index"
import {
  createDtmfPreview,
  createFiveTonePreview,
  createTwoTonePreview,
} from "@/modules/tone-preview"

type Primitive = string | number | boolean | null

function SignalSystemWorkspace() {
  const {
    busy,
    capability,
    completedRead,
    readRadio,
    editDtmfSettings,
    editTwoToneSettings,
    editFiveToneSettings,
  } = useCpsWorkspace()
  const t = useTranslations()
  const codeplug = completedRead?.workingCodeplug.codeplug ?? null
  const preview = useTonePreview()

  if (!codeplug) {
    return (
      <main className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-6 lg:p-8">
        <PageHeader title={t("signalSystemTitle")} />
        <Empty className="min-h-[32rem] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AudioLinesIcon />
            </EmptyMedia>
            <EmptyTitle>{t("signalReadRequiredTitle")}</EmptyTitle>
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

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("signalSystemTitle")} />
      {preview.error && (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>{t("signalPreviewErrorTitle")}</AlertTitle>
          <AlertDescription>
            {t(
              preview.error === "unsupported"
                ? "signalPreviewUnsupported"
                : "signalPreviewPlaybackError"
            )}
          </AlertDescription>
        </Alert>
      )}
      <Tabs defaultValue="dtmf" className="gap-6">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="dtmf">DTMF</TabsTrigger>
          <TabsTrigger value="two-tone">2-Tone</TabsTrigger>
          <TabsTrigger value="five-tone">5-Tone</TabsTrigger>
        </TabsList>
        <TabsContent value="dtmf">
          <DtmfTab
            settings={codeplug.getDtmfSettings()}
            edit={editDtmfSettings}
            preview={preview}
          />
        </TabsContent>
        <TabsContent value="two-tone">
          <TwoToneTab
            settings={codeplug.getTwoToneSettings()}
            edit={editTwoToneSettings}
            preview={preview}
          />
        </TabsContent>
        <TabsContent value="five-tone">
          <FiveToneTab
            settings={codeplug.getFiveToneSettings()}
            edit={editFiveToneSettings}
            preview={preview}
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}

function DtmfTab({
  settings,
  edit,
  preview,
}: {
  settings: DtmfSettings
  edit(patch: DtmfSettingsPatch): void
  preview: TonePreviewControls
}) {
  const t = useTranslations()
  const updateMemory = (index: number, value: string) =>
    edit({
      encodeMemories: settings.encodeMemories.map((item, i) =>
        i === index ? value : item
      ),
    })
  const updatePtt = (
    index: number,
    patch: Partial<DtmfSettings["pttIds"][number]>
  ) =>
    edit({
      pttIds: settings.pttIds.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    })
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(22rem,0.8fr)_minmax(32rem,1.2fr)]">
      <div className="grid content-start gap-6">
        <SettingsCard title={t("signalBasicSettings")}>
          <TextRow
            label={t("signalMyId")}
            value={settings.ownId}
            maxLength={8}
            onCommit={(ownId) => edit({ ownId })}
          />
          <SelectRow
            label={t("signalSeparator")}
            value={settings.separator}
            options={SIGNAL_SYSTEM_OPTIONS.dtmfSymbols}
            onChange={(separator) => edit({ separator })}
          />
          <SelectRow
            label={t("signalGroupSymbol")}
            value={settings.groupCallCode}
            options={SIGNAL_SYSTEM_OPTIONS.dtmfSymbols}
            onChange={(groupCallCode) => edit({ groupCallCode })}
          />
          <SelectRow
            label={t("signalDialerType")}
            value={settings.dialerType}
            options={SIGNAL_SYSTEM_OPTIONS.dialerTypes}
            onChange={(dialerType) => edit({ dialerType })}
          />
        </SettingsCard>
        <SettingsCard title={t("signalEncoder")}>
          <BooleanRow
            label={t("signalSideTone")}
            value={settings.transmitSidetone}
            onChange={(transmitSidetone) => edit({ transmitSidetone })}
          />
          <DurationRows settings={settings} edit={edit} />
        </SettingsCard>
        <SettingsCard title={t("signalDecoder")}>
          <SelectRow
            label={t("signalResponse")}
            value={settings.decodeResponse}
            options={SIGNAL_SYSTEM_OPTIONS.responseTypes}
            onChange={(decodeResponse) => edit({ decodeResponse })}
          />
          <NumberSelect
            label={t("signalAutoReset")}
            value={settings.autoResetSeconds}
            options={SIGNAL_SYSTEM_OPTIONS.autoResetSeconds}
            unit="s"
            onChange={(autoResetSeconds) => edit({ autoResetSeconds })}
          />
          <SelectRow
            label={t("signalAniDisplay")}
            value={settings.aniDisplay}
            options={SIGNAL_SYSTEM_OPTIONS.aniDisplayTypes}
            onChange={(aniDisplay) => edit({ aniDisplay })}
          />
        </SettingsCard>
        <SettingsCard title={t("signalRemoteControl")}>
          <TextRow
            label={t("signalKill")}
            value={settings.killCode}
            maxLength={24}
            onCommit={(killCode) => edit({ killCode })}
          />
          <TextRow
            label={t("signalStun")}
            value={settings.stunCode}
            maxLength={24}
            onCommit={(stunCode) => edit({ stunCode })}
          />
          <TextRow
            label={t("signalWakeUp")}
            value={settings.wakeCode}
            maxLength={24}
            onCommit={(wakeCode) => edit({ wakeCode })}
          />
        </SettingsCard>
      </div>
      <div className="grid content-start gap-6">
        <RecordCard
          title={t("signalDtmfMemory")}
          headers={[
            t("signalEntry"),
            t("signalCodeString"),
            t("signalPreviewAction"),
          ]}
        >
          {settings.encodeMemories.map((code, index) => (
            <TableRow key={index}>
              <TableCell className="font-mono text-muted-foreground">
                {SIGNAL_SYSTEM_OPTIONS.dtmfMemoryLabels[index]}
              </TableCell>
              <TableCell>
                <CellInput
                  value={code}
                  maxLength={24}
                  symbols="dtmf"
                  onCommit={(value) => updateMemory(index, value)}
                />
              </TableCell>
              <TableCell>
                <TonePreviewButton
                  id={`dtmf-${index}`}
                  disabled={
                    !code ||
                    isUnknownSettingValue(settings.digitDurationMs) ||
                    isUnknownSettingValue(settings.firstDigitDurationMs) ||
                    isUnknownSettingValue(settings.dCodeDelaySeconds)
                  }
                  preview={preview}
                  createSegments={() =>
                    createDtmfPreview({
                      code,
                      digitDurationMs: knownNumber(settings.digitDurationMs),
                      firstDigitDurationMs: knownNumber(
                        settings.firstDigitDurationMs
                      ),
                      dCodeDelaySeconds: knownNullableNumber(
                        settings.dCodeDelaySeconds
                      ),
                    })
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </RecordCard>
        <RecordCard
          title={t("signalPttIdList")}
          headers={["#", t("signalType"), t("signalStart"), t("signalStop")]}
        >
          {settings.pttIds.map((row, index) => (
            <TableRow key={row.number}>
              <TableCell>{row.number}</TableCell>
              <TableCell>
                <CellSelect
                  value={row.type}
                  options={SIGNAL_SYSTEM_OPTIONS.pttIdTypes}
                  onChange={(type) => updatePtt(index, { type })}
                />
              </TableCell>
              <TableCell>
                <CellInput
                  value={row.start}
                  maxLength={24}
                  symbols="dtmf"
                  onCommit={(start) => updatePtt(index, { start })}
                />
              </TableCell>
              <TableCell>
                <CellInput
                  value={row.stop}
                  maxLength={24}
                  symbols="dtmf"
                  onCommit={(stop) => updatePtt(index, { stop })}
                />
              </TableCell>
            </TableRow>
          ))}
        </RecordCard>
      </div>
    </div>
  )
}

function DurationRows({
  settings,
  edit,
}: {
  settings: DtmfSettings
  edit(patch: DtmfSettingsPatch): void
}) {
  const t = useTranslations()

  return (
    <>
      <NumberSelect
        label={t("signalTransmitTime")}
        value={settings.digitDurationMs}
        options={SIGNAL_SYSTEM_OPTIONS.dtmfDigitDurationsMs}
        unit="ms"
        onChange={(digitDurationMs) => edit({ digitDurationMs })}
      />
      <NumberSelect
        label={t("signalFirstDigitTime")}
        value={settings.firstDigitDurationMs}
        options={SIGNAL_SYSTEM_OPTIONS.firstDigitDurationsMs}
        unit="ms"
        onChange={(firstDigitDurationMs) => edit({ firstDigitDurationMs })}
      />
      <NumberSelect
        label={t("signalPreTxTime")}
        value={settings.preCarrierMs}
        options={SIGNAL_SYSTEM_OPTIONS.prePostDurationsMs}
        unit="ms"
        onChange={(preCarrierMs) => edit({ preCarrierMs })}
      />
      <NumberSelect
        label={t("signalTxEndDelay")}
        value={settings.postTransmitDelayMs}
        options={SIGNAL_SYSTEM_OPTIONS.prePostDurationsMs}
        unit="ms"
        onChange={(postTransmitDelayMs) => edit({ postTransmitDelayMs })}
      />
      <NumberSelect
        label={t("signalDCodeDelay")}
        value={settings.dCodeDelaySeconds}
        options={SIGNAL_SYSTEM_OPTIONS.dCodeDelaySeconds}
        unit="s"
        onChange={(dCodeDelaySeconds) => edit({ dCodeDelaySeconds })}
      />
      <NumberSelect
        label={t("signalPttPause")}
        value={settings.pttIdPauseSeconds}
        options={SIGNAL_SYSTEM_OPTIONS.pttIdPauseSeconds}
        unit="s"
        onChange={(pttIdPauseSeconds) => edit({ pttIdPauseSeconds })}
      />
    </>
  )
}

function TwoToneTab({
  settings,
  edit,
  preview,
}: {
  settings: TwoToneSettings
  edit(patch: TwoToneSettingsPatch): void
  preview: TonePreviewControls
}) {
  const t = useTranslations()
  const updateEncode = (
    index: number,
    patch: Partial<TwoToneSettings["encodeRecords"][number]>
  ) =>
    edit({
      encodeRecords: settings.encodeRecords.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    })
  const updateDecode = (
    index: number,
    patch: Partial<TwoToneSettings["decodeRecords"][number]>
  ) =>
    edit({
      decodeRecords: settings.decodeRecords.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    })
  return (
    <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
      <SettingsCard title={t("signalBasicSettings")}>
        <NumberSelect
          label={t("signalFirstToneDuration")}
          value={settings.tone1DurationMs}
          options={SIGNAL_SYSTEM_OPTIONS.twoToneDurationsMs}
          unit="ms"
          onChange={(tone1DurationMs) => edit({ tone1DurationMs })}
        />
        <NumberSelect
          label={t("signalSecondToneDuration")}
          value={settings.tone2DurationMs}
          options={SIGNAL_SYSTEM_OPTIONS.twoToneDurationsMs}
          unit="ms"
          onChange={(tone2DurationMs) => edit({ tone2DurationMs })}
        />
        <NumberSelect
          label={t("signalLongToneDuration")}
          value={settings.longToneDurationMs}
          options={SIGNAL_SYSTEM_OPTIONS.twoToneDurationsMs}
          unit="ms"
          onChange={(longToneDurationMs) => edit({ longToneDurationMs })}
        />
        <NumberSelect
          label={t("signalToneGap")}
          value={settings.toneGapMs}
          options={SIGNAL_SYSTEM_OPTIONS.twoToneGapDurationsMs}
          unit="ms"
          onChange={(toneGapMs) => edit({ toneGapMs })}
        />
        <BooleanRow
          label={t("signalSideTone")}
          value={settings.transmitSidetone}
          onChange={(transmitSidetone) => edit({ transmitSidetone })}
        />
        <NumberSelect
          label={t("signalAutoReset")}
          value={settings.autoResetSeconds}
          options={SIGNAL_SYSTEM_OPTIONS.autoResetSeconds}
          unit="s"
          onChange={(autoResetSeconds) => edit({ autoResetSeconds })}
        />
      </SettingsCard>
      <div className="grid content-start gap-6 2xl:grid-cols-2">
        <RecordCard
          title={t("signalEncoderList")}
          headers={[
            "#",
            t("signalTone1"),
            t("signalTone2"),
            t("signalName"),
            t("signalPreviewAction"),
          ]}
        >
          {settings.encodeRecords.map((row, index) => (
            <TableRow key={row.number}>
              <TableCell>{row.label}</TableCell>
              <TableCell>
                <FrequencyInput
                  value={row.tone1Hz}
                  onCommit={(tone1Hz) => updateEncode(index, { tone1Hz })}
                />
              </TableCell>
              <TableCell>
                <FrequencyInput
                  value={row.tone2Hz}
                  onCommit={(tone2Hz) => updateEncode(index, { tone2Hz })}
                />
              </TableCell>
              <TableCell>
                <CellInput
                  value={row.name}
                  maxLength={8}
                  onCommit={(name) => updateEncode(index, { name })}
                />
              </TableCell>
              <TableCell>
                <TonePreviewButton
                  id={`two-tone-${index}`}
                  disabled={
                    (row.tone1Hz === null && row.tone2Hz === null) ||
                    isUnknownSettingValue(settings.tone1DurationMs) ||
                    isUnknownSettingValue(settings.tone2DurationMs) ||
                    isUnknownSettingValue(settings.longToneDurationMs) ||
                    isUnknownSettingValue(settings.toneGapMs)
                  }
                  preview={preview}
                  createSegments={() =>
                    createTwoTonePreview({
                      tone1Hz: row.tone1Hz,
                      tone2Hz: row.tone2Hz,
                      tone1DurationMs: knownNumber(settings.tone1DurationMs),
                      tone2DurationMs: knownNumber(settings.tone2DurationMs),
                      longToneDurationMs: knownNumber(
                        settings.longToneDurationMs
                      ),
                      toneGapMs: knownNumber(settings.toneGapMs),
                    })
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </RecordCard>
        <RecordCard
          title={t("signalDecoderList")}
          headers={[
            "#",
            t("signalTone1"),
            t("signalTone2"),
            t("signalResponse"),
            t("signalName"),
          ]}
        >
          {settings.decodeRecords.map((row, index) => (
            <TableRow key={row.number}>
              <TableCell>{row.number}</TableCell>
              <TableCell>
                <FrequencyInput
                  value={row.tone1Hz}
                  onCommit={(tone1Hz) => updateDecode(index, { tone1Hz })}
                />
              </TableCell>
              <TableCell>
                <FrequencyInput
                  value={row.tone2Hz}
                  onCommit={(tone2Hz) => updateDecode(index, { tone2Hz })}
                />
              </TableCell>
              <TableCell>
                <CellSelect
                  value={row.response}
                  options={SIGNAL_SYSTEM_OPTIONS.responseTypes}
                  onChange={(response) => updateDecode(index, { response })}
                />
              </TableCell>
              <TableCell>
                <CellInput
                  value={row.name}
                  maxLength={8}
                  onCommit={(name) => updateDecode(index, { name })}
                />
              </TableCell>
            </TableRow>
          ))}
        </RecordCard>
      </div>
    </div>
  )
}

function FiveToneTab({
  settings,
  edit,
  preview,
}: {
  settings: FiveToneSettings
  edit(patch: FiveToneSettingsPatch): void
  preview: TonePreviewControls
}) {
  const t = useTranslations()
  const updateEncode = (
    index: number,
    patch: Partial<FiveToneSettings["encodeRecords"][number]>
  ) =>
    edit({
      encodeRecords: settings.encodeRecords.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    })
  const updatePtt = (
    index: number,
    patch: Partial<FiveToneSettings["pttIds"][number]>
  ) =>
    edit({
      pttIds: settings.pttIds.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    })
  const updateInfo = (
    index: number,
    patch: Partial<FiveToneSettings["informationCodes"][number]>
  ) =>
    edit({
      informationCodes: settings.informationCodes.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    })
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <div className="grid content-start gap-6">
          <SettingsCard title={t("signalBasicSettings")}>
            <TextRow
              label={t("signalMyId")}
              value={settings.ownId}
              maxLength={8}
              symbols="five-tone"
              onCommit={(ownId) => edit({ ownId })}
            />
          </SettingsCard>
          <SettingsCard title={t("signalEncoder")}>
            <BooleanRow
              label={t("signalSideTone")}
              value={settings.transmitSidetone}
              onChange={(transmitSidetone) => edit({ transmitSidetone })}
            />
            <NumberSelect
              label={t("signalPreTxTime")}
              value={settings.preCarrierMs}
              options={SIGNAL_SYSTEM_OPTIONS.prePostDurationsMs}
              unit="ms"
              onChange={(preCarrierMs) => edit({ preCarrierMs })}
            />
            <NumberSelect
              label={t("signalTxEndDelay")}
              value={settings.postTransmitDelayMs}
              options={SIGNAL_SYSTEM_OPTIONS.prePostDurationsMs}
              unit="ms"
              onChange={(postTransmitDelayMs) => edit({ postTransmitDelayMs })}
            />
            <NumberSelect
              label={t("signalFirstDigitTime")}
              value={settings.firstDigitDurationMs}
              options={SIGNAL_SYSTEM_OPTIONS.firstDigitDurationsMs}
              unit="ms"
              onChange={(firstDigitDurationMs) =>
                edit({ firstDigitDurationMs })
              }
            />
            <SelectRow
              label={t("signalPauseCode")}
              value={settings.pauseCode}
              options={SIGNAL_SYSTEM_OPTIONS.fiveTonePauseCodes}
              onChange={(pauseCode) => edit({ pauseCode })}
            />
            <NumberSelect
              label={t("signalPauseTime")}
              value={settings.pauseDurationMs}
              options={SIGNAL_SYSTEM_OPTIONS.fiveTonePauseDurationsMs}
              unit="ms"
              onChange={(pauseDurationMs) => edit({ pauseDurationMs })}
            />
            <NumberSelect
              label={t("signalPostPauseTone")}
              value={settings.firstToneAfterPauseMs}
              options={SIGNAL_SYSTEM_OPTIONS.firstDigitDurationsMs}
              unit="ms"
              onChange={(firstToneAfterPauseMs) =>
                edit({ firstToneAfterPauseMs })
              }
            />
            <NumberSelect
              label={t("signalPttPause")}
              value={settings.pttIdPauseSeconds}
              options={SIGNAL_SYSTEM_OPTIONS.pttIdPauseSeconds}
              unit="s"
              onChange={(pttIdPauseSeconds) => edit({ pttIdPauseSeconds })}
            />
          </SettingsCard>
          <SettingsCard title={t("signalDecoder")}>
            <SelectRow
              label={t("signalStandard")}
              value={settings.decodeStandard}
              options={SIGNAL_SYSTEM_OPTIONS.fiveToneStandards}
              onChange={(decodeStandard) => edit({ decodeStandard })}
            />
            <Field orientation="responsive">
              <FieldContent>
                <div className="flex items-center gap-1">
                  <FieldLabel>{t("signalDecodeBits")}</FieldLabel>
                  <AprsHelp
                    label={t("signalDecodeBits")}
                    hint={t("signalDecodeBitsHint")}
                  />
                </div>
              </FieldContent>
              <div className="flex gap-3">
                {Array.from({ length: 8 }, (_, bit) => (
                  <Checkbox
                    key={bit}
                    checked={Boolean(settings.decodeDigitMask & (1 << bit))}
                    aria-label={`${t("signalDecodeBits")} ${bit + 1}`}
                    onCheckedChange={(checked) =>
                      edit({
                        decodeDigitMask: checked
                          ? settings.decodeDigitMask | (1 << bit)
                          : settings.decodeDigitMask & ~(1 << bit),
                      })
                    }
                  />
                ))}
              </div>
            </Field>
            <SelectRow
              label={t("signalResponse")}
              value={settings.decodeResponse}
              options={SIGNAL_SYSTEM_OPTIONS.responseTypes}
              onChange={(decodeResponse) => edit({ decodeResponse })}
            />
            <NumberSelect
              label={t("signalAutoReset")}
              value={settings.autoResetSeconds}
              options={SIGNAL_SYSTEM_OPTIONS.autoResetSeconds}
              unit="s"
              onChange={(autoResetSeconds) => edit({ autoResetSeconds })}
            />
            <SelectRow
              label={t("signalAniDisplay")}
              value={settings.aniDisplay}
              options={SIGNAL_SYSTEM_OPTIONS.aniDisplayTypes}
              onChange={(aniDisplay) => edit({ aniDisplay })}
            />
          </SettingsCard>
        </div>
        <div className="grid content-start gap-6 2xl:grid-cols-2">
          <RecordCard
            title={t("signalFiveToneEncodeList")}
            headers={[
              "#",
              t("signalStandard"),
              t("signalCode"),
              t("signalName"),
              t("signalPreviewAction"),
            ]}
          >
            {settings.encodeRecords.map((row, index) => (
              <TableRow key={row.number}>
                <TableCell>{row.label}</TableCell>
                <TableCell>
                  <CellSelect
                    value={row.standard}
                    options={SIGNAL_SYSTEM_OPTIONS.fiveToneStandards}
                    onChange={(standard) => updateEncode(index, { standard })}
                  />
                </TableCell>
                <TableCell>
                  <CellInput
                    value={row.code}
                    maxLength={24}
                    symbols="five-tone"
                    onCommit={(code) => updateEncode(index, { code })}
                  />
                </TableCell>
                <TableCell>
                  <CellInput
                    value={row.name}
                    maxLength={8}
                    onCommit={(name) => updateEncode(index, { name })}
                  />
                </TableCell>
                <TableCell>
                  <TonePreviewButton
                    id={`five-tone-${index}`}
                    disabled={
                      !row.code ||
                      isUnknownSettingValue(row.standard) ||
                      isUnknownSettingValue(settings.firstDigitDurationMs) ||
                      isUnknownSettingValue(settings.pauseCode) ||
                      isUnknownSettingValue(settings.pauseDurationMs) ||
                      isUnknownSettingValue(settings.firstToneAfterPauseMs)
                    }
                    preview={preview}
                    createSegments={() =>
                      createFiveTonePreview({
                        standard: knownValue(row.standard),
                        code: row.code,
                        firstDigitDurationMs: knownNumber(
                          settings.firstDigitDurationMs
                        ),
                        pauseCode: knownValue(settings.pauseCode),
                        pauseDurationMs: knownNumber(settings.pauseDurationMs),
                        firstToneAfterPauseMs: knownNumber(
                          settings.firstToneAfterPauseMs
                        ),
                      })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </RecordCard>
          <RecordCard
            title={t("signalInfoCodeList")}
            headers={["#", t("signalFunction"), t("signalCode")]}
          >
            {settings.informationCodes.map((row, index) => (
              <TableRow key={row.number}>
                <TableCell>{row.number}</TableCell>
                <TableCell>
                  <CellSelect
                    value={row.function}
                    options={SIGNAL_SYSTEM_OPTIONS.fiveToneInformationFunctions}
                    onChange={(value) => updateInfo(index, { function: value })}
                  />
                </TableCell>
                <TableCell>
                  <CellInput
                    value={row.code}
                    maxLength={24}
                    symbols="five-tone"
                    onCommit={(code) => updateInfo(index, { code })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </RecordCard>
        </div>
      </div>
      <RecordCard
        title={t("signalPttIdList")}
        headers={[
          "#",
          t("signalType"),
          t("signalStandard"),
          t("signalStart"),
          t("signalStop"),
        ]}
      >
        {settings.pttIds.map((row, index) => (
          <TableRow key={row.number}>
            <TableCell>{row.number}</TableCell>
            <TableCell>
              <CellSelect
                value={row.type}
                options={SIGNAL_SYSTEM_OPTIONS.pttIdTypes}
                onChange={(type) => updatePtt(index, { type })}
              />
            </TableCell>
            <TableCell>
              <CellSelect
                value={row.standard}
                options={SIGNAL_SYSTEM_OPTIONS.fiveToneStandards}
                onChange={(standard) => updatePtt(index, { standard })}
              />
            </TableCell>
            <TableCell>
              <CellInput
                value={row.start}
                maxLength={24}
                symbols="five-tone"
                onCommit={(start) => updatePtt(index, { start })}
              />
            </TableCell>
            <TableCell>
              <CellInput
                value={row.stop}
                maxLength={24}
                symbols="five-tone"
                onCommit={(stop) => updatePtt(index, { stop })}
              />
            </TableCell>
          </TableRow>
        ))}
      </RecordCard>
    </div>
  )
}

function SettingsCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>{children}</FieldGroup>
      </CardContent>
    </Card>
  )
}
function RecordCard({
  title,
  headers,
  children,
}: {
  title: string
  headers: readonly string[]
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table containerClassName="max-h-[38rem] rounded-lg border">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              {headers.map((header, index) => (
                <TableHead key={`${header}-${index}`}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{children}</TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function TextRow({
  label,
  value,
  maxLength,
  symbols = "dtmf",
  onCommit,
}: {
  label: string
  value: string
  maxLength: number
  symbols?: "dtmf" | "five-tone"
  onCommit(value: string): void
}) {
  const t = useTranslations()
  const id = React.useId()
  return (
    <AprsTextField
      id={id}
      label={label}
      hint={t("signalSettingHint", { setting: label })}
      value={value}
      maxLength={maxLength}
      normalize={(next) => next.trim().toUpperCase()}
      validate={(next) =>
        (symbols === "dtmf" ? /^[0-9A-D*#]*$/ : /^[0-9A-F*#]*$/).test(next)
          ? null
          : t("signalInvalidCode")
      }
      onChange={onCommit}
    />
  )
}
function BooleanRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean | UnknownSettingValue
  onChange(value: boolean): void
}) {
  const t = useTranslations()
  const id = React.useId()
  return (
    <AprsSwitchField
      id={id}
      label={label}
      hint={t("signalSettingHint", { setting: label })}
      value={value}
      unknownLabel={t("valueUnknownStored")}
      offLabel={t("valueOff")}
      onLabel={t("valueOn")}
      onChange={onChange}
    />
  )
}
function SelectRow<T extends Primitive>({
  label,
  value,
  options,
  formatUnit,
  onChange,
}: {
  label: string
  value: T | UnknownSettingValue
  options: readonly T[]
  formatUnit?: string
  onChange(value: T): void
}) {
  const t = useTranslations()
  const id = React.useId()
  return (
    <AprsSelectField
      id={id}
      label={label}
      hint={t("signalSettingHint", { setting: label })}
      value={value}
      options={options.map((option) => ({
        value: encodeOption(option),
        label: signalOptionLabel(option, t, formatUnit),
        original: option,
      }))}
      unknownLabel={t("valueUnknownStored")}
      onChange={onChange}
    />
  )
}
function NumberSelect<T extends number | null>({
  label,
  value,
  options,
  unit,
  onChange,
}: {
  label: string
  value: T | UnknownSettingValue
  options: readonly T[]
  unit: string
  onChange(value: T): void
}) {
  return (
    <SelectRow
      label={label}
      value={value}
      options={options}
      formatUnit={unit}
      onChange={onChange}
    />
  )
}

function CellSelect<T extends Primitive>({
  value,
  options,
  ariaLabel,
  onChange,
}: {
  value: T | UnknownSettingValue
  options: readonly T[]
  ariaLabel?: string
  onChange(value: T): void
}) {
  const t = useTranslations()
  const resolvedAriaLabel = ariaLabel ?? t("signalEditableValue")
  const selected = isUnknownSettingValue(value) ? null : encodeOption(value)
  const items = options.map((option) => ({
    value: encodeOption(option),
    label: signalOptionLabel(option, t),
    original: option,
  }))
  return (
    <EditableSelectCell
      value={selected ?? ""}
      options={items}
      ariaLabel={resolvedAriaLabel}
      placeholder={
        isUnknownSettingValue(value)
          ? `${t("valueUnknownStored")}: 0x${value.raw.toString(16).padStart(2, "0")}`
          : undefined
      }
      onCommit={(_, option) => onChange(option.original)}
    />
  )
}

function CellInput({
  value,
  maxLength,
  symbols,
  ariaLabel,
  onCommit,
}: {
  value: string
  maxLength: number
  symbols?: "dtmf" | "five-tone"
  ariaLabel?: string
  onCommit(value: string): void
}) {
  const t = useTranslations()
  const resolvedAriaLabel = ariaLabel ?? t("signalEditableValue")
  const pattern =
    symbols === "dtmf"
      ? /^[0-9A-D*#]*$/
      : symbols === "five-tone"
        ? /^[0-9A-F*#]*$/
        : /^[\x20-\x7E]*$/
  return (
    <EditableTextCell
      value={value}
      displayValue={value || "-"}
      ariaLabel={resolvedAriaLabel}
      invalidMessage={symbols ? t("signalInvalidCode") : t("signalInvalidText")}
      validate={(next) => next.length <= maxLength && pattern.test(next)}
      onCommit={(next) => onCommit(symbols ? next.toUpperCase() : next)}
    />
  )
}

function FrequencyInput({
  value,
  onCommit,
}: {
  value: number | null
  onCommit(value: number | null): void
}) {
  const t = useTranslations()
  const source = value === null ? "" : value.toFixed(1)
  return (
    <EditableTextCell
      value={source}
      displayValue={value === null ? "-" : `${value.toFixed(1)} Hz`}
      ariaLabel={t("signalFrequencyAria")}
      inputMode="decimal"
      invalidMessage={t("signalFrequencyInvalid")}
      validate={(draft) => {
        const normalized = draft.trim().replace(",", ".")
        if (normalized === "") return true
        const next = Number(normalized)
        return (
          Number.isFinite(next) &&
          next >= 288 &&
          next <= 3106 &&
          Math.round(next * 10) === next * 10
        )
      }}
      onCommit={(draft) => {
        const normalized = draft.trim().replace(",", ".")
        onCommit(normalized === "" ? null : Number(normalized))
      }}
    />
  )
}

function knownNumber(value: number | UnknownSettingValue) {
  if (isUnknownSettingValue(value)) throw new Error("Unknown tone duration")
  return value
}

function knownNullableNumber(
  value: number | null | UnknownSettingValue
): number | null {
  if (isUnknownSettingValue(value)) throw new Error("Unknown tone duration")
  return value
}

function knownValue<T>(value: T | UnknownSettingValue): T {
  if (isUnknownSettingValue(value)) throw new Error("Unknown tone setting")
  return value
}

function encodeOption(value: Primitive) {
  return value === null ? "__none" : `${typeof value}:${String(value)}`
}
function signalOptionLabel(
  value: Primitive,
  t: ReturnType<typeof useTranslations>,
  unit?: string
) {
  if (value === null) return t("valueOff")
  if (value === true) return t("valueOn")
  if (value === false) return t("valueOff")
  if (typeof value === "number" && unit === "ms")
    return t("valueMilliseconds", { value })
  if (typeof value === "number" && unit === "s")
    return t("valueSeconds", { value })
  if (value === "manual") return t("signalOptionManual")
  if (value === "automatic") return t("signalOptionAutomatic")
  if (value === "none") return t("valueNone")
  if (value === "beep") return t("signalOptionBeep")
  if (value === "beep-and-respond") return t("signalOptionBeepRespond")
  if (value === "off") return t("valueOff")
  if (value === "matched-id") return t("signalOptionMatchedId")
  if (value === "any-id") return t("signalOptionAnyId")
  if (value === "tx-start") return t("signalOptionTxStart")
  if (value === "tx-stop") return t("signalOptionTxStop")
  if (value === "tx-start-stop") return t("signalOptionTxStartStop")
  if (value === "selective-call") return t("signalOptionSelectiveCall")
  if (value === "group-call") return t("signalOptionGroupCall")
  if (value === "all-call") return t("signalOptionAllCall")
  if (value === "stun") return t("signalStun")
  if (value === "kill") return t("signalKill")
  if (value === "activate") return t("signalOptionActivate")
  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export { SignalSystemWorkspace }
