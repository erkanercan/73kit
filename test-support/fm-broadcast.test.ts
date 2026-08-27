import assert from "node:assert/strict"
import test from "node:test"

import {
  CODEPLUG_SIZE,
  FM_BROADCAST_CHANNELS_OFFSET,
  FM_BROADCAST_CHANNEL_RECORD_SIZE,
  FM_BROADCAST_ENABLED_OFFSET,
  FM_BROADCAST_MODE_OFFSET,
  FM_BROADCAST_VALIDITY_OFFSET,
  FM_BROADCAST_VFO_FREQUENCY_OFFSET,
  createCodeplug,
  isUnknownSettingValue,
  type FmBroadcastMode,
} from "../modules/codeplug/index.ts"
import {
  reconcileFmBroadcastChannelChanges,
  reconcileFmBroadcastSettingChanges,
} from "../modules/cps-workspace/change-set.ts"

test("decodes all FM Broadcast channels and documented settings", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE).fill(0xff)
  const firstRecord = FM_BROADCAST_CHANNELS_OFFSET
  const lastRecord =
    FM_BROADCAST_CHANNELS_OFFSET + 31 * FM_BROADCAST_CHANNEL_RECORD_SIZE

  writeUint32BigEndian(bytes, firstRecord, 90_400_000)
  bytes.set(new TextEncoder().encode("RADIO 1"), firstRecord + 4)
  bytes[firstRecord + 11] = 0
  writeUint32BigEndian(bytes, lastRecord, 107_900_000)
  bytes.set(new TextEncoder().encode("LAST"), lastRecord + 4)
  bytes[lastRecord + 8] = 0
  bytes[FM_BROADCAST_VALIDITY_OFFSET] = 0x01
  bytes[FM_BROADCAST_VALIDITY_OFFSET + 3] = 0x80
  bytes[FM_BROADCAST_ENABLED_OFFSET] = 0x01
  bytes[FM_BROADCAST_MODE_OFFSET] = 0x06
  writeUint32BigEndian(bytes, FM_BROADCAST_VFO_FREQUENCY_OFFSET, 99_500_000)

  const codeplug = createCodeplug(bytes)
  const channels = codeplug.getFmBroadcastChannels()

  assert.equal(channels.length, 32)
  assert.deepEqual(channels[0], {
    number: 0,
    valid: true,
    name: "RADIO 1",
    frequencyHz: 90_400_000,
  })
  assert.deepEqual(channels[31], {
    number: 31,
    valid: true,
    name: "LAST",
    frequencyHz: 107_900_000,
  })
  assert.deepEqual(codeplug.getFmBroadcastSettings(), {
    enabled: true,
    mode: "memory",
    vfoFrequencyHz: 99_500_000,
  })
})

test("edits FM Broadcast records and settings without changing reserved bytes", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE).fill(0xaa)
  bytes[FM_BROADCAST_VALIDITY_OFFSET] = 0
  const baseline = createCodeplug(bytes)
  const edited = baseline
    .editFmBroadcastChannel(3, {
      valid: true,
      name: "JAZZ FM",
      frequencyHz: 101_700_000,
    })
    .editFmBroadcastSettings({
      enabled: false,
      mode: "vfo",
      vfoFrequencyHz: 88_000_000,
    })
  const result = edited.toBytes()
  const recordOffset =
    FM_BROADCAST_CHANNELS_OFFSET + 3 * FM_BROADCAST_CHANNEL_RECORD_SIZE

  assert.equal(result[FM_BROADCAST_VALIDITY_OFFSET], 0x08)
  assert.deepEqual(
    Array.from(result.slice(recordOffset, recordOffset + 4)),
    [0x06, 0x0f, 0xd1, 0xa0]
  )
  assert.equal(
    new TextDecoder().decode(result.slice(recordOffset + 4, recordOffset + 11)),
    "JAZZ FM"
  )
  assert.deepEqual(
    Array.from(result.slice(recordOffset + 28, recordOffset + 32)),
    [0xaa, 0xaa, 0xaa, 0xaa]
  )
  assert.equal(result[FM_BROADCAST_ENABLED_OFFSET], 0)
  assert.equal(result[FM_BROADCAST_MODE_OFFSET], 5)
  assert.deepEqual(
    Array.from(
      result.slice(
        FM_BROADCAST_VFO_FREQUENCY_OFFSET,
        FM_BROADCAST_VFO_FREQUENCY_OFFSET + 4
      )
    ),
    [0x05, 0x3e, 0xc6, 0x00]
  )
  assert.deepEqual(baseline.toBytes(), bytes)
})

