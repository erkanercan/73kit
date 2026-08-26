import { decodeNullPaddedUtf8 } from "./binary.ts"
import type { UnknownSettingValue } from "./function-settings.ts"

const CODEPLUG_FLASH_START = 0x8000
const POWER_ON_MESSAGE_BYTES = 50
const POWER_ON_MESSAGE_CHARACTERS = 16

const ADDRESS = {
  systemLanguage: 0x15400,
  memoryChannelDisplay: 0x15405,
  menuAutoExitSeconds: 0x15406,
  backlightLevel: 0x15407,
  autoDimmingMode: 0x15408,
  autoDimDelaySeconds: 0x15409,
  exitAutoDimOnReceive: 0x1540a,
  exitAutoDimOnTransmit: 0x1540b,
  unitsPrimary: 0x15423,
  unitsSecondary: 0x15424,
  systemTheme: 0x15425,
  batteryDisplayStyle: 0x1542b,
  rxIndicatorLed: 0x1542c,
  receivedSignalStrength: 0x1542d,
  screenOffIndicatorLed: 0x1542e,
  showBootImage: 0x15460,
  showFirmwareVersion: 0x15461,
  showPowerOnMessage: 0x15462,
  showBatteryVoltage: 0x15463,
  powerOnMessage: 0x15464,
} as const

const DISPLAY_SETTING_OPTIONS = Object.freeze({
  backlightLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const,
  autoDimmingModes: [
    "off",
    "auto-off",
    "level-1",
    "level-2",
    "level-3",
    "level-4",
    "level-5",
    "level-6",
    "level-7",
    "level-8",
  ] as const,
  autoDimDelaySeconds: [
    3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 30, 35, 40, 45, 50, 55,
    60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 900, 1200, 1500, 1800,
    2100, 2400, 2700, 3000, 3300, 3600,
  ] as const,
  coordinateFormats: [
    "decimal-degrees",
    "degrees-decimal-minutes",
    "degrees-minutes-seconds",
  ] as const,
  speedUnits: ["metric", "mph", "knots"] as const,
  altitudeUnits: ["meters", "feet"] as const,
  distanceUnits: ["metric", "miles", "nautical-miles"] as const,
  rainfallUnits: ["millimeters", "inches"] as const,
  windSpeedUnits: ["metric", "mph", "knots"] as const,
  temperatureUnits: ["celsius", "fahrenheit"] as const,
  systemLanguages: [
    "simplified-chinese",
    "traditional-chinese",
    "english",
    "turkish",
  ] as const,
  systemThemes: ["light", "dark"] as const,
  menuAutoExitSeconds: [
    0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 30, 35, 40, 45, 50, 55,
    60, 120, 180, 240, 300, 360, 420, 480, 540, 600,
  ] as const,
  batteryDisplayStyles: ["icon", "voltage", "icon-and-voltage"] as const,
  receivedSignalStrengthModes: ["off", "dbm", "rssi-and-dbm"] as const,
})

type SettingValue<Value> = Value | UnknownSettingValue
type OptionValue<Values extends readonly unknown[]> = Values[number]
type BooleanSetting = SettingValue<boolean>

