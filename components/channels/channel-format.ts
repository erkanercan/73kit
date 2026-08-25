import type { useTranslations } from "next-intl"

import type { Channel } from "@/modules/codeplug/index"

type ChannelTranslations = ReturnType<typeof useTranslations>

function formatFrequency(frequencyHz: number) {
  return `${(frequencyHz / 1_000_000).toFixed(6)} MHz`
}

function formatTone(tone: Channel["transmitTone"], t: ChannelTranslations) {
  if (tone.kind === "off") {
    return t("valueOff")
  }
  if (tone.kind === "unknown") {
    return t("valueUnknown")
  }
  const suffix = tone.reverse ? ` (${t("dcsReverseSuffix")})` : ""
  return tone.kind === "ctcss"
    ? `${tone.frequencyHz.toFixed(1)} Hz${suffix}`
    : `D${tone.code}${suffix}`
}

function formatOptionalSignaling(
  signaling: Channel["optionalSignaling"],
  t: ChannelTranslations
) {
  const kind = channelValue(signaling.kind, t)
  return signaling.kind === "off" || signaling.kind === "unknown"
    ? kind
    : `${kind} · ${signaling.index}`
}

function channelValue(value: string | number, t: ChannelTranslations) {
  const labels: Record<string, string> = {
    off: t("valueOff"),
    negative: t("valueNegative"),
    positive: t("valuePositive"),
    split: t("valueSplit"),
    "talk-around": t("valueTalkAround"),
    reverse: t("valueReverse"),
    reserved: t("valueReserved"),
    fm: t("valueFm"),
    "fm-narrow": t("valueFmNarrow"),
    am: t("valueAm"),
    "am-narrow": t("valueAmNarrow"),
    unknown: t("valueUnknown"),
    low: t("valueLow"),
    medium: t("valueMedium"),
    high: t("valueHigh"),
    normal: t("valueNormal"),
    skip: t("valueSkip"),
    priority: t("valuePriority"),
    repeater: t("valueRepeater"),
    carrier: t("valueCarrier"),
    tone: t("valueTone"),
    "optional-signaling": t("valueOptionalSignaling"),
    "tone-and-optional-signaling": t("valueToneAndOptional"),
    "tone-or-optional-signaling": t("valueToneOrOptional"),
    transmit: t("valueTransmit"),
    receive: t("valueReceive"),
    "transmit-and-receive": t("valueTransmitAndReceive"),
    "tx-normal-rx-inverted": "TX Normal / RX Inverted",
    "tx-inverted-rx-normal": "TX Inverted / RX Normal",
    inverted: "TX Inverted / RX Inverted",
    dtmf: t("valueDtmf"),
    "two-tone": t("valueTwoTone"),
    "five-tone": t("valueFiveTone"),
    on: t("valueOn"),
    "on-muted": t("valueOnMuted"),
  }

  return labels[String(value)] ?? String(value)
}

export { channelValue, formatFrequency, formatOptionalSignaling, formatTone }
export type { ChannelTranslations }
