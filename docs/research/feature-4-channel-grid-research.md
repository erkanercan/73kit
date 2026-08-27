# Feature 4 Channel Grid Research

Research date: 2026-08-25

## Implementation outcome

Feature 4 uses TanStack Table 8 plus TanStack Virtual and the repository's
existing Base Nova composition. It does not import the Radix-oriented TableCN
source port. This keeps the read-side grid small while retaining TableCN's
recommended headless foundations.

The product requirement subsequently added Memory-row drag ordering. The grid
uses dnd-kit pointer and keyboard sensors. A move is not a presentation-only
shuffle: it creates a pending Working Codeplug change and moves the channel's
48-byte record, validity, scan state, per-channel Zone and Scan List bitmaps,
and remaps ordered Zone and Scan List member references. Reset restores the
immutable Baseline Backup. General field editing remains deferred.

## Decision

**TableCN Data Grid is suitable only as a reviewed, locally owned source port. It
is not a turnkey dependency for this repository.**

Its spreadsheet navigation, row virtualization, selection, search, filtering,
sorting, pinning, resizing, column visibility, read-only mode, and future cell
editing are a strong match for a 1,000-channel CPS. However, the supported
installation copies a substantial source module into the application, the
official implementation is Radix Nova-oriented, and this repository uses Base
Nova. For Feature 4, adopt it only after a short compatibility spike proves the
port in this exact stack.

If the product is committed to spreadsheet-style Feature 5 editing (multi-cell
selection, copy/paste, keyboard editing, and bulk operations), the port is worth
considering. If Feature 4 will remain read-only for a meaningful period, a much
smaller TanStack Table plus TanStack Virtual implementation is the easier and
lower-maintenance choice.

## What TableCN actually is