interface DisplaySettings {
  readonly backlightLevel: SettingValue<
    OptionValue<typeof DISPLAY_SETTING_OPTIONS.backlightLevels>
  >
  readonly autoDimmingMode: SettingValue<
    OptionValue<typeof DISPLAY_SETTING_OPTIONS.autoDimmingModes>
  >
  readonly autoDimDelaySeconds: SettingValue<
    OptionValue<typeof DISPLAY_SETTING_OPTIONS.autoDimDelaySeconds>
  >
  readonly exitAutoDimOnReceive: BooleanSetting
  readonly exitAutoDimOnTransmit: BooleanSetting
  readonly showBootImage: BooleanSetting
  readonly showFirmwareVersion: BooleanSetting
  readonly showPowerOnMessage: BooleanSetting
  readonly showBatteryVoltage: BooleanSetting
  readonly powerOnMessage: string
  readonly showChannelFrequency: boolean
  readonly showChannelName: boolean
  readonly showZoneName: boolean
  readonly coordinateFormat: SettingValue<
    OptionValue<typeof DISPLAY_SETTING_OPTIONS.coordinateFormats>
  >
  readonly speedUnit: SettingValue<
    OptionValue<typeof DISPLAY_SETTING_OPTIONS.speedUnits>
  >
  readonly altitudeUnit: SettingValue<
    OptionValue<typeof DISPLAY_SETTING_OPTIONS.altitudeUnits>
  >
  readonly distanceUnit: SettingValue<
    OptionValue<typeof DISPLAY_SETTING_OPTIONS.distanceUnits>
  >
  readonly rainfallUnit: SettingValue<
    OptionValue<typeof DISPLAY_SETTING_OPTIONS.rainfallUnits>
  >
  readonly windSpeedUnit: SettingValue<
    OptionValue<typeof DISPLAY_SETTING_OPTIONS.windSpeedUnits>
  >
  readonly temperatureUnit: SettingValue<
    OptionValue<typeof DISPLAY_SETTING_OPTIONS.temperatureUnits>
  >
  readonly systemLanguage: SettingValue<
    OptionValue<typeof DISPLAY_SETTING_OPTIONS.systemLanguages>
  >
  readonly systemTheme: SettingValue<
    OptionValue<typeof DISPLAY_SETTING_OPTIONS.systemThemes>
  >
  readonly menuAutoExitSeconds: SettingValue<
    OptionValue<typeof DISPLAY_SETTING_OPTIONS.menuAutoExitSeconds>
  >
  readonly batteryDisplayStyle: SettingValue<
    OptionValue<typeof DISPLAY_SETTING_OPTIONS.batteryDisplayStyles>
  >
  readonly rxIndicatorLed: BooleanSetting
  readonly screenOffIndicatorLed: BooleanSetting
  readonly receivedSignalStrength: SettingValue<
    OptionValue<typeof DISPLAY_SETTING_OPTIONS.receivedSignalStrengthModes>
  >
}

type DisplaySettingsPatch = {
  readonly [Field in keyof DisplaySettings]?: Exclude<
    DisplaySettings[Field],
    UnknownSettingValue
  >
}

function decodeDisplaySettings(bytes: Uint8Array): DisplaySettings {
  const read = (address: number) => bytes[toCodeplugOffset(address)]
  const memoryDisplay = read(ADDRESS.memoryChannelDisplay)
  const unitsPrimary = read(ADDRESS.unitsPrimary)
  const unitsSecondary = read(ADDRESS.unitsSecondary)
  const messageOffset = toCodeplugOffset(ADDRESS.powerOnMessage)

  return Object.freeze({
    backlightLevel: decodeIndex(
      read(ADDRESS.backlightLevel),
      DISPLAY_SETTING_OPTIONS.backlightLevels
    ),
    autoDimmingMode: decodeIndex(
      read(ADDRESS.autoDimmingMode),
      DISPLAY_SETTING_OPTIONS.autoDimmingModes
    ),
    autoDimDelaySeconds: decodeIndex(
      read(ADDRESS.autoDimDelaySeconds),
      DISPLAY_SETTING_OPTIONS.autoDimDelaySeconds
    ),
    exitAutoDimOnReceive: decodeBoolean(read(ADDRESS.exitAutoDimOnReceive)),
    exitAutoDimOnTransmit: decodeBoolean(read(ADDRESS.exitAutoDimOnTransmit)),
    showBootImage: decodeBoolean(read(ADDRESS.showBootImage)),
    showFirmwareVersion: decodeBoolean(read(ADDRESS.showFirmwareVersion)),
    showPowerOnMessage: decodeBoolean(read(ADDRESS.showPowerOnMessage)),
    showBatteryVoltage: decodeBoolean(read(ADDRESS.showBatteryVoltage)),
    powerOnMessage: decodeNullPaddedUtf8(
      bytes.subarray(messageOffset, messageOffset + POWER_ON_MESSAGE_BYTES)
    ),
    showChannelFrequency: (memoryDisplay & 0b001) !== 0,
    showChannelName: (memoryDisplay & 0b010) !== 0,
    showZoneName: (memoryDisplay & 0b100) !== 0,
    coordinateFormat: decodePackedIndex(
      unitsPrimary,
      0,
      DISPLAY_SETTING_OPTIONS.coordinateFormats
    ),
    speedUnit: decodePackedIndex(
      unitsPrimary,
      2,
      DISPLAY_SETTING_OPTIONS.speedUnits
    ),
    distanceUnit: decodePackedIndex(
      unitsPrimary,
      4,
      DISPLAY_SETTING_OPTIONS.distanceUnits
    ),
    altitudeUnit: decodePackedIndex(
      unitsPrimary,
      6,
      DISPLAY_SETTING_OPTIONS.altitudeUnits
    ),
    rainfallUnit: decodePackedIndex(
      unitsSecondary,
      0,
      DISPLAY_SETTING_OPTIONS.rainfallUnits
    ),
    windSpeedUnit: decodePackedIndex(
      unitsSecondary,
      2,
      DISPLAY_SETTING_OPTIONS.windSpeedUnits
    ),
    temperatureUnit: decodePackedIndex(
      unitsSecondary,
      4,
      DISPLAY_SETTING_OPTIONS.temperatureUnits
    ),
    systemLanguage: decodeIndex(
      read(ADDRESS.systemLanguage),
      DISPLAY_SETTING_OPTIONS.systemLanguages
    ),
    systemTheme: decodeIndex(
      read(ADDRESS.systemTheme),
      DISPLAY_SETTING_OPTIONS.systemThemes
    ),
    menuAutoExitSeconds: decodeIndex(
      read(ADDRESS.menuAutoExitSeconds),
      DISPLAY_SETTING_OPTIONS.menuAutoExitSeconds
    ),
    batteryDisplayStyle: decodeIndex(
      read(ADDRESS.batteryDisplayStyle),
      DISPLAY_SETTING_OPTIONS.batteryDisplayStyles
    ),
    rxIndicatorLed: decodeBoolean(read(ADDRESS.rxIndicatorLed)),
    screenOffIndicatorLed: decodeBoolean(read(ADDRESS.screenOffIndicatorLed)),
    receivedSignalStrength: decodeIndex(
      read(ADDRESS.receivedSignalStrength),
      DISPLAY_SETTING_OPTIONS.receivedSignalStrengthModes
    ),
  })
}

