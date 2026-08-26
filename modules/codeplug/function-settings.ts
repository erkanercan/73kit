const CODEPLUG_FLASH_START = 0x8000

const ADDRESS = {
  bandAOperatingMode: 0x15307,
  bandBOperatingMode: 0x15308,
  rxTxMode: 0x15430,
  crossBandRepeaterMode: 0x15431,
  squelchLevel: 0x15432,
  transmitTimeoutMinutes: 0x15433,
  transmitChannelSelection: 0x15434,
  callHoldSeconds: 0x15435,
  ctcssTailBehavior: 0x15436,
  dcsTailBehavior: 0x15437,
  noSignalingTailTone: 0x15438,
  tailSignalingDurationMs: 0x15439,
  toneBurstDuration: 0x1543a,
  toneBurstFrequencyHz: 0x1543b,
  toneBurstSidetone: 0x1543c,
  scanMode: 0x1543d,
  memoryScanType: 0x1543e,
  crossBandRepeaterMonitoring: 0x1543f,
  coResumeDelayTenths: 0x15448,
  toHoldTimeTenths: 0x15449,
  scanDwellTimeMs: 0x1544a,
  powerSave: 0x154b0,
  powerSaveDelaySeconds: 0x154b1,
  weatherSquelchControl: 0x154b2,
  weatherReceiveMode: 0x154b3,
  weatherScanChannels: 0x154b4,
  weatherDecodeResetSeconds: 0x154b6,
  autoRepeater: 0x154b7,
  citUsbCdc: 0x154b8,
  citBluetoothSpp: 0x154b9,
  citBluetoothBle: 0x154ba,
  autoAmMode: 0x154bc,
} as const

const FUNCTION_SETTING_OPTIONS = Object.freeze({
  rxTxModes: [
    "single-rx-tx",
    "dual-watch-single-tx",
    "dual-receive-single-tx",
    "cross-band-repeater",
  ] as const,
  crossBandRepeaterModes: ["one-way", "two-way"] as const,
  squelchLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const,
  transmitTimeoutMinutes: [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30,
  ] as const,
  transmitChannelSelections: ["main", "last-called"] as const,
  callHoldSeconds: [
    3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90,
    100, 110, 120, 150, 180, 210, 240, 270, 300,
  ] as const,
  operatingModes: ["memory", "vfo", "call", "weather"] as const,
  autoAmModes: ["off", "108-136", "108-137"] as const,
  noSignalingTailTones: ["off", "55.2-hz", "259.2-hz"] as const,
  ctcssTailBehaviors: [
    "off",
    "55-hz",
    "phase-shift-120",
    "phase-shift-180",
    "phase-shift-240",
  ] as const,
  dcsTailBehaviors: ["off", "134.4-hz"] as const,
  tailSignalingDurationsMs: [
    50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400,
    425, 450, 475, 500,
  ] as const,
  toneBurstFrequenciesHz: [1000, 1450, 1750, 2100] as const,
  toneBurstDurations: ["one-second", "continuous"] as const,
  scanModes: ["carrier", "time", "search"] as const,
  memoryScanTypes: ["normal", "priority"] as const,
  scanDwellTimesMs: [10, 20, 30, 40, 50] as const,
  powerSaveDelaySeconds: [
    3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60,
    70, 80, 90, 100, 110, 120, 150, 180, 210, 240, 270, 300,
  ] as const,
  weatherSquelchControls: ["normal", "1050-hz-signaling"] as const,
  weatherReceiveModes: ["single-channel-watch", "multi-channel-scan"] as const,
  weatherDecodeResetSeconds: [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45,
    50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 225, 250, 275, 300,
  ] as const,
  weatherChannels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const,
})

type UnknownSettingValue = {
  readonly kind: "unknown"
  readonly raw: number
}

type SettingValue<Value> = Value | UnknownSettingValue
type OptionValue<Values extends readonly unknown[]> = Values[number]
type BooleanSetting = SettingValue<boolean>

