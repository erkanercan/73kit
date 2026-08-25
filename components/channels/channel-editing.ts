import type {
  ChannelMembershipPatch,
  MemoryChannelPatch,
} from "@/modules/codeplug/index"

type EditMemoryChannel = (number: number, patch: MemoryChannelPatch) => void
type EditChannelMemberships = (
  number: number,
  patch: ChannelMembershipPatch
) => void

const DUPLEX_OPTIONS = ["off", "negative", "positive", "split"] as const
const REVERSE_OPTIONS = ["off", "talk-around", "reverse"] as const
const STEP_OPTIONS = [
  2.5, 3.125, 5, 6.25, 8.33, 10, 12.5, 15, 20, 25, 50, 100,
] as const
const MODULATION_OPTIONS = ["fm", "fm-narrow", "am", "am-narrow"] as const
const POWER_OPTIONS = ["low", "medium", "high"] as const
const SCAN_OPTIONS = ["off", "skip", "priority"] as const
const BCLO_OPTIONS = ["off", "repeater", "carrier"] as const
const SQUELCH_OPTIONS = [
  "carrier",
  "tone",
  "optional-signaling",
  "tone-and-optional-signaling",
  "tone-or-optional-signaling",
] as const
const DCS_POLARITY_OPTIONS = [
  "normal",
  "tx-normal-rx-inverted",
  "tx-inverted-rx-normal",
  "inverted",
] as const
const COMPANDER_OPTIONS = [
  "off",
  "transmit",
  "receive",
  "transmit-and-receive",
] as const
const OPTIONAL_SIGNALING_OPTIONS = [
  "off",
  "dtmf",
  "two-tone",
  "five-tone",
] as const
const SCRAMBLER_OPTIONS = [
  "off",
  2700,
  2800,
  2900,
  3000,
  3100,
  3200,
  3300,
  3400,
] as const
const PTT_ID_OPTIONS = ["off", 0, 1, 2, 3, 4, 5, 6, 7] as const
const APRS_RECEIVE_OPTIONS = ["off", "on", "on-muted"] as const

export {
  APRS_RECEIVE_OPTIONS,
  BCLO_OPTIONS,
  COMPANDER_OPTIONS,
  DCS_POLARITY_OPTIONS,
  DUPLEX_OPTIONS,
  MODULATION_OPTIONS,
  OPTIONAL_SIGNALING_OPTIONS,
  POWER_OPTIONS,
  PTT_ID_OPTIONS,
  REVERSE_OPTIONS,
  SCAN_OPTIONS,
  SCRAMBLER_OPTIONS,
  SQUELCH_OPTIONS,
  STEP_OPTIONS,
}
export type { EditChannelMemberships, EditMemoryChannel }