The [TableCN repository](https://github.com/sadmann7/tablecn) is an application
and shadcn registry, not a published component library with a stable package API.
Its [package metadata](https://raw.githubusercontent.com/sadmann7/tablecn/main/package.json)
marks the package private and version `0.1.0`. The
[Dice UI installation documentation](https://diceui.com/docs/components/radix/data-grid)
uses `shadcn add`, which copies the implementation into the consuming project.
The current [registry item](https://diceui.com/r/data-grid.json) copies 21 local
component, hook, utility, direction, and type files. The main
[`use-data-grid.ts`](https://raw.githubusercontent.com/sadmann7/tablecn/main/src/hooks/use-data-grid.ts)
alone is currently about 3,600 lines.

That ownership model has two consequences:

- We can freely tailor and audit the grid, but we become responsible for fixes,
  tests, localization, and manually reviewing upstream changes.
- We must pin the imported snapshot. We should never dynamically consume
  upstream `main` or assume an upstream registry reinstall is a safe upgrade.

TableCN is [MIT licensed](https://raw.githubusercontent.com/sadmann7/tablecn/main/LICENSE.md),
so copying and modifying the source is permitted when the copyright and license
notice are retained.

## Dependencies and repository compatibility

The official registry declares these package dependencies:

- `@tanstack/react-table`
- `@tanstack/react-virtual`
- `lucide-react`
- `sonner`

It also requests 14 shadcn components: Badge, Button, Calendar, Checkbox,
Command, Dialog, Dropdown Menu, Input, Popover, Select, Separator, Skeleton,
Textarea, and Tooltip.

Framework versions are not the problem. Upstream currently uses Next.js 16,
React 19, Tailwind CSS 4, and shadcn 4 in its
[package metadata](https://raw.githubusercontent.com/sadmann7/tablecn/main/package.json),
matching this repository's major versions in [`package.json`](../../package.json).
The grid is a client component, which is appropriate for its browser interaction
state.

The composition layer is the material compatibility risk:

- This repository is `base-nova` in [`components.json`](../../components.json).
- Upstream is `radix-nova` in its
  [`components.json`](https://raw.githubusercontent.com/sadmann7/tablecn/main/components.json).
- The official Data Grid documentation is published under the
  [Radix component route](https://diceui.com/docs/components/radix/data-grid).
- On the research date, the expected Base Nova item URL
  `https://diceui.com/r/base-nova/data-grid.json` returned `404`.
- The official docs already require manual import-path repairs after installation.

Therefore, do not run the install command directly into the product branch.
Install into a throwaway worktree, inventory the result, then port the necessary
parts to Base Nova composition and bring them in as one owned `channel-grid`
module.

## Capability assessment

| Need                | Finding                                                                                                                                                                                  | Assessment                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1,000 rows          | Current source uses TanStack Virtual for vertical row virtualization.                                                                                                                    | Good fit.                                                                               |
| Many columns        | Horizontal scrolling, pinning, hiding, ordering, and resizing are supported. Current source only creates a row virtualizer even though the docs advertise row and column virtualization. | Acceptable for roughly 30 columns, but profile a production build.                      |
| Sorting             | TanStack-backed single/multi-column sorting is present.                                                                                                                                  | Good.                                                                                   |
| Filtering           | Advanced per-column filters and search are available.                                                                                                                                    | Good, but provide ham-friendly presets rather than expose every generic operator first. |
| Column visibility   | View menu supports show/hide.                                                                                                                                                            | Excellent for Basic and Advanced channel views.                                         |
| Pinning             | Left/right pinning is supported.                                                                                                                                                         | Pin channel number, name, and RX frequency.                                             |
| Resizing            | Drag resizing and double-click auto-fit are documented.                                                                                                                                  | Good.                                                                                   |
| Keyboard use        | Arrow, Tab, Home/End, page, selection, search, and editing shortcuts are documented.                                                                                                     | Strong starting point; still requires product accessibility testing.                    |
| Read-only Feature 4 | `readOnly` disables editing.                                                                                                                                                             | Suitable. Remove or suppress editing-only affordances as well.                          |
| Future editing      | Text, number, checkbox, select, multi-select, paste, row operations, and undo/redo exist.                                                                                                | Useful shell, but values must pass through the Codeplug domain model and validation.    |
| Localization        | Source contains hard-coded English labels, messages, toasts, and ARIA text.                                                                                                              | Requires an EN/TR message adapter before adoption.                                      |

The official [Dice UI Data Grid documentation](https://diceui.com/docs/components/radix/data-grid)
describes the grid behavior. TanStack Table officially owns sorting, filtering,
column visibility, pinning, and sizing, while virtualization is intentionally a
separate concern; see the
[TanStack Table overview](https://tanstack.com/table/latest/docs/overview) and
[virtualization guide](https://tanstack.com/table/latest/docs/framework/react/guide/virtualization).
TanStack Virtual is headless, leaving markup and styling under product control,
as documented in its
[introduction](https://tanstack.com/virtual/latest/docs/introduction).

For React 19, TanStack Virtual documents that `useFlushSync: false` may be needed
if scrolling produces a lifecycle `flushSync` warning; this must be checked in
the compatibility spike using the
[React adapter guidance](https://tanstack.com/virtual/latest/docs/framework/react/react-virtual).

The Dice UI docs claim WAI-ARIA grid behavior and full keyboard navigation, and
the source uses grid/row/gridcell roles, counts, indices, sort state, and roving
focus. Treat those as implementation evidence, not an accessibility guarantee.
The port still needs keyboard and screen-reader validation after localization.

## TYT column mapping

The reviewed storage reference defines the 48-byte record and associated Memory
bitmaps in
[`TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md`](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md#31-48-byte-memory-channel-record-byte-by-byte).
The current typed representation is
[`modules/codeplug/channel.ts`](../../modules/codeplug/channel.ts), decoded by
[`channel-codec.ts`](../../modules/codeplug/channel-codec.ts).

| TYT CPS column        | Storage/docs                                                             | Current `Channel`                     | Result for the UI                                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RX Freq               | 32-bit Hz                                                                | `receiveFrequencyHz`                  | Ready.                                                                                                                                                                                                                                 |
| TX Freq               | 32-bit Hz                                                                | `transmitFrequencyHz`                 | Ready. The TYT CPS keeps this read-only for Off/negative/positive duplex and enables direct editing when Duplex is Split.                                                                                                              |
| CH Name               | 24-byte UTF-8                                                            | `name`                                | Ready.                                                                                                                                                                                                                                 |
| DUP                   | 2-bit enum                                                               | `duplex`                              | Ready.                                                                                                                                                                                                                                 |
| Offset                | 32-bit Hz                                                                | `offsetFrequencyHz`                   | Ready.                                                                                                                                                                                                                                 |
| Talk-around / Reverse | 2-bit enum                                                               | `reverse`                             | Ready. Correct the user-facing spelling to “Talk-around.”                                                                                                                                                                              |
| CH Mode               | FM/FM-N/AM/AM-N                                                          | `modulation`                          | Ready.                                                                                                                                                                                                                                 |
| Step                  | documented step enum                                                     | `stepKHz`                             | Ready.                                                                                                                                                                                                                                 |
| TX Power              | Low/Medium/High                                                          | `transmitPower`                       | Ready.                                                                                                                                                                                                                                 |
| RX Only               | bit                                                                      | `receiveOnly`                         | Ready.                                                                                                                                                                                                                                 |
| BCLO                  | 2-bit enum                                                               | `busyChannelLockout`                  | Ready; expand BCLO to “Busy Channel Lockout” in help text.                                                                                                                                                                             |
| Scan Flag             | separate 2-bit bitmap                                                    | `scan`                                | Ready.                                                                                                                                                                                                                                 |
| Scrambler             | index                                                                    | `scrambler`                           | Ready.                                                                                                                                                                                                                                 |
| SQL Type              | 3-bit enum                                                               | `squelch`                             | Ready; label “Squelch” rather than unexplained “SQL.”                                                                                                                                                                                  |
| Tone Encoder          | type bits                                                                | folded into `transmitTone.kind`       | Read display is ready. Editing should expose type and value as one “TX Tone” control.                                                                                                                                                  |
| Tone Decoder          | type bits                                                                | folded into `receiveTone.kind`        | Read display is ready. Editing should expose type and value as one “RX Tone” control.                                                                                                                                                  |
| Tone Enc Value        | CTCSS/DCS index                                                          | folded into `transmitTone` value      | Ready. Preserve leading zeroes in DCS codes.                                                                                                                                                                                           |
| Tone Dec Value        | CTCSS/DCS index                                                          | folded into `receiveTone` value       | Ready. Preserve leading zeroes in DCS codes.                                                                                                                                                                                           |
| DTCSS polarity        | 2-bit enum                                                               | `dcsPolarity`                         | Ready; standardize product wording as “DCS polarity.”                                                                                                                                                                                  |
| Optional Signal       | type plus index                                                          | `optionalSignaling.kind` and `.index` | Ready for read display, but the TYT column list omits the selected signaling index. Show both kind and referenced entry.                                                                                                               |
| PTT ID                | index                                                                    | `pttId`                               | Ready.                                                                                                                                                                                                                                 |
| 2-Tone Decoder        | **No per-channel field is identified in the documented 48-byte record.** | Missing                               | The TYT CPS displays this control but keeps it disabled for every Optional Signal selection tested. Treat it as an inactive vendor placeholder and do not expose it unless later hardware or CPS evidence identifies working behavior. |
| APRS RX               | 2-bit enum                                                               | `aprsReceive`                         | Ready.                                                                                                                                                                                                                                 |
| Zone                  | inverted per-channel bitmap plus ordered lists/names                     | Missing                               | Documented but not parsed by Codeplug Core. Requires the Zone parser before meaningful names can be shown.                                                                                                                             |
| Scan List             | inverted per-channel bitmap plus ordered lists/names                     | Missing                               | Documented but not parsed. Requires the Scan List parser.                                                                                                                                                                              |

Important fields missing from the supplied TYT column list are:

- channel number and valid/unused state, both essential in a 1,000-slot Memory table;
- compander, which is documented and already decoded;
- Optional Signaling entry index;
- resolved Zone and Scan List names rather than anonymous bitmap numbers.

## Recommended ham-radio UX

Do not show all columns by default. A 25–30-column spreadsheet is useful for
experts but hostile as the initial view. Use TableCN's visibility and pinning to
provide two presets over the same data:

### Basic columns (default)

1. Channel number / valid state — pinned
2. Name — pinned
3. RX frequency — pinned
4. Duplex
5. Offset or explicit TX frequency
6. Mode
7. TX power
8. TX Tone
9. RX Tone
10. Scan flag
11. Zones
12. Scan Lists

This matches the common workflow: name the memory, enter the receive frequency,
choose simplex/repeater/split behavior, set transmit access tone, optionally set
a receive tone, then assign scan and organizational membership.

### Advanced columns (hidden by default)

Explicit TX frequency, talk-around/reverse, step, RX-only, BCLO, scrambler,
squelch logic, DCS polarity, compander, Optional Signaling kind/index, PTT ID,
2-Tone Decoder when resolved, and APRS RX.

Keep TX Tone and RX Tone as composed domain controls rather than four independent
generic columns. Explain that TX tone is commonly used to access a repeater,
while RX tone filters received audio; never silently mirror TX to RX. For Split,
enable the explicit TX-frequency editor, matching the observed TYT CPS behavior.
For Off/`+`/`-` duplex, keep TX frequency read-only, show RX plus direction and
offset, and calculate a TX preview. Retain the exact stored TX frequency and warn
if the values disagree.

For Feature 4, all controls remain read-only. When Feature 5 enables editing,
TableCN must send proposed values into a typed Channel draft/validator/encoder.
It must never mutate immutable decoded `Channel` objects or raw Codeplug bytes
directly.

## Memory, VFO, Call, Temporary, and Weather presentation

Do not combine different storage semantics into one 1,006-row table.

Use a page-level segmented switch or tabs:

- **Memory** — the main virtualized 1,000-slot table with validity, scan, Zone,
  and Scan List membership.
- **VFO** — a compact two-row A/B table using the shared channel fields except
  channel name, Zone, and Scan List, matching the observed TYT CPS.
- **Call** — a compact two-row Call 1/Call 2 table using the VFO fields plus
  channel name, matching the observed TYT CPS. Zone and Scan List do not apply.

Temporary A/B are internal VFO snapshots. The storage reference requires every
save/write to mirror VFO A to Temp A and VFO B to Temp B, so Temporary records
must not be presented as independently editable user channels. Weather channels
are fixed templates and remain internal rather than appearing in the channel
editor or a separate page. Their user-facing controls stay in Radio Settings →
Function Settings, matching the current TYT CPS.

The radio's A- and B-band operating modes determine whether each side is using
Memory, VFO, Call, or Weather mode. That setting is separate from editing the
corresponding table. The UI should explain this relationship, but mode selection
belongs with Radio Settings rather than as a grid-level “active table” switch.

The current Codeplug read contains these regions, but
[`modules/codeplug/index.ts`](../../modules/codeplug/index.ts) exposes only the
1,000 Memory Channels. Before these tabs can ship, add typed read codecs for VFO
A/B and Call 1/2. Keep Temp A/B private to the Codeplug writer.

## Unresolved questions before editable channels

1. Does the Scan Flag shown in TYT's VFO and Call tables become editable and
   produce a persistent change? The documented scan bitmap covers only the
   1,000 Memory channels, not VFO or Call records.
2. Should invalid Memory slots display their stale decoded bytes or display as
   empty? Safer product behavior is “Unused” by default with an opt-in raw-value
   inspection, because invalid slots may retain old bytes.
3. Should Zone and Scan List parsing be pulled forward into Feature 4? The
   current Feature 4 specification requires membership display, so either pull
   the read-only parsers forward or explicitly defer those columns until Epic 6.

## Recommended adoption sequence

1. Build a throwaway Base Nova compatibility spike with a pinned registry
   snapshot; do not modify product code during evaluation.
2. Verify typecheck/build, dark mode, resizing/pinning, 1,000 rows and all target
   columns in React 19 production mode.
3. Replace Radix-specific composition and hard-coded English with Base Nova
   components and EN/TR messages.
4. Remove unused cell variants and editing-only dependencies for Feature 4, or
   consciously retain them only if Feature 5 follows immediately.
5. Put a narrow Channel row/view-model adapter between the Codeplug domain and
   the grid.
6. Validate keyboard navigation, focus through virtualized rows, screen-reader
   row/column announcements, horizontal scrolling, and sticky pinned columns.
7. Only after the spike passes, adopt the owned source and record its upstream
   commit SHA and MIT notice.

**Implemented decision:** Feature 4 uses TanStack Table plus TanStack Virtual,
existing Base Nova controls, and dnd-kit for tracked Memory-row ordering. A
TableCN source port remains an option only if later spreadsheet field editing
needs its larger editing system.