interface FunctionSettings {
  readonly rxTxMode: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.rxTxModes>
  >
  readonly crossBandRepeaterMode: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.crossBandRepeaterModes>
  >
  readonly crossBandRepeaterMonitoring: BooleanSetting
  readonly squelchLevel: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.squelchLevels>
  >
  readonly transmitTimeoutMinutes: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.transmitTimeoutMinutes>
  >
  readonly transmitChannelSelection: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.transmitChannelSelections>
  >
  readonly callHoldSeconds: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.callHoldSeconds>
  >
  readonly bandAOperatingMode: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.operatingModes>
  >
  readonly bandBOperatingMode: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.operatingModes>
  >
  readonly autoRepeater: BooleanSetting
  readonly autoAmMode: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.autoAmModes>
  >
  readonly citUsbCdc: BooleanSetting
  readonly citBluetoothSpp: BooleanSetting
  readonly citBluetoothBle: BooleanSetting
  readonly noSignalingTailTone: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.noSignalingTailTones>
  >
  readonly ctcssTailBehavior: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.ctcssTailBehaviors>
  >
  readonly dcsTailBehavior: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.dcsTailBehaviors>
  >
  readonly tailSignalingDurationMs: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.tailSignalingDurationsMs>
  >
  readonly toneBurstFrequencyHz: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.toneBurstFrequenciesHz>
  >
  readonly toneBurstDuration: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.toneBurstDurations>
  >
  readonly toneBurstSidetone: BooleanSetting
  readonly scanMode: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.scanModes>
  >
  readonly memoryScanType: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.memoryScanTypes>
  >
  readonly coResumeDelaySeconds: SettingValue<number>
  readonly toHoldTimeSeconds: SettingValue<number>
  readonly scanDwellTimeMs: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.scanDwellTimesMs>
  >
  readonly powerSave: BooleanSetting
  readonly powerSaveDelaySeconds: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.powerSaveDelaySeconds>
  >
  readonly weatherSquelchControl: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.weatherSquelchControls>
  >
  readonly weatherReceiveMode: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.weatherReceiveModes>
  >
  readonly weatherScanChannels: readonly OptionValue<
    typeof FUNCTION_SETTING_OPTIONS.weatherChannels
  >[]
  readonly weatherDecodeResetSeconds: SettingValue<
    OptionValue<typeof FUNCTION_SETTING_OPTIONS.weatherDecodeResetSeconds>
  >
}

type FunctionSettingsPatch = {
  readonly [Field in keyof FunctionSettings]?: Exclude<
    FunctionSettings[Field],
    UnknownSettingValue
  >
}

