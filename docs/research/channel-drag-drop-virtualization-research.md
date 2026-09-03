# Channel drag-and-drop virtualization research

## Decision

Position each absolute Channel row with `top: virtualRow.start` and reserve the
row's CSS `transform` exclusively for the value returned by `useSortable`.

Keep the existing `verticalListSortingStrategy`, `closestCenter`, Pointer
sensor, Keyboard sensor, and `sortableKeyboardCoordinates`. Do not introduce a
custom collision algorithm or change dnd-kit's measuring behavior to solve the
current wrong-target bug.

Add a `DragOverlay` as separate scroll-during-drag hardening. If a dragged row
can leave TanStack Virtual's rendered range, also keep the active index mounted
with a custom `rangeExtractor`. The geometry change fixes the reported nearby
move; the overlay and active-row retention protect longer drags that scroll the
virtualized list.

## Scope and current implementation

This recommendation applies to the installed legacy packages:

- `@dnd-kit/core` 6.3.1
- `@dnd-kit/sortable` 10.0.0
- `@tanstack/react-virtual` 3.14.10

`SortableChannelRow` currently puts two independent coordinate systems into one
CSS property:

```tsx
transform: `translateY(${virtualRow.start}px)${
  dragTransform ? ` ${dragTransform}` : ""
}`
```

The first transform is the row's permanent virtual-list position. The second is
dnd-kit's temporary drag/sort displacement. `DndContext` uses `closestCenter`,
and `SortableContext` already uses the correct virtual-list-capable
`verticalListSortingStrategy`.

## Why the target is wrong

dnd-kit's default draggable and droppable measurement function is
`getTransformAgnosticClientRect`. That function reads the element's bounding
rectangle and then inverses its computed transform. This is intentional for
dnd-kit's own temporary movement, but it also removes the Channel row's
`translateY(virtualRow.start)` base position. Multiple rendered rows are
therefore measured near their un-translated origin rather than at their actual
positions in the scrollable table. `closestCenter` then selects a row based on
incorrect rectangles. The exact wrong row varies with the visible range and
overscan, which explains results such as Channel 31 landing at Channel 10 or 13.

