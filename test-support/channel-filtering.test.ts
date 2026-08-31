import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_CHANNEL_FILTERS,
  channelAdvisories,
  filterMemoryChannels,
} from "../components/channels/channel-filtering.ts"
import type { Channel, ScanList, Zone } from "../modules/codeplug/index.ts"

const channels = [
  channel({
    number: 1,
    name: "Local FM",
    modulation: "fm",
    zoneNames: ["Home"],
    scanListNames: ["Daily"],
    transmitTone: { kind: "ctcss", frequencyHz: 88.5 },
    receiveTone: { kind: "ctcss", frequencyHz: 88.5 },
  }),
  channel({
    number: 2,
    name: "Airband",
    modulation: "am",
    receiveFrequencyHz: 125_000_000,
    transmitFrequencyHz: 125_000_000,
    receiveOnly: true,
  }),
] satisfies Channel[]

const zones = [
  { number: 1, name: "Home", channelNumbers: [1] },
] satisfies Zone[]
const scanLists = [
  { number: 1, name: "Daily", channelNumbers: [1] },
] satisfies ScanList[]

test("searches Memory Channels by mode, tone, Zone, and Scan List", () => {
  for (const query of ["fm", "88.5", "ctcss", "home", "daily"]) {
    assert.deepEqual(
      filterMemoryChannels(channels, zones, scanLists, {
        usedOnly: true,
        query,
        filters: DEFAULT_CHANNEL_FILTERS,
      }).map(({ number }) => number),
      [1]
    )
  }
})

test("combines explicit mode, tone, Zone, and Scan List filters", () => {
  assert.deepEqual(
    filterMemoryChannels(channels, zones, scanLists, {
      usedOnly: true,
      query: "",
      filters: {
        modulation: "fm",
        tone: "ctcss",
        zoneNumber: 1,
        scanListNumber: 1,
      },
    }).map(({ number }) => number),
    [1]
  )
})

test("reports advisory RX tones and published amateur TX-band exceptions", () => {
  assert.deepEqual(channelAdvisories(channels[0]), ["receive-tone-enabled"])
  assert.deepEqual(
    channelAdvisories(
      channel({ transmitFrequencyHz: 155_000_000, receiveOnly: false })
    ),
    ["outside-published-amateur-tx-bands"]
  )
  assert.deepEqual(channelAdvisories(channels[1]), [])
})

function channel(overrides: Partial<Channel> = {}): Channel {
  return {
    number: 1,
    valid: true,
    scan: "off",
    zoneNames: [],
    scanListNames: [],
    name: "",
    receiveFrequencyHz: 145_500_000,
    transmitFrequencyHz: 145_500_000,
    offsetFrequencyHz: 0,
    duplex: "off",
    reverse: "off",
    stepKHz: 12.5,
    modulation: "fm",
    transmitPower: "low",
    receiveOnly: false,
    busyChannelLockout: "off",
    squelch: "carrier",
    transmitTone: { kind: "off" },
    receiveTone: { kind: "off" },
    dcsPolarity: "normal",
    compander: "off",
    optionalSignaling: { kind: "off", index: 0 },
    scrambler: "off",
    pttId: "off",
    aprsReceive: "off",
    ...overrides,
  }
}