function decodeFunctionSettings(bytes: Uint8Array): FunctionSettings {
  const read = (address: number) => bytes[toCodeplugOffset(address)]

  return Object.freeze({
    rxTxMode: decodeIndex(
      read(ADDRESS.rxTxMode),
      FUNCTION_SETTING_OPTIONS.rxTxModes
    ),
    crossBandRepeaterMode: decodeIndex(
      read(ADDRESS.crossBandRepeaterMode),
      FUNCTION_SETTING_OPTIONS.crossBandRepeaterModes
    ),
    crossBandRepeaterMonitoring: decodeBoolean(
      read(ADDRESS.crossBandRepeaterMonitoring)
    ),
    squelchLevel: decodeIndex(
      read(ADDRESS.squelchLevel),
      FUNCTION_SETTING_OPTIONS.squelchLevels
    ),
    transmitTimeoutMinutes: decodeIndex(
      read(ADDRESS.transmitTimeoutMinutes),
      FUNCTION_SETTING_OPTIONS.transmitTimeoutMinutes
    ),
    transmitChannelSelection: decodeIndex(
      read(ADDRESS.transmitChannelSelection),
      FUNCTION_SETTING_OPTIONS.transmitChannelSelections
    ),
    callHoldSeconds: decodeIndex(
      read(ADDRESS.callHoldSeconds),
      FUNCTION_SETTING_OPTIONS.callHoldSeconds
    ),
    bandAOperatingMode: decodeIndex(
      read(ADDRESS.bandAOperatingMode),
      FUNCTION_SETTING_OPTIONS.operatingModes
    ),
    bandBOperatingMode: decodeIndex(
      read(ADDRESS.bandBOperatingMode),
      FUNCTION_SETTING_OPTIONS.operatingModes
    ),
    autoRepeater: decodeBoolean(read(ADDRESS.autoRepeater)),
    autoAmMode: decodeIndex(
      read(ADDRESS.autoAmMode),
      FUNCTION_SETTING_OPTIONS.autoAmModes
    ),
    citUsbCdc: decodeBoolean(read(ADDRESS.citUsbCdc)),
    citBluetoothSpp: decodeBoolean(read(ADDRESS.citBluetoothSpp)),
    citBluetoothBle: decodeBoolean(read(ADDRESS.citBluetoothBle)),
    noSignalingTailTone: decodeIndex(
      read(ADDRESS.noSignalingTailTone),
      FUNCTION_SETTING_OPTIONS.noSignalingTailTones
    ),
    ctcssTailBehavior: decodeIndex(
      read(ADDRESS.ctcssTailBehavior),
      FUNCTION_SETTING_OPTIONS.ctcssTailBehaviors
    ),
    dcsTailBehavior: decodeIndex(
      read(ADDRESS.dcsTailBehavior),
      FUNCTION_SETTING_OPTIONS.dcsTailBehaviors
    ),
    tailSignalingDurationMs: decodeIndex(
      read(ADDRESS.tailSignalingDurationMs),
      FUNCTION_SETTING_OPTIONS.tailSignalingDurationsMs
    ),
    toneBurstFrequencyHz: decodeIndex(
      read(ADDRESS.toneBurstFrequencyHz),
      FUNCTION_SETTING_OPTIONS.toneBurstFrequenciesHz
    ),
    toneBurstDuration: decodeIndex(
      read(ADDRESS.toneBurstDuration),
      FUNCTION_SETTING_OPTIONS.toneBurstDurations
    ),
    toneBurstSidetone: decodeBoolean(read(ADDRESS.toneBurstSidetone)),
    scanMode: decodeIndex(
      read(ADDRESS.scanMode),
      FUNCTION_SETTING_OPTIONS.scanModes
    ),
    memoryScanType: decodeIndex(
      read(ADDRESS.memoryScanType),
      FUNCTION_SETTING_OPTIONS.memoryScanTypes
    ),
    coResumeDelaySeconds: decodeTenths(
      read(ADDRESS.coResumeDelayTenths),
      0,
      100
    ),
    toHoldTimeSeconds: decodeTenths(read(ADDRESS.toHoldTimeTenths), 10, 100),
    scanDwellTimeMs: decodeIndex(
      read(ADDRESS.scanDwellTimeMs),
      FUNCTION_SETTING_OPTIONS.scanDwellTimesMs
    ),
    powerSave: decodeBoolean(read(ADDRESS.powerSave)),
    powerSaveDelaySeconds: decodeIndex(
      read(ADDRESS.powerSaveDelaySeconds),
      FUNCTION_SETTING_OPTIONS.powerSaveDelaySeconds
    ),
    weatherSquelchControl: decodeIndex(
      read(ADDRESS.weatherSquelchControl),
      FUNCTION_SETTING_OPTIONS.weatherSquelchControls
    ),
    weatherReceiveMode: decodeIndex(
      read(ADDRESS.weatherReceiveMode),
      FUNCTION_SETTING_OPTIONS.weatherReceiveModes
    ),
    weatherScanChannels: decodeWeatherScanChannels(bytes),
    weatherDecodeResetSeconds: decodeIndex(
      read(ADDRESS.weatherDecodeResetSeconds),
      FUNCTION_SETTING_OPTIONS.weatherDecodeResetSeconds
    ),
  })
}

