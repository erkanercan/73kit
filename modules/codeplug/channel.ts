type ChannelScan = "off" | "skip" | "priority" | "reserved"
type ChannelDuplex = "off" | "negative" | "positive" | "split"
type ChannelReverse = "off" | "talk-around" | "reverse" | "reserved"
type ChannelStepKHz =
  | 2.5
  | 3.125
  | 5
  | 6.25
  | 8.33
  | 10
  | 12.5
  | 15
  | 20
  | 25
  | 50
  | 100
  | "unknown"
type ChannelModulation = "fm" | "fm-narrow" | "am" | "am-narrow" | "unknown"
type ChannelTransmitPower = "low" | "medium" | "high" | "reserved" | "unknown"
type ChannelBusyLockout = "off" | "repeater" | "carrier" | "reserved"
type ChannelSquelch =
  | "carrier"
  | "tone"
  | "optional-signaling"
  | "tone-and-optional-signaling"
  | "tone-or-optional-signaling"
  | "unknown"
type ChannelTone =
  | { readonly kind: "off" }
  | {
      readonly kind: "ctcss"
      readonly frequencyHz: number
      readonly reverse?: true
    }
  | { readonly kind: "dcs"; readonly code: string; readonly reverse?: true }
  | { readonly kind: "unknown" }
type ChannelDcsPolarity =
  "normal" | "tx-normal-rx-inverted" | "tx-inverted-rx-normal" | "inverted"
type ChannelCompander = "off" | "transmit" | "receive" | "transmit-and-receive"
type ChannelOptionalSignalingKind =
  "off" | "dtmf" | "two-tone" | "five-tone" | "unknown"
type ChannelScrambler =
  "off" | 2700 | 2800 | 2900 | 3000 | 3100 | 3200 | 3300 | 3400 | "unknown"
type ChannelPttId = "off" | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | "unknown"
type ChannelAprsReceive = "off" | "on" | "on-muted" | "unknown"

interface Channel {
  readonly number: number
  readonly valid: boolean
  readonly scan: ChannelScan
  readonly zoneNames: readonly string[]
  readonly scanListNames: readonly string[]
  readonly name: string
  readonly receiveFrequencyHz: number
  readonly transmitFrequencyHz: number
  readonly offsetFrequencyHz: number
  readonly duplex: ChannelDuplex
  readonly reverse: ChannelReverse
  readonly stepKHz: ChannelStepKHz
  readonly modulation: ChannelModulation
  readonly transmitPower: ChannelTransmitPower
  readonly receiveOnly: boolean
  readonly busyChannelLockout: ChannelBusyLockout
  readonly squelch: ChannelSquelch
  readonly transmitTone: ChannelTone
  readonly receiveTone: ChannelTone
  readonly dcsPolarity: ChannelDcsPolarity
  readonly compander: ChannelCompander
  readonly optionalSignaling: {
    readonly kind: ChannelOptionalSignalingKind
    readonly index: number
  }
  readonly scrambler: ChannelScrambler
  readonly pttId: ChannelPttId
  readonly aprsReceive: ChannelAprsReceive
}

interface SpecialChannel extends Omit<
  Channel,
  "number" | "valid" | "scan" | "zoneNames" | "scanListNames"
> {
  readonly slot: "A" | "B" | 1 | 2
}

export type {
  Channel,
  ChannelAprsReceive,
  ChannelBusyLockout,
  ChannelCompander,
  ChannelDcsPolarity,
  ChannelDuplex,
  ChannelModulation,
  ChannelOptionalSignalingKind,
  ChannelPttId,
  ChannelReverse,
  ChannelScan,
  ChannelScrambler,
  ChannelSquelch,
  ChannelStepKHz,
  ChannelTone,
  ChannelTransmitPower,
  SpecialChannel,
}
