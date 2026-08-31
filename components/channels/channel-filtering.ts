import type { Channel, ScanList, Zone } from "@/modules/codeplug/index"

type ChannelModulationFilter = "all" | Channel["modulation"]
type ChannelToneFilter = "all" | "off" | "ctcss" | "dcs"

interface ChannelFilters {
  readonly modulation: ChannelModulationFilter
  readonly tone: ChannelToneFilter
  readonly zoneNumber: number | null
  readonly scanListNumber: number | null
}

type ChannelAdvisory =
  "receive-tone-enabled" | "outside-published-amateur-tx-bands"

const DEFAULT_CHANNEL_FILTERS: ChannelFilters = Object.freeze({
  modulation: "all",
  tone: "all",
  zoneNumber: null,
  scanListNumber: null,
})

function filterMemoryChannels(
  channels: readonly Channel[],
  zones: readonly Zone[],
  scanLists: readonly ScanList[],
  options: {
    readonly usedOnly: boolean
    readonly query: string
    readonly filters: ChannelFilters
  }
) {
  const query = options.query.trim().toLocaleLowerCase()
  const zone = options.filters.zoneNumber
    ? zones.find((candidate) => candidate.number === options.filters.zoneNumber)
    : undefined
  const scanList = options.filters.scanListNumber
    ? scanLists.find(
        (candidate) => candidate.number === options.filters.scanListNumber
      )
    : undefined

  return channels.filter((channel) => {
    if (options.usedOnly && !channel.valid) return false
    if (
      options.filters.modulation !== "all" &&
      channel.modulation !== options.filters.modulation
    ) {
      return false
    }
    if (
      options.filters.tone !== "all" &&
      !channelHasToneKind(channel, options.filters.tone)
    ) {
      return false
    }
    if (zone && !zone.channelNumbers.includes(channel.number)) return false
    if (scanList && !scanList.channelNumbers.includes(channel.number)) {
      return false
    }
    if (!query) return true

    return channelSearchValues(channel).some((value) =>
      value.toLocaleLowerCase().includes(query)
    )
  })
}

function channelSearchValues(channel: Channel) {
  return [
    String(channel.number),
    channel.name,
    ...channel.zoneNames,
    ...channel.scanListNames,
    formatSearchFrequency(channel.receiveFrequencyHz),
    formatSearchFrequency(channel.transmitFrequencyHz),
    channel.modulation,
    modulationAlias(channel.modulation),
    toneSearchValue(channel.transmitTone),
    toneSearchValue(channel.receiveTone),
  ]
}

function channelHasToneKind(
  channel: Channel,
  kind: Exclude<ChannelToneFilter, "all">
) {
  return kind === "off"
    ? channel.transmitTone.kind === "off" && channel.receiveTone.kind === "off"
    : channel.transmitTone.kind === kind || channel.receiveTone.kind === kind
}

function channelAdvisories(channel: Channel): readonly ChannelAdvisory[] {
  if (!channel.valid) return Object.freeze([])
  const advisories: ChannelAdvisory[] = []

  if (
    channel.receiveTone.kind === "ctcss" ||
    channel.receiveTone.kind === "dcs"
  ) {
    advisories.push("receive-tone-enabled")
  }
  if (
    !channel.receiveOnly &&
    !isWithinPublishedAmateurTxBands(channel.transmitFrequencyHz)
  ) {
    advisories.push("outside-published-amateur-tx-bands")
  }

  return Object.freeze(advisories)
}

function isWithinPublishedAmateurTxBands(frequencyHz: number) {
  return (
    (frequencyHz >= 144_000_000 && frequencyHz <= 148_000_000) ||
    (frequencyHz >= 420_000_000 && frequencyHz <= 450_000_000)
  )
}

function toneSearchValue(tone: Channel["transmitTone"]) {
  switch (tone.kind) {
    case "off":
    case "unknown":
      return tone.kind
    case "ctcss":
      return `ctcss ${tone.frequencyHz.toFixed(1)} hz`
    case "dcs":
      return `dcs dtcs ${tone.code}`
  }
}

function modulationAlias(modulation: Channel["modulation"]) {
  const aliases: Record<Channel["modulation"], string> = {
    fm: "fm",
    "fm-narrow": "fm-n narrow",
    am: "am",
    "am-narrow": "am-n narrow",
    unknown: "unknown",
  }
  return aliases[modulation]
}

function formatSearchFrequency(frequencyHz: number) {
  const mhz = frequencyHz / 1_000_000
  return `${mhz.toFixed(6)} ${mhz.toString()} mhz`
}

function countActiveChannelFilters(filters: ChannelFilters) {
  return [
    filters.modulation !== "all",
    filters.tone !== "all",
    filters.zoneNumber !== null,
    filters.scanListNumber !== null,
  ].filter(Boolean).length
}

export {
  DEFAULT_CHANNEL_FILTERS,
  channelAdvisories,
  countActiveChannelFilters,
  filterMemoryChannels,
}
export type {
  ChannelAdvisory,
  ChannelFilters,
  ChannelModulationFilter,
  ChannelToneFilter,
}
