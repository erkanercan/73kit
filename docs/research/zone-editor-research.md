# Zone editor research

## Decision

Use one **Zones** workspace page with a persistent zone list and a selected-zone
member editor. Do not reproduce the stock CPS tree as `Zone Set`, `Zone 0`,
`Zone 1`, and so on.

The page should separate two concepts:

1. **Zone definition** — the zone's name and ordered channel members.
2. **Radio A/B zone selection** — which zone is active/default on each of the
   radio's two displayed receivers.

Both concepts are implemented. Controlled stock-CPS backup comparisons proved
that each band owns an independent multi-Zone bitmap and that an empty bitmap
means All Zones.

## What the UVL-15W actually stores

The repository's reviewed storage reference documents 16 fixed zone slots,
24-byte UTF-8 names, and 128 ordered member slots per zone. It also documents a
second, inverted membership bitmap per channel; both representations must be
updated together. These layouts are already implemented behind the Codeplug
domain interface. [`TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md`](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md#41-zone-settings)

The original storage reference lacked the A/B mapping. Controlled comparisons
have since proved two 32-bit little-endian bitmaps at physical addresses
`0x1E342` and `0x1E346`. Bits 0-15 select Zone 0-15, multiple bits may be set,
and a zero lower bitmap means All Zones. The upper 16 bits are unrelated and
must be preserved.

The UVL-15W manual identifies the radio as dual-band, dual-display, and
dual-standby, with the A/B button switching the primary operating frequency.
That supports treating A and B as receiver/display paths rather than two member
lists inside every zone. [UVL-15W user manual](https://manuals.plus/m/3aa0f2df9cb9143e8c4578685f37cd397cb28e9af5b1f8804c31d816fac31168)

## Evidence from other CPS applications

### qdmr

qdmr's official manual defines a zone as a named list of channels for an area
or situation. Its Zones tab lists all zones, allows zone ordering, and opens one
editor for a selected zone. The editor owns the name, adding/removing members,
and member order. This is the closest proven interaction model to our needs.
[qdmr user manual, “Assembling Zones”](https://static.dm3mat.de/qdmr/manual.pdf)

The same manual explains an important radio-model distinction:

- some radios independently select a zone for VFO A and VFO B, so each zone is
  one channel list;
- other radios select one zone for both VFOs, so each zone contains separate A
  and B member lists.

qdmr normalizes to the latter model for portability and splits zones when
writing radios that use the former. The UVL-15W storage has only one verified
ordered list per zone plus two independent active-Zone selections. Therefore the
UVL-15W matches the **independent A/B selected-zone** model, not qdmr's
two-lists-inside-one-zone model.

### OpenGD77

The OpenGD77 user guide confirms that member order is operational: Up/Down moves
through channels in the current zone, and scanning traverses channels in that
zone. It also shows that a channel can be added to the currently active zone and
that the firmware provides a synthetic `All Channels` zone. This supports
treating membership order as first-class rather than displaying an unordered
set. [OpenGD77 user guide](https://github.com/LibreDMR/OpenGD77_UserGuide/blob/master/OpenGD77_User_Guide.md)

### AnyTone

The AnyTone AT-D878 manual similarly defines a zone as a group of channels and
lets the operator select, add, name, and edit the channels in a zone. This
supports the common separation between reusable channel records and ordered
zone membership. [AT-D878UV user manual](https://support.bridgecomsystems.com/hubfs/Tech%20%28AnyTone%29/User%20Manuals/AT-D878UV%28PLUS%29%20user%20manual%20A12%20230429.pdf)

### Motorola MOTOTRBO

Motorola's CPS help treats the selected/default zone separately from zone
contents: for example, `Home Channel Zone` selects a zone set, followed by a
separate channel selection. This is further evidence that selection state does
not belong in each zone's membership editor. [MOTOTRBO CPS 2.0 help](https://docs-be.motorolasolutions.com/bundle/58612/raw/resource/enus/MN006055A01-AR_enus_MOTOTRBO_Customer_Programming_Software_CPS_2_0_Online_Help_User_Guide.pdf)

### CHIRP

CHIRP-next replaced fragmented bank editing with one unified Banks tab. Its
maintainers describe this as handling everything related to bank editing in one
place, alongside a spreadsheet-style memory editor with fewer clicks and only
relevant fields shown. Although banks are not identical to UVL-15W zones, this
is direct evidence against generating a navigation entry or page for every
group. [CHIRP-next UI changes](https://chirpmyradio.com/projects/chirp/wiki/ChirpNextBuildChanges)

## Recommended information architecture

### Route and layout

Use a single `/zones` route with a master-detail layout:

- **Left pane:** all 16 hardware zone slots in radio order, showing zone number,
  name or `Unused`, and member count. Include search only if it proves useful;
  16 rows do not require it.
- **Right pane:** the selected zone's editable name and ordered member table.
- Keep scrolling inside the panes/table so the application shell remains full
  height, matching the Channels workspace.
- On narrow layouts, use the zone list as the first view and open the selected
  zone editor in the existing Drawer pattern.

Do not create sidebar children or routes for Zone 0–15. They add navigation
noise, make comparison and switching slower, and encode fixed hardware slots
into the application's information architecture.

### Selected-zone member table

Show these columns:

- drag handle (empty header)
- position within zone
- channel number
- RX frequency
- TX frequency
- channel name
- TX power
- SQL type
- remove action

RX/TX/name/power/SQL are summaries of the referenced Memory channel, not copies
owned by the zone. Clicking a row may open the existing Channel editor Drawer,
but the zone table should not make those values look zone-specific. An edit to
one of them changes that Memory channel everywhere it is referenced.

Support:

- drag-to-reorder rows;
- remove from this zone without deleting the Memory channel;
- `Add channels` opening a searchable multi-select of valid Memory channels not
  already in the zone;
- member count and the 128-member capacity;
- a clear empty state for unused zones;
- consistency errors from `validateMembershipConsistency()` before write.

Because the radio has 16 fixed slots, use **Clear zone** (clear name and members)
rather than pretending a hardware slot can be deleted. Creating a zone means
filling an unused slot. Keep all slots addressable; optionally group or dim
unused slots instead of hiding them.

### Zone name editing

Edit the selected name inline in the detail header. Validate the actual encoded
UTF-8 byte length (maximum 24 bytes), not JavaScript character count. Reverting
to the baseline value must remove the corresponding pending change, consistent
with the Channel editor.

### A/B selection

The implemented page adds compact global controls above the master-detail
editor:

- `Band A Zones` — All Zones or any combination of Zone 0-15
- `Band B Zones` — All Zones or any combination of Zone 0-15

These controls select existing Zones; they do not edit Zone contents. Their
changes use the same baseline-aware pending-change behavior as other editors.

## Suggested implementation sequence

1. Build the single-page master-detail shell and render all 16 slots.
2. Implement baseline-aware zone-name editing.
3. Implement add/remove/reorder membership through `Codeplug.editZone()` only.
4. Reuse the Memory channel Drawer for deliberate edits to referenced channel
   properties.
5. Surface capacity and consistency validation.
6. Hardware-diff `Band Zone A/B`, then add the proven multi-Zone selectors.

## Decisions still worth confirming with the product owner

1. Should unused slots always remain visible (recommended), or live behind a
   `Show unused` control?
2. Should clicking a member open the existing Channel Drawer (recommended), or
   should the zone page be membership-only?