function editFunctionSettingsBytes(
  source: Uint8Array,
  patch: FunctionSettingsPatch
) {
  const bytes = source.slice()

  for (const field of Object.keys(patch) as (keyof FunctionSettingsPatch)[]) {
    const value = patch[field]
    if (value === undefined) continue

    switch (field) {
      case "rxTxMode":
        writeIndex(
          bytes,
          ADDRESS.rxTxMode,
          FUNCTION_SETTING_OPTIONS.rxTxModes,
          value
        )
        break
      case "crossBandRepeaterMode":
        writeIndex(
          bytes,
          ADDRESS.crossBandRepeaterMode,
          FUNCTION_SETTING_OPTIONS.crossBandRepeaterModes,
          value
        )
        break
      case "crossBandRepeaterMonitoring":
      case "autoRepeater":
      case "citUsbCdc":
      case "citBluetoothSpp":
      case "citBluetoothBle":
      case "toneBurstSidetone":
      case "powerSave":
        writeBoolean(bytes, ADDRESS[field], value)
        break
      case "squelchLevel":
        writeIndex(
          bytes,
          ADDRESS.squelchLevel,
          FUNCTION_SETTING_OPTIONS.squelchLevels,
          value
        )
        break
      case "transmitTimeoutMinutes":
        writeIndex(
          bytes,
          ADDRESS.transmitTimeoutMinutes,
          FUNCTION_SETTING_OPTIONS.transmitTimeoutMinutes,
          value
        )
        break
      case "transmitChannelSelection":
        writeIndex(
          bytes,
          ADDRESS.transmitChannelSelection,
          FUNCTION_SETTING_OPTIONS.transmitChannelSelections,
          value
        )
        break
      case "callHoldSeconds":
        writeIndex(
          bytes,
          ADDRESS.callHoldSeconds,
          FUNCTION_SETTING_OPTIONS.callHoldSeconds,
          value
        )
        break
      case "bandAOperatingMode":
      case "bandBOperatingMode":
        writeIndex(
          bytes,
          ADDRESS[field],
          FUNCTION_SETTING_OPTIONS.operatingModes,
          value
        )
        break
      case "autoAmMode":
        writeIndex(
          bytes,
          ADDRESS.autoAmMode,
          FUNCTION_SETTING_OPTIONS.autoAmModes,
          value
        )
        break
      case "noSignalingTailTone":
        writeIndex(
          bytes,
          ADDRESS.noSignalingTailTone,
          FUNCTION_SETTING_OPTIONS.noSignalingTailTones,
          value
        )
        break
      case "ctcssTailBehavior":
        writeIndex(
          bytes,
          ADDRESS.ctcssTailBehavior,
          FUNCTION_SETTING_OPTIONS.ctcssTailBehaviors,
          value
        )
        break
      case "dcsTailBehavior":
        writeIndex(
          bytes,
          ADDRESS.dcsTailBehavior,
          FUNCTION_SETTING_OPTIONS.dcsTailBehaviors,
          value
        )
        break
      case "tailSignalingDurationMs":
        writeIndex(
          bytes,
          ADDRESS.tailSignalingDurationMs,
          FUNCTION_SETTING_OPTIONS.tailSignalingDurationsMs,
          value
        )
        break
      case "toneBurstFrequencyHz":
        writeIndex(
          bytes,
          ADDRESS.toneBurstFrequencyHz,
          FUNCTION_SETTING_OPTIONS.toneBurstFrequenciesHz,
          value
        )
        break
      case "toneBurstDuration":
        writeIndex(
          bytes,
          ADDRESS.toneBurstDuration,
          FUNCTION_SETTING_OPTIONS.toneBurstDurations,
          value
        )
        break
      case "scanMode":
        writeIndex(
          bytes,
          ADDRESS.scanMode,
          FUNCTION_SETTING_OPTIONS.scanModes,
          value
        )
        break
      case "memoryScanType":
        writeIndex(
          bytes,
          ADDRESS.memoryScanType,
          FUNCTION_SETTING_OPTIONS.memoryScanTypes,
          value
        )
        break
      case "coResumeDelaySeconds":
        writeTenths(bytes, ADDRESS.coResumeDelayTenths, value, 0, 10)
        break
      case "toHoldTimeSeconds":
        writeTenths(bytes, ADDRESS.toHoldTimeTenths, value, 1, 10)
        break
      case "scanDwellTimeMs":
        writeIndex(
          bytes,
          ADDRESS.scanDwellTimeMs,
          FUNCTION_SETTING_OPTIONS.scanDwellTimesMs,
          value
        )
        break
      case "powerSaveDelaySeconds":
        writeIndex(
          bytes,
          ADDRESS.powerSaveDelaySeconds,
          FUNCTION_SETTING_OPTIONS.powerSaveDelaySeconds,
          value
        )
        break
      case "weatherSquelchControl":
        writeIndex(
          bytes,
          ADDRESS.weatherSquelchControl,
          FUNCTION_SETTING_OPTIONS.weatherSquelchControls,
          value
        )
        break
      case "weatherReceiveMode":
        writeIndex(
          bytes,
          ADDRESS.weatherReceiveMode,
          FUNCTION_SETTING_OPTIONS.weatherReceiveModes,
          value
        )
        break
      case "weatherScanChannels":
        writeWeatherScanChannels(bytes, value)
        break
      case "weatherDecodeResetSeconds":
        writeIndex(
          bytes,
          ADDRESS.weatherDecodeResetSeconds,
          FUNCTION_SETTING_OPTIONS.weatherDecodeResetSeconds,
          value
        )
        break
    }
  }

  return bytes
}