function editDisplaySettingsBytes(
  source: Uint8Array,
  patch: DisplaySettingsPatch
) {
  const bytes = source.slice()

  for (const field of Object.keys(patch) as (keyof DisplaySettingsPatch)[]) {
    const value = patch[field]
    if (value === undefined) continue

    switch (field) {
      case "backlightLevel":
      case "autoDimmingMode":
      case "autoDimDelaySeconds":
      case "systemLanguage":
      case "systemTheme":
      case "menuAutoExitSeconds":
      case "batteryDisplayStyle":
      case "receivedSignalStrength":
        writeIndex(
          bytes,
          ADDRESS[field],
          DISPLAY_SETTING_OPTIONS[fieldMap[field]],
          value
        )
        break
      case "exitAutoDimOnReceive":
      case "exitAutoDimOnTransmit":
      case "showBootImage":
      case "showFirmwareVersion":
      case "showPowerOnMessage":
      case "showBatteryVoltage":
      case "rxIndicatorLed":
      case "screenOffIndicatorLed":
        writeBoolean(bytes, ADDRESS[field], value)
        break
      case "powerOnMessage":
        writePowerOnMessage(bytes, value)
        break
      case "showChannelFrequency":
        writeBitBoolean(bytes, ADDRESS.memoryChannelDisplay, 0, value)
        break
      case "showChannelName":
        writeBitBoolean(bytes, ADDRESS.memoryChannelDisplay, 1, value)
        break
      case "showZoneName":
        writeBitBoolean(bytes, ADDRESS.memoryChannelDisplay, 2, value)
        break
      case "coordinateFormat":
        writePackedIndex(
          bytes,
          ADDRESS.unitsPrimary,
          0,
          DISPLAY_SETTING_OPTIONS.coordinateFormats,
          value
        )
        break
      case "speedUnit":
        writePackedIndex(
          bytes,
          ADDRESS.unitsPrimary,
          2,
          DISPLAY_SETTING_OPTIONS.speedUnits,
          value
        )
        break
      case "distanceUnit":
        writePackedIndex(
          bytes,
          ADDRESS.unitsPrimary,
          4,
          DISPLAY_SETTING_OPTIONS.distanceUnits,
          value
        )
        break
      case "altitudeUnit":
        writePackedIndex(
          bytes,
          ADDRESS.unitsPrimary,
          6,
          DISPLAY_SETTING_OPTIONS.altitudeUnits,
          value
        )
        break
      case "rainfallUnit":
        writePackedIndex(
          bytes,
          ADDRESS.unitsSecondary,
          0,
          DISPLAY_SETTING_OPTIONS.rainfallUnits,
          value
        )
        break
      case "windSpeedUnit":
        writePackedIndex(
          bytes,
          ADDRESS.unitsSecondary,
          2,
          DISPLAY_SETTING_OPTIONS.windSpeedUnits,
          value
        )
        break
      case "temperatureUnit":
        writePackedIndex(
          bytes,
          ADDRESS.unitsSecondary,
          4,
          DISPLAY_SETTING_OPTIONS.temperatureUnits,
          value
        )
        break
    }
  }

  return bytes
}

