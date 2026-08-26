# Sound Settings PF Comparison

## Purpose

Record the binary evidence used to implement the previously unmapped scan-beep
and AM / AM-N RX-gain controls. The comparison used the vendor CPS exports in
`Data Files (2).zip`, with `00-default.PF` as the common baseline. Each variant
changed only the named setting.

## Results

| Setting           | Absolute address | Baseline | Variant evidence                                           | Encoding                |
| ----------------- | ---------------: | -------: | ---------------------------------------------------------- | ----------------------- |
| Scan start beep   |     `0x00015446` |   `0x01` | Off = `0x00`                                               | `0=Off`, `1=On`         |
| Scan pause beep   |     `0x00015426` |   `0x01` | Off = `0x00`                                               | `0=Off`, `1=On`         |
| Scan stop beep    |     `0x00015447` |   `0x01` | Off = `0x00`                                               | `0=Off`, `1=On`         |
| AM analog gain    |     `0x00015427` |   `0x00` | 1 = `0x01`, 15 = `0x0F`                                    | Direct integer `0~15`   |
| AM digital gain   |     `0x00015428` |   `0x00` | −25.5 = `0x01`, 0.0 = `0x34`, +5.0 = `0x3E`, +5.5 = `0x3F` | `dB = raw × 0.5 − 26.0` |
| AM-N analog gain  |     `0x00015429` |   `0x00` | 1 = `0x01`, 15 = `0x0F`                                    | Direct integer `0~15`   |
| AM-N digital gain |     `0x0001542F` |   `0x00` | −25.5 = `0x01`, 0.0 = `0x34`, +5.0 = `0x3E`, +5.5 = `0x3F` | `dB = raw × 0.5 − 26.0` |

All 15 variants differed from the baseline at exactly one byte. The supplied
AM-N −25.5 dB export was named `11-am-n-digital-gain-minus-15-5.PF`, but its
stored byte was `0x01`; the content therefore confirms −25.5 dB and the filename
is only a typo.

## Implementation consequence

The seven controls can be edited safely as single-byte settings. Digital-gain
raw values outside `0x00~0x3F` remain unknown stored values rather than being
silently clamped.