test("preserves unknown FM Broadcast settings and validates authored values", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE).fill(0xff)
  const codeplug = createCodeplug(bytes)
  const settings = codeplug.getFmBroadcastSettings()

  assert.equal(isUnknownSettingValue(settings.enabled), true)
  assert.equal(isUnknownSettingValue(settings.mode), true)
  assert.equal(isUnknownSettingValue(settings.vfoFrequencyHz), true)
  assert.deepEqual(codeplug.toBytes(), bytes)
  assert.throws(
    () => codeplug.editFmBroadcastChannel(-1, { valid: true }),
    /channel number/
  )
  assert.throws(
    () => codeplug.editFmBroadcastChannel(0, { frequencyHz: 63_900_000 }),
    /64.0 and 108.0 MHz/
  )
  assert.throws(
    () => codeplug.editFmBroadcastChannel(0, { frequencyHz: 90_450_000 }),
    /0.1 MHz steps/
  )
  assert.throws(
    () => codeplug.editFmBroadcastChannel(0, { name: "Ç".repeat(13) }),
    /24 UTF-8 bytes/
  )
  assert.throws(
    () => codeplug.editFmBroadcastSettings({ mode: "scan" as FmBroadcastMode }),
    /Unsupported FM Broadcast mode/
  )
})

test("reconciles FM Broadcast channel and setting changes against the baseline", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[FM_BROADCAST_ENABLED_OFFSET] = 0
  bytes[FM_BROADCAST_MODE_OFFSET] = 5
  writeUint32BigEndian(bytes, FM_BROADCAST_VFO_FREQUENCY_OFFSET, 88_000_000)
  const baseline = createCodeplug(bytes)
  const channelEdited = baseline.editFmBroadcastChannel(2, {
    valid: true,
    name: "NEWS",
    frequencyHz: 96_200_000,
  })
  const channelFields = ["valid", "name", "frequencyHz"] as const
  const channelChanges = reconcileFmBroadcastChannelChanges(
    [],
    baseline,
    channelEdited,
    2,
    channelFields
  )

  assert.deepEqual(channelChanges, [
    { kind: "edit-fm-broadcast-channel", number: 2, field: "valid" },
    { kind: "edit-fm-broadcast-channel", number: 2, field: "name" },
    {
      kind: "edit-fm-broadcast-channel",
      number: 2,
      field: "frequencyHz",
    },
  ])
  assert.deepEqual(
    reconcileFmBroadcastChannelChanges(
      channelChanges,
      baseline,
      baseline,
      2,
      channelFields
    ),
    []
  )

  const settingsEdited = baseline.editFmBroadcastSettings({
    enabled: true,
    mode: "memory",
    vfoFrequencyHz: 99_500_000,
  })
  const settingFields = ["enabled", "mode", "vfoFrequencyHz"] as const
  const settingChanges = reconcileFmBroadcastSettingChanges(
    [],
    baseline,
    settingsEdited,
    settingFields
  )

  assert.deepEqual(settingChanges, [
    { kind: "edit-fm-broadcast-setting", field: "enabled" },
    { kind: "edit-fm-broadcast-setting", field: "mode" },
    { kind: "edit-fm-broadcast-setting", field: "vfoFrequencyHz" },
  ])
})

function writeUint32BigEndian(
  bytes: Uint8Array,
  offset: number,
  value: number
) {
  new DataView(bytes.buffer, bytes.byteOffset + offset, 4).setUint32(
    0,
    value,
    false
  )
}