const fieldMap = {
  backlightLevel: "backlightLevels",
  autoDimmingMode: "autoDimmingModes",
  autoDimDelaySeconds: "autoDimDelaySeconds",
  systemLanguage: "systemLanguages",
  systemTheme: "systemThemes",
  menuAutoExitSeconds: "menuAutoExitSeconds",
  batteryDisplayStyle: "batteryDisplayStyles",
  receivedSignalStrength: "receivedSignalStrengthModes",
} as const

function decodeIndex<const Values extends readonly unknown[]>(
  raw: number,
  values: Values
): SettingValue<Values[number]> {
  return values[raw] ?? unknownValue(raw)
}

function decodePackedIndex<const Values extends readonly unknown[]>(
  raw: number,
  shift: number,
  values: Values
): SettingValue<Values[number]> {
  return decodeIndex((raw >>> shift) & 0b11, values)
}

function decodeBoolean(raw: number): BooleanSetting {
  return raw === 0 ? false : raw === 1 ? true : unknownValue(raw)
}

function writeIndex(
  bytes: Uint8Array,
  address: number,
  values: readonly unknown[],
  value: unknown
) {
  const index = values.indexOf(value)
  if (index === -1) throw new RangeError("Unsupported Display Setting value")
  bytes[toCodeplugOffset(address)] = index
}

function writeBoolean(bytes: Uint8Array, address: number, value: unknown) {
  if (typeof value !== "boolean") {
    throw new RangeError("A Display Setting switch must be boolean")
  }
  bytes[toCodeplugOffset(address)] = value ? 1 : 0
}

function writeBitBoolean(
  bytes: Uint8Array,
  address: number,
  bit: number,
  value: unknown
) {
  if (typeof value !== "boolean") {
    throw new RangeError("A Display Setting flag must be boolean")
  }
  const offset = toCodeplugOffset(address)
  const mask = 1 << bit
  bytes[offset] = value ? bytes[offset] | mask : bytes[offset] & ~mask
}

function writePackedIndex(
  bytes: Uint8Array,
  address: number,
  shift: number,
  values: readonly unknown[],
  value: unknown
) {
  const index = values.indexOf(value)
  if (index === -1) throw new RangeError("Unsupported Display Setting value")
  const offset = toCodeplugOffset(address)
  const mask = 0b11 << shift
  bytes[offset] = (bytes[offset] & ~mask) | (index << shift)
}

function writePowerOnMessage(bytes: Uint8Array, value: unknown) {
  if (typeof value !== "string") {
    throw new RangeError("Power-on message must be text")
  }
  if (value.includes("\0")) {
    throw new RangeError("Power-on message cannot contain a null character")
  }
  if (Array.from(value).length > POWER_ON_MESSAGE_CHARACTERS) {
    throw new RangeError(
      `Power-on message must contain at most ${POWER_ON_MESSAGE_CHARACTERS} characters`
    )
  }
  const encoded = new TextEncoder().encode(value)
  if (encoded.byteLength > POWER_ON_MESSAGE_BYTES) {
    throw new RangeError(
      `Power-on message must fit in ${POWER_ON_MESSAGE_BYTES} UTF-8 bytes`
    )
  }

  const offset = toCodeplugOffset(ADDRESS.powerOnMessage)
  bytes.fill(0, offset, offset + POWER_ON_MESSAGE_BYTES)
  bytes.set(encoded, offset)
}

function unknownValue(raw: number): UnknownSettingValue {
  return Object.freeze({ kind: "unknown", raw })
}

function toCodeplugOffset(absoluteAddress: number) {
  return absoluteAddress - CODEPLUG_FLASH_START
}

export {
  DISPLAY_SETTING_OPTIONS,
  POWER_ON_MESSAGE_BYTES,
  POWER_ON_MESSAGE_CHARACTERS,
  decodeDisplaySettings,
  editDisplaySettingsBytes,
}
export type { DisplaySettings, DisplaySettingsPatch }
