# Menu visibility mask research

## Result

The 2026-07-23 TYT CPS stores Menu Visibility at radio address `0x0001EA00`,
not the older documented address `0x0001BA00`. The block remains 256 bytes and
uses an LSB-first bitmap: `1` shows an item and `0` hides it.

The supplied controlled PF comparisons prove 174 assigned bits, `0` through
`173`. The original entries remain at bits `0` through `165`, and the current
CPS appends eight entries at bits `166` through `173`.

## Controlled comparison evidence

The user supplied `Data Files (1).zip`, containing an untouched current-CPS
export, one export with all submenus disabled, and one export for each newly
identified leaf setting. Every file differs from `00-default.PF` only in the
first 32-byte record of the `0x0001EA00` block.

| PF variant                   | Address      | Default | Variant | Cleared bit | Menu item        |
| ---------------------------- | ------------ | ------- | ------- | ----------- | ---------------- |
| `09-image-version-off.PF`    | `0x0001EA14` | `FF`    | `BF`    | 166         | Image Version    |
| `08-language-version-off.PF` | `0x0001EA14` | `FF`    | `7F`    | 167         | Language Version |
| `05-am-rx-gain-off.PF`       | `0x0001EA15` | `FF`    | `FE`    | 168         | AM RX Gain       |
| `06-am-n-rx-gain-off.PF`     | `0x0001EA15` | `FF`    | `FD`    | 169         | AM-N RX Gain     |
| `03-auto-repeater-off.PF`    | `0x0001EA15` | `FF`    | `FB`    | 170         | Auto Repeater    |
| `02-cit-off.PF`              | `0x0001EA15` | `FF`    | `F7`    | 171         | CI-T             |
| `04-auto-am-mode-off.PF`     | `0x0001EA15` | `FF`    | `EF`    | 172         | Auto AM Mode     |
| `07-scan-edge-init-off.PF`   | `0x0001EA15` | `FF`    | `DF`    | 173         | Scan Edge INIT   |

`01-all-submenus-off.PF` clears bytes `0x0001EA00` through `0x0001EA14` and
bits 0 through 5 of `0x0001EA15`. It leaves bits 6 and 7 of `0x0001EA15` and
all later bytes set. This independently confirms that the current selectable
range ends at bit 173.

The Main Menu row is a parent node, not an independently switchable leaf. The
stock CPS clears its stored bit when all descendants are disabled. Our UI
should therefore expose the hierarchy and cascading bulk behavior rather than
presenting Main Menu as an unrelated toggle.

## Consequences for implementation

- Use `0x0001EA00` as the current Menu Visibility storage address.
- Preserve all unassigned bits and all bytes beyond the values explicitly
  changed by the user.
- Keep the reviewed legacy bit map for bits 0 through 165, but correct GPS bit
  20's user-facing label from `Zone Settings` to `Time Zone`.
- Append the eight proven entries above in bit order.
- Treat parent/category checkboxes as bulk controls with indeterminate states;
  leaf settings remain the independently editable values.
- The old `0x0001BA00` block was all `FF` in every supplied current-CPS PF and
  must not be written as the active mask without separate legacy-version
  detection.

## Relationship to the reviewed storage reference

The reviewed storage reference has been updated with the verified current
address, assigned range, appended entries, and Time Zone label. See
[section 2.6](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md#sec2_5).
