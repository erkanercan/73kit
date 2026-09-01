# APRS symbol rendering research

## Decision

Keep the radio-facing value exactly as it is: a symbol table plus a zero-based
symbol index. For the UI, add a visual picker that shows the selected icon,
two-character APRS code, and a short localized name. The radio's verified
Codeplug does not expose a separate overlay value, so this CPS should display
and select only the plain primary and secondary symbols unless a future radio
comparison proves another storage field.

The implemented picker uses the aprs.fi sprites from `hessu/aprs-symbols`, as
selected for this project. Both high-DPI sheets are vendored locally. Their
exact upstream commit was not recorded, so
[`public/aprs-symbols/NOTICE.md`](../../public/aprs-symbols/NOTICE.md) records
that provenance gap, local checksums, and the upstream per-symbol copyright
inventory. The inventory identifies mixed and sometimes unknown provenance;
that limitation remains explicit rather than presenting the artwork as one
permissively licensed set.

## Formal encoding

APRS has two base symbol tables. In a position packet's Information field, a
symbol is encoded as a one-character table identifier followed, at its defined
position in the packet, by a one-character symbol code. `/` selects the primary
table and `\` selects the alternate/secondary table. The APRS 1.0.1 reference
calls the Information-field form the preferred method and gives `/>` as the
primary-table car example. [APRS Protocol Reference 1.0.1, Chapter 20, pp.
90-93](https://www.aprs.org/doc/APRS101.PDF#page=99)

The symbol-code space is the 94 printable ASCII characters from `!` (decimal 33) through `~` (decimal 126). Appendix 2 numbers these `01` through `94` in
both tables. Therefore the mappings relevant to this repository are:

```text
symbolCode = String.fromCharCode(0x21 + radioIndex)
radioIndex = symbolCode.charCodeAt(0) - 0x21

