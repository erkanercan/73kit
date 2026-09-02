# Ham-Radio CPS Operator Workflow Research

Research date: 2026-09-01

## Conclusion

The simplest defensible workflow for 73Kit is the familiar four-action CPS
model:

1. **Open** a saved Codeplug or factory default.
2. **Save** the Working Codeplug as a backup or shareable file.
3. **Radio Read** to create a fresh, Radio-specific Working Codeplug.
4. **Radio Write** to send reviewed changes back to the same compatible Radio.

Firmware and resource updates should remain a separate **Update Radio** task.
Version profiles should be selected automatically from a connected Radio or
recognized file wherever possible. Operators should not have to understand
layout IDs, address ranges, migration adapters, or resource manifests.

This keeps the existing 73Kit vocabulary, matches TYT's official Read/Write
mental model, and retains CHIRP's strongest safety property: programming starts
from an image associated with the target Radio, not from generic imported data.

## Primary-source findings

### CHIRP's basic programming model

CHIRP documents clone-mode programming as three steps: download the complete
Radio contents, make changes, and upload the changed image. It recommends
saving the downloaded image before and after editing. Its UI labels the actions
`Download from radio...` and `Upload to radio...`, with independent file
`Open`, `Save`, and `Save As` actions.

Sources:

- [CHIRP Beginners Guide](https://chirpmyradio.com/projects/chirp/wiki/Beginners_Guide)
- [CHIRP main-window source](https://github.com/kk7ds/chirp/blob/master/chirp/wxui/main.py#L625-L800)
- [CHIRP file open/save source](https://github.com/kk7ds/chirp/blob/master/chirp/wxui/main.py#L1233-L1347)

CHIRP explicitly distinguishes a generic CSV from a Radio-specific image. A
CSV cannot be uploaded directly. The operator must first download or open an
image for the target Radio, then import or copy the generic memories into that
image before uploading. That is directly applicable to cross-version PF and
legacy-Codeplug handling: portable data may inform a Working Codeplug, but it
must not bypass target-profile and Source Radio checks.

The current CHIRP UI reinforces this with an “Import not recommended” prompt
that recommends opening the source and copying data into the target image. It
also automatically saves an image backup after a download and immediately
before an upload. These safeguards do not require the operator to remember a
separate backup ritual.

Sources:

- [CHIRP CSV HowTo](https://chirpmyradio.com/projects/chirp/wiki/CSV_HowTo)
- [CHIRP FAQ](https://chirpmyradio.com/projects/chirp/wiki/FAQ)
- [CHIRP import and automatic-backup source](https://github.com/kk7ds/chirp/blob/master/chirp/wxui/main.py#L1349-L1594)

### CHIRP's model, firmware, and prompt handling

For a download, CHIRP presents Port, Vendor, and Model, remembers recent
choices, permits model-specific pre-download instructions, and can replace the
chosen class with a model detected from the connected device. For an upload,
the image already supplies Vendor and Model, so those selectors are disabled;
only the port remains operator-selectable. Model-specific upload instructions
are shown before communication when required.

Sources:

- [CHIRP clone dialog source](https://github.com/kk7ds/chirp/blob/master/chirp/wxui/clone.py#L289-L378)
- [CHIRP download flow source](https://github.com/kk7ds/chirp/blob/master/chirp/wxui/clone.py#L671-L789)
- [CHIRP upload flow source](https://github.com/kk7ds/chirp/blob/master/chirp/wxui/clone.py#L791-L860)
- [CHIRP Radio prompt API](https://github.com/kk7ds/chirp/blob/master/chirp/chirp_common.py#L792-L798)

CHIRP also has a first-class experimental-driver warning that requires an
explicit acceptance before an experimental model can be used. A representative
official driver warns the operator to download and retain the original image
before changing anything. The same driver rejects an opened image if its saved
firmware metadata is absent or incompatible.

Sources:

- [CHIRP experimental prompt handling](https://github.com/kk7ds/chirp/blob/master/chirp/wxui/clone.py#L679-L701)
- [Official CHIRP UV-K5 driver firmware and backup checks](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/uvk5.py)

CHIRP drivers advertise feature capabilities through `RadioFeatures`, including
whether settings, banks, names, tuning steps, modes, and related fields are
available. This supports capability-based UI rather than presenting every
control for every Radio and failing later.

Source: [CHIRP RadioFeatures source](https://github.com/kk7ds/chirp/blob/master/chirp/chirp_common.py#L836-L880)

### TYT UVL-15W terminology and behavior

TYT's official July 2026 instructions call the saved programming data a
**codeplug** and the shareable native file a **PF file**. They say a PF file can
be dragged into the CPS and opened directly, including a file received from
another UVL-15W user. The same release notes describe selecting one or more
channels in the memory page and saving them into a Zone or Scan List.

TYT separates programming from updating. The update path is
`CPS -> Tools -> update radio`, with separate **MCU firmware** and **Flash Data**
inputs. The operator puts the Radio into update mode by holding PTT and the top
orange button while powering on. TYT says the Radio automatically powers on
after the firmware update.

TYT also publishes version-dependent preparation rules:

- write Flash Data before updating beyond firmware 3.5.16;
- write Language 1.01.04 before the 3.7.15 generation;
- write Language 1.01.05 for the 3.7.23 generation.

Primary sources:

- [Official TYT 20260723 CPS and firmware archive](https://www.tyt888.com/uploads/file/20260725/20260725104726_6123.zip), `Operation instruction.docx`, pages 1-3 and release-note pages 20-23
- [Official TYT 20260715 CPS and firmware archive](https://www.tyt888.com/uploads/file/20260715/20260715173730_4119.zip), `Operation instruction.docx`, pages 1-3
- [Official TYT 20260526 CPS and firmware archive](https://www.tyt888.com/uploads/file/20260526/20260526162432_6168.zip), `Operation instruction.docx`, page 1
- [TYT download page](https://www.tyt888.com/download.html)

The official files do not publish a general cross-version PF compatibility
promise. The observed container and layout evidence is recorded separately in
[UVL-15W Default PF Version Comparison](./uvl15-default-pf-version-comparison.md)
and should remain the basis for profile detection and conservative fallback.

## Actionable UX principles for 73Kit

### 1. Keep the primary actions literal and persistent

Use the existing labels **Open**, **Save**, **Radio Read**, and **Radio Write**.
Do not rename them to synchronization, cloning, provisioning, deployment, or
profile operations. Put **Update Radio** outside the programming actions so a
normal Codeplug edit never feels like a firmware update.

### 2. Detect versions; do not ask operators to choose them routinely

73Kit supports one Radio model, so CHIRP's Vendor and Model selectors add no
value. On Radio Read, identify firmware, hardware, bootloader, Image resource,
and write protection automatically. On file open, use exact-known hashes and
strong structural markers. Ask for the originating CPS/firmware family only
when a modified PF remains genuinely ambiguous.

Show the result as one short status, for example:

> UVL-15W, firmware 3.7.15 — Beta support

Keep layout IDs and detection evidence in diagnostics, not in the main flow.

### 3. Make safe defaults effortless

A successful Radio Read should automatically create the immutable baseline and
the editable Working Codeplug. Offer the download/export after success, but do
not require the operator to understand backup formats before editing. Preserve
unknown bytes automatically.

For a PF received from another operator, **Open** must never mean **Radio
Write**. Open it for inspection and editing; bind it to a Radio only after a
fresh read and compatibility check.

### 4. Gate by capability, not by scattered warnings

Each version profile should declare which editors, migration paths, Radio
operations, and updater paths are available. Hide or disable an unsupported
feature with one concrete reason. Avoid showing editable controls whose byte
mapping is unproven.

Use three operator-facing states:

- **Supported**: released and validated operation;
- **Beta**: exact operation and version are enabled with an up-front beta
  notice and retained recovery backup;
- **Open only**: file inspection/export is available, but Radio Write is not.

Do not use “Beta” as permission for an unknown destructive combination.

### 5. Ask once at the consequential boundary

Radio Read needs brief cable/power instructions and no risk acknowledgement.
Radio Write needs a review of changes, the detected target Radio, and one final
confirmation. A Beta notice belongs in that review rather than in repeated
modal warnings throughout editing.

Update Radio needs its own guided preparation screen. Show the current and
target firmware/resource versions, automatically select the known required
package sequence, require a complete pre-update backup, and give only the next
physical instruction. Do not expose raw package choice by default.

### 6. Use outcome language

Progress and completion copy should describe the operator's task:

- `Reading Radio…`
- `Backup saved`
- `Writing Radio… Do not disconnect the cable.`
- `Radio Write complete. The Radio is restarting.`
- `Updating Language resources…`
- `Firmware update complete. Verify the Radio version.`

Reserve protocol commands, byte counts, hashes, and address ranges for
diagnostics.

### 7. Preserve recovery paths visibly

The default path for any Beta Radio Write or update should retain and name the
pre-operation backup. If an operation ends after data may have been accepted
but before completion is known, report **Outcome unknown** and offer recovery
instructions; never call it a normal failure or retry automatically.

## Recommended product shape

The main UI does not need a new version-management section. Add version
awareness behind the existing actions:

- **Open** accepts `.73kcps`, `.PF`, and raw backups, then shows the detected or
  selected compatibility family in the existing Working Codeplug summary.
- **Save** defaults to the durable 73Kit CPS file and offers PF/raw export as
  explicit alternative formats.
- **Radio Read** detects the connected Radio, chooses the profile, creates the
  baseline, and opens only supported editors.
- **Radio Write** remains available only for a Source Radio match and an exact
  enabled profile; Beta profiles add one concise notice to the existing review.
- **Update Radio** detects the source version, offers a single recommended path
  such as `Update to 3.7.23`, performs backup and prerequisites in order, and
  verifies the result before programming is offered again.

This is simpler than reproducing CHIRP's multi-vendor dialogs because 73Kit is
model-specific, while keeping CHIRP's proven separation between file handling,
Radio-specific images, and destructive upload.

## Evidence limits

- CHIRP is a cross-model application, so its Vendor/Model picker is evidence
  for binding operations to an identified driver, not a UI requirement for a
  UVL-15W-only application.
- TYT's translated threshold wording around “after” firmware versions is
  ambiguous. Exact catalog pairings should continue to use the official files
  and repository validation evidence rather than reproduce that wording.
- Official packages and defaults establish candidate compatibility profiles;
  they do not replace physical Radio Read, Radio Write, update, reboot, and
  recovery validation for destructive Beta operations.