Sources: [dnd-kit default measuring configuration](https://github.com/clauderic/dnd-kit/blob/e9215e820798459ae036896fce7fd9a6fe855772/packages/core/src/components/DndContext/defaults.ts#L18-L29),
[dnd-kit rectangle measurement](https://github.com/clauderic/dnd-kit/blob/e9215e820798459ae036896fce7fd9a6fe855772/packages/core/src/utilities/rect/getRect.ts#L14-L25),
[transform-agnostic wrapper](https://github.com/clauderic/dnd-kit/blob/e9215e820798459ae036896fce7fd9a6fe855772/packages/core/src/utilities/rect/getRect.ts#L39-L49).

## Candidate comparison

### A. Use `top` for virtualization and `transform` for dnd-kit

**Recommended.** TanStack Virtual defines `VirtualItem.start` as the starting
pixel offset and explicitly says it is normally mapped to either `top`/`left`
or a translate. Using `top` preserves the virtual position when dnd-kit removes
transforms during measurement. The sortable transform remains isolated and can
continue to animate the active row and displaced rows.

The minimal row style is:

```tsx
style={{
  height: virtualRow.size,
  top: virtualRow.start,
  transform: CSS.Transform.toString(transform),
  transition,
}}
```

This is the smallest compatible change to the existing absolutely positioned
table rows. A two-layer structure, with virtual positioning on a wrapper and
the sortable transform on a child, is conceptually equivalent but would be a
larger and riskier table-markup change.

Official examples support the separation of coordinate systems:

- The legacy dnd-kit virtualized sortable story applies the virtualizer's
  positioning style to an item wrapper, applies sortable behavior separately,
  uses `verticalListSortingStrategy`, and renders a `DragOverlay`.
  [Legacy virtualized sortable example](https://github.com/clauderic/dnd-kit/blob/e9215e820798459ae036896fce7fd9a6fe855772/stories/2%20-%20Presets/Sortable/5-Virtualized.story.tsx#L41-L123)
- The current dnd-kit/TanStack Virtual example translates one ancestor that
  contains normal-flow sortable children; the individual sortable nodes do not
  carry the virtualizer's positioning transform. It uses dnd-kit's newer API,
  so it is architectural evidence rather than code to copy into this legacy
  integration.
  [Current React Virtual example](https://github.com/clauderic/dnd-kit/blob/6fb57833026e06bb3925eef78316ba56d59749c8/apps/stories/stories/react/Sortable/Virtualized/ReactVirtualExample.tsx#L48-L80)
- TanStack Virtual documents `VirtualItem.start` as an offset that may be mapped
  to `top`/`left` or a transform.
  [TanStack VirtualItem API](https://tanstack.com/virtual/latest/docs/api/virtual-item#start)

### B. Keep the virtual translate and override measuring

**Not recommended.** Setting `MeasuringStrategy.Always` or a numeric measuring
frequency changes when dnd-kit measures; it does not change the default
transform-agnostic measurement, so it cannot by itself restore the missing
virtual offset. dnd-kit's measuring source confirms that strategy controls
whether measuring is enabled, while the configured `measure` function produces
the rectangle.

Overriding `droppable.measure` with `getClientRect` would retain the virtual
translate, but it would also retain dnd-kit's temporary sortable transforms
whenever rows are remeasured during a drag. That makes collision rectangles
depend on animated presentation state. It is especially brittle when scrolling
mounts new rows or a container asks to be remeasured. A custom measuring
function that removes only dnd-kit's part of a combined matrix would add parsing
and ownership complexity that option A avoids completely.

Sources: [dnd-kit measuring implementation](https://github.com/clauderic/dnd-kit/blob/e9215e820798459ae036896fce7fd9a6fe855772/packages/core/src/hooks/utilities/useDroppableMeasuring.ts#L31-L99),
[measuring strategies](https://dndkit.com/legacy/api-documentation/context-provider/dnd-context/#layout-measuring).

### C. Add `DragOverlay`, custom collision logic, or both

**Use `DragOverlay` as complementary hardening, not as the geometry fix.** An
overlay keeps the dragged representation outside normal flow and protects it
from clipping, scrolling, and source-row unmounting. dnd-kit explicitly says a
virtualized list should use one because the original source may unmount while
the list scrolls. Its virtualized example also keeps the active item sticky and
uses a portal overlay.

An overlay does not correct the droppable rectangles used by `closestCenter`,
so adding it alone will not fix Channel 31 selecting Channel 10. Render the
`DragOverlay` component continuously and conditionally render only its child,
as required for drop animation.

Do not replace `closestCenter` with pointer-only or index-derived custom
collision logic for this bug. dnd-kit recommends `closestCenter` as the
forgiving default for sortable lists. `pointerWithin` works only with pointer
sensors and needs a fallback for keyboard input. A virtual-index collision
algorithm would duplicate scroll-offset, row-size, mounted-range, and keyboard
behavior already handled by the libraries, while concealing the bad DOM
geometry.

Sources: [DragOverlay guidance](https://dndkit.com/legacy/api-documentation/draggable/drag-overlay/#when-should-i-use-a-drag-overlay),
[legacy virtualized sortable example](https://github.com/clauderic/dnd-kit/blob/e9215e820798459ae036896fce7fd9a6fe855772/stories/2%20-%20Presets/Sortable/5-Virtualized.story.tsx#L72-L123),
[collision guidance](https://dndkit.com/legacy/api-documentation/context-provider/collision-detection-algorithms/#closest-center).

## Virtualization, scrolling, and registration

Only mounted rows can contribute DOM rectangles. dnd-kit's droppable measuring
loop records a rectangle only when a registered container currently has a DOM
node. `sortableKeyboardCoordinates` similarly filters to enabled registered
containers that have measured rectangles. Consequently:

- `overscan: 12` makes nearby pointer and keyboard targets available, but it
  cannot fix incorrect geometry;
- scrolling changes which Channel rows are registered and measurable;
- longer drags need the overlay so the visual drag source survives unmounting;
- retaining the active index through TanStack Virtual's `rangeExtractor` is a
  prudent companion to the overlay, and mirrors the legacy example's sticky
  active item;
- newly mounted targets should be measured automatically as registrations
  change, but scroll-through-boundary behavior must be validated in the real
  browser.

TanStack Virtual documents that `overscan` renders extra items above and below
the visible range and that `rangeExtractor` can force indexes such as sticky
items into the rendered set.

Sources: [dnd-kit droppable measuring loop](https://github.com/clauderic/dnd-kit/blob/e9215e820798459ae036896fce7fd9a6fe855772/packages/core/src/hooks/utilities/useDroppableMeasuring.ts#L56-L99),
[sortable keyboard coordinate getter](https://github.com/clauderic/dnd-kit/blob/e9215e820798459ae036896fce7fd9a6fe855772/packages/sortable/src/sensors/keyboard/sortableKeyboardCoordinates.ts#L18-L89),
[TanStack Virtual overscan and range extractor](https://tanstack.com/virtual/latest/docs/api/virtualizer#overscan).

## Pointer, keyboard, and accessibility

The current input architecture should remain:

- Pointer sensor with the existing activation distance.
- Keyboard sensor with `sortableKeyboardCoordinates`.
- A native button as the drag handle, with dnd-kit attributes and listeners.
- Context-specific screen-reader instructions and drag announcements.

The sortable preset documents `sortableKeyboardCoordinates` as moving to the
closest sortable element in the requested direction. dnd-kit's accessibility
guidance requires a focusable activator and equivalent keyboard operation:
Enter or Space to pick up/drop, arrow keys to move, and Escape to cancel. The
existing button handle meets the focusability requirement. Geometry changes and
the overlay must not move listeners to a non-focusable row or remove the current
localized instructions and announcements.

Sources: [sortable sensors](https://dndkit.com/legacy/presets/sortable/overview/#sensors),
[keyboard sensor](https://dndkit.com/legacy/api-documentation/sensors/keyboard/),
[dnd-kit accessibility guide](https://dndkit.com/legacy/guides/accessibility/#keyboard-support).

## Recommended implementation sequence

1. Change the row's stable virtual position from
   `transform: translateY(virtualRow.start)` to `top: virtualRow.start`.
2. Leave the row's `transform` unset when `useSortable` returns no transform;
   otherwise set it only to `CSS.Transform.toString(transform)`.
3. Keep `verticalListSortingStrategy`. It is the documented built-in strategy
   that supports vertical virtualized lists; `rectSortingStrategy` is not.
4. Keep `closestCenter`; correct the rectangles rather than compensating in
   collision selection.
5. Add an always-mounted `DragOverlay` with a presentational Channel-row preview
   or compact Channel preview as its conditional child.
6. If real scroll-during-drag testing shows the active row leaving the rendered
   range, add a `rangeExtractor` that unions the active Channel index with
   `defaultRangeExtractor(range)`.

Source: [dnd-kit sorting-strategy support](https://dndkit.com/legacy/presets/sortable/sortable-context/#strategy).

## Acceptance checks

Run these in Chrome because repository policy requires Chrome for browser UI
validation:

1. Scroll so Channel 31 is away from the top of the list, then pointer-drag 31
   onto 32. Confirm the result is exactly 31 -> 32.
2. Pointer-drag 32 onto 31 and verify the inverse move.
3. Repeat a move near the top, middle, and bottom of the viewport to ensure the
   result is independent of scroll offset and overscan composition.
4. Drag far enough to trigger downward and upward auto-scroll. Confirm the
   overlay remains visible, the active Channel is not lost, and newly mounted
   targets become selectable.
5. Focus a Channel handle and test Space and Enter pickup/drop, one-step
   ArrowDown/ArrowUp moves, repeated arrows across a virtualization boundary,
   and Escape cancellation. Confirm focus remains usable after drop.
6. Confirm live-region announcements identify the active and target Channel
   numbers and announce cancellation.
7. Confirm search still disables reordering and that double-click inspection,
   inline editing, sticky header behavior, and horizontal scrolling are
   unchanged.

## Remaining uncertainty

Official sources establish the coordinate-system conflict and the recommended
virtualized-list architecture. They do not provide a legacy dnd-kit + TanStack
Virtual table example using this repository's exact DOM structure. In
particular, long pointer auto-scroll and repeated keyboard movement across a
TanStack Virtual mount boundary remain browser behaviors to prove after the
change. The `top` fix is low-risk for the fixed 44 px rows, but the overlay and
active-index retention should be judged by those Chrome checks rather than by
unit tests alone.