radio index 0  -> code ! -> APRS table entry 01
radio index 14 -> code / -> APRS table entry 15
radio index 29 -> code > -> APRS table entry 30
radio index 93 -> code ~ -> APRS table entry 94
```

This matches both the local implementation, which constructs 94 characters
starting at `0x21`, and the controlled radio finding that the stored index is
`0~93`. [`modules/codeplug/aprs-symbols.ts`](../../modules/codeplug/aprs-symbols.ts)
and [the reviewed UVL-15W storage reference](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md#8-aprs)

The `01~94` values printed in the protocol appendix are one-based table-entry
numbers, not the radio's stored byte. The UI should not expose that additional
numbering system; the useful operator-facing identity is the two-character
code such as `/>` or `\_`.

## Primary, secondary, and overlays

The primary table uses `/` and is described by the base specification as
mostly stations. The alternate table uses `\` and is described as mostly
objects. The original 1.0.1 specification permits overlays only on marked
alternate symbols: a numeric or alphabetic table-identifier character selects
the alternate symbol and is drawn over it. Primary symbols cannot be overlaid.
For example, `3>` is the alternate car with a `3` overlay rather than a third
table. [APRS Protocol Reference 1.0.1, Chapter 20, pp.
90-92](https://www.aprs.org/doc/APRS101.PDF#page=99)

The later APRS 1.2 symbol expansion permits overlay characters on all 94
alternate symbols and documents commonly assigned combinations. It describes
36 conventional overlays (`0-9`, `A-Z`) per secondary base symbol; the master
symbol list says new symbol meanings since 2007 are normally expressed as
overlays. [Official APRS master symbol list](https://www.aprs.org/symbols/symbolsX.txt)
and [official APRS 1.2 overlay/extension list](https://www.aprs.org/symbols/symbols-new.txt)

An overlay changes the transmitted table-identifier character, not the
zero-based base-symbol index. Supporting overlays in a CPS therefore requires
three logical values: base table, symbol code, and optional overlay. The
UVL-15W layout currently has only `symbolTable` (`0` primary, `1` secondary)
and `symbolIndex` (`0~93`). No overlay byte or overlay-capable table identifier
has been verified. The UI must not invent an overlay control that cannot be
written to the radio.

Source-address SSIDs are a separate legacy fallback for trackers that cannot
put a symbol in the Information field. APRS assigns `-1` through `-15` to a
small set of primary-table icons, but the specification also states that an
Information-field symbol takes precedence. The radio's station SSID field is
therefore not a second way to choose the UI symbol and should not be described
that way. [APRS Protocol Reference 1.0.1, pp.
92-93](https://www.aprs.org/doc/APRS101.PDF#page=101)

## Names and descriptions

The local hand-written name tables should not be treated as authoritative.
They omit many valid entries and several names conflict with both the protocol
table and maintained application index. Confirmed primary-table mismatches
include `/(` (“Cloudy” locally versus “Mobile satellite station”), `/,`
(“Reverse L” versus “Boy Scouts”), `/L` (“Lighthouse” versus “PC user”), `/T`
(“Thunderstorm” versus “SSTV”), `/l` (“Area Object” versus “Laptop”), `/p`
(“Rover” versus “Dog”/“Rover (puppy dog)”), and `/r` (“Antenna” versus
“Repeater”). Correct this metadata before adding images, or the artwork will
make misleading labels look more authoritative.

For implementation, use a reviewed snapshot of the aprs.fi machine-readable
symbol index as the English semantic baseline, then maintain Turkish
translations alongside it. The index is specifically intended for applications,
contains CSV plus generated JSON/XML/YAML, and is CC BY-SA 4.0. Record the
upstream commit and attribution when importing or adapting it.
[aprs.fi APRS symbol index](https://github.com/hessu/aprs-symbol-index)

Empty, reserved, and obsolete entries still occupy real radio indices. Keep
all 94 entries selectable so an existing Codeplug round-trips without loss.
Label them honestly as `Reserved` or `Unassigned` plus their two-character
code; do not collapse or renumber the list.

## Available image assets

The strongest ready-made asset candidate is the aprs.fi high-resolution symbol
repository. It provides:

- vector source in Adobe Illustrator/PDF form;
- transparent PNG sprite sheets at several logical sizes and high-DPI variants;
- separate sheets for primary (`TABLEID 0`), secondary (`TABLEID 1`), and
  overlay glyphs (`TABLEID 2`);
- a 16-column by 6-row printable-ASCII layout, ordered `!` through `~`.

The repo documents the file naming and pixel sizes, and its export script
confirms the 16-column layout. [aprs.fi symbol-set README](https://github.com/hessu/aprs-symbols)
and [export script](https://github.com/hessu/aprs-symbols/blob/master/aprs-sym-export.js)

The sprite address maps directly from this radio's index:

```text
column = radioIndex % 16
row = Math.floor(radioIndex / 16)
```

There is no need to generate 188 individual files. A primary and secondary
sprite sheet are sufficient for the radio's currently verified capability.
The third overlay sheet is unnecessary unless overlay storage is later found.

`@meridian-aprs/symbols` 1.0.0 is a newer CC BY 4.0 SVG alternative, but the
published package currently contains only six primary-table icons. It cannot
cover the UVL-15W's 188 base choices and is not a drop-in source for this
picker. [Published `@meridian-aprs/symbols` package](https://www.npmjs.com/package/@meridian-aprs/symbols)

### Licensing and reuse status

The aprs.fi README says the set may be used by APRS applications for free and
asks users to link back to its source. However, its detailed copyright file is
more restrictive and must control the risk assessment: the set is a collection
from different sources; many vectorized APRS originals have **unknown**
licensing; some entries are CC licensed or public domain; and a few are product
or brand logos whose owners may restrict use. [aprs.fi symbol-set copyright
inventory](https://github.com/hessu/aprs-symbols/blob/master/COPYRIGHT.md)

Consequently:

1. A repository or package that wraps these PNG files in an MIT license does
   not make the borrowed graphics uniformly MIT licensed.
2. Copy the upstream `COPYRIGHT.md` and attribution if the sprites are used,
   and pin the source commit so the shipped asset provenance is reproducible.
3. Before public or commercial distribution, obtain permission for the full
   sprite set or replace unknown/trademarked entries with clean original work.

The semantic APRS codes and table structure come from the protocol. A clean
original drawing may depict those meanings without copying the visual artwork,
but trademarked logos should still be avoided or replaced with generic
representations.

## Recommended browser-CPS design

Keep **Symbol table** as the existing primary/secondary control. Replace the
symbol's long text-only select with a searchable popover suited to 94 entries:

- trigger: 32 px preview, localized name, and code, for example `Car - />`;
- popover header: search by localized name or exact code;
- body: a compact icon grid for quick recognition, with the name and code in a
  tooltip and accessible name;
- keyboard: normal arrow-key navigation, Enter to choose, Escape to close;
- selected state: visible border/check mark that does not rely on color;
- reserved entries: neutral placeholder plus exact code, still selectable.

Changing the table should immediately redraw the same stored index from the
other sprite sheet; it must not silently choose a different index. The actual
edit remains the existing `{ symbolTable, symbolIndex }` pair, preserving the
Codeplug contract and baseline-aware change tracking.

Self-host the two chosen sprite files under the application's static assets;
do not depend on a runtime CDN. Use CSS background positioning from the index,
with the high-DPI sheet scaled to its logical dimensions. This produces one
cached request per table, crisp icons, and no 188-component or 188-file asset
surface.

## Implementation gate

Before application code is changed, choose one asset policy:

1. **Prototype / accepted provenance risk:** vendor the aprs.fi primary and
   secondary sprites with its complete copyright inventory and attribution.
2. **Distribution-safe:** create or commission a clean original 188-symbol set,
   document each source, and publish it under an explicit project-compatible
   license.

Whichever policy is chosen, take the English names from one pinned semantic
source, correct the current mismatches, add Turkish equivalents, and add tests
for the boundary mappings `0 -> !` and `93 -> ~` plus representative sprite
coordinates.