function decodeIndex<const Values extends readonly unknown[]>(
  raw: number,
  values: Values
): SettingValue<Values[number]> {
  return values[raw] ?? unknownValue(raw)
}

function decodeBoolean(raw: number): BooleanSetting {
  return raw === 0 ? false : raw === 1 ? true : unknownValue(raw)
}

function decodeTenths(raw: number, minimum: number, maximum: number) {
  return raw >= minimum && raw <= maximum ? raw / 10 : unknownValue(raw)
}

function decodeWeatherScanChannels(bytes: Uint8Array) {
  const offset = toCodeplugOffset(ADDRESS.weatherScanChannels)
  const mask = bytes[offset] | (bytes[offset + 1] << 8)
  return Object.freeze(
    FUNCTION_SETTING_OPTIONS.weatherChannels.filter(
      (channel) => (mask & (1 << (channel - 1))) !== 0
    )
  )
}

function writeIndex<const Values extends readonly unknown[]>(
  bytes: Uint8Array,
  address: number,
  values: Values,
  value: unknown
) {
  const index = values.indexOf(value as never)
  if (index === -1) throw new RangeError("Unsupported Function Setting value")
  bytes[toCodeplugOffset(address)] = index
}

function writeBoolean(bytes: Uint8Array, address: number, value: unknown) {
  if (typeof value !== "boolean") {
    throw new RangeError("A Function Setting switch must be boolean")
  }
  bytes[toCodeplugOffset(address)] = value ? 1 : 0
}

function writeTenths(
  bytes: Uint8Array,
  address: number,
  value: unknown,
  minimum: number,
  maximum: number
) {
  if (
    typeof value !== "number" ||
    value < minimum ||
    value > maximum ||
    !Number.isInteger(value * 10)
  ) {
    throw new RangeError(
      `Function Setting value must be between ${minimum} and ${maximum} in 0.1 increments`
    )
  }
  bytes[toCodeplugOffset(address)] = Math.round(value * 10)
}

function writeWeatherScanChannels(bytes: Uint8Array, value: unknown) {
  if (!Array.isArray(value)) {
    throw new RangeError("Weather scan channels must be an array")
  }
  const channels = value as readonly number[]
  if (
    new Set(channels).size !== channels.length ||
    channels.some(
      (channel) =>
        !FUNCTION_SETTING_OPTIONS.weatherChannels.includes(channel as never)
    )
  ) {
    throw new RangeError(
      "Weather scan channels must contain unique WX1-WX10 numbers"
    )
  }

  const offset = toCodeplugOffset(ADDRESS.weatherScanChannels)
  const current = bytes[offset] | (bytes[offset + 1] << 8)
  const selected = channels.reduce(
    (mask, channel) => mask | (1 << (channel - 1)),
    0
  )
  const next = (current & 0xfc00) | selected
  bytes[offset] = next & 0xff
  bytes[offset + 1] = next >>> 8
}

function unknownValue(raw: number): UnknownSettingValue {
  return Object.freeze({ kind: "unknown", raw })
}

function isUnknownSettingValue(value: unknown): value is UnknownSettingValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "unknown"
  )
}

function toCodeplugOffset(absoluteAddress: number) {
  return absoluteAddress - CODEPLUG_FLASH_START
}

export {
  FUNCTION_SETTING_OPTIONS,
  decodeFunctionSettings,
  editFunctionSettingsBytes,
  isUnknownSettingValue,
}
export type { FunctionSettings, FunctionSettingsPatch, UnknownSettingValue }
