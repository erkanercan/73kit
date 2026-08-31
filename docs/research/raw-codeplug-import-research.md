# Raw Codeplug import research

## Question

How should the browser CPS import a local, headerless `102,400`-byte raw
Codeplug image without treating the file as proof of a Radio identity or
weakening the existing Radio Write boundary?

This note covers browser file handling, untrusted-binary validation, relevant
behavior in CHIRP, and the implications of the repository's current document
model. It does not establish compatibility with an OEM file container or any
file whose bytes are not the exact `0x8000` through `0x20FFF` Radio Codeplug
image.

## Primary-source findings

### Browser file handling

- A `Blob` has an exact byte `size`, while `arrayBuffer()` reads all of its
  bytes asynchronously into a new `ArrayBuffer`; the read can reject. The safe
  sequence is therefore to check `File.size` before allocating, catch the read
  failure, and check `ArrayBuffer.byteLength` again before parsing. See the
  [W3C File API](https://www.w3.org/TR/FileAPI/#blob-section) and its
  [`arrayBuffer()` algorithm](https://www.w3.org/TR/FileAPI/#dom-blob-arraybuffer).
- The HTML `accept` attribute is explicitly a hint to the user agent, not a
  validation result. `accept=".bin,application/octet-stream"` improves the file
  picker but application code must still validate the selection. See the
  [WHATWG HTML Standard](https://html.spec.whatwg.org/multipage/input.html#attr-input-accept).
- A Blob's `type` may be an empty string when the user agent cannot determine a
  media type, and applications can construct a Blob with a chosen type. MIME
  must not be the security gate for a raw Codeplug. See the
  [W3C File API definition of `Blob.type`](https://www.w3.org/TR/FileAPI/#dfn-type).
- OWASP's maintained file-upload guidance recommends an allowlist, an explicit
  size limit, not trusting the supplied Content-Type, and content/signature
  validation when the format supports it. A fixed-size headerless EEPROM image
  has no general magic signature, so exact length plus layout-aware parsing are
  the meaningful content checks here. See the
  [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).
- `SubtleCrypto.digest()` supports SHA-256 and returns the digest in an
  `ArrayBuffer`. A hash is useful for provenance, duplicate detection, and
  showing the operator which bytes were opened; it does not prove the model,
  firmware, layout, or Source Radio. See
  [Web Cryptography Level 2](https://www.w3.org/TR/WebCryptoAPI/#sha-operations).

### What an established radio-programming tool does

CHIRP is a useful comparison because it supports full-memory clone-mode images
and has lived with both legacy raw images and metadata-bearing images:

- CHIRP defines a clone-mode Radio as a full memory dump stored in an image
  file. Its default legacy `match_model()` fallback accepts equal memory size,
  but its own source comments that intelligent analysis is preferable because
  equal-size images can conflict across models. See
  [`CloneModeRadio`](https://github.com/kk7ds/chirp/blob/master/chirp/chirp_common.py#L1414-L1450).
- Modern CHIRP `.img` files append a magic marker and metadata containing the
  driver class, vendor, model, variant, and CHIRP version. Its loader strips
  this trailer before parsing the memory image. See CHIRP's
  [metadata writer and loader](https://github.com/kk7ds/chirp/blob/master/chirp/chirp_common.py#L1470-L1532).
- When metadata is absent, CHIRP falls back to driver-specific legacy image
  matching; when metadata is present, it matches the recorded vendor, model,
  and variant. See
  [`get_radio_by_image()`](https://github.com/kk7ds/chirp/blob/master/chirp/directory.py#L155-L197).
- The CHIRP UV-K5 driver records firmware metadata, warns when an image lacks
  it, and rejects metadata for unsupported firmware before parsing. It advises
  obtaining a fresh image from the Radio for best safety and compatibility.
  See
  [`_check_firmware_at_load()`](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/uvk5.py#L640-L656).
- CHIRP's CLI warns that edits to a memory image are in-place and recommends a
  backup. The web CPS can give a stronger guarantee by creating separate,
  immutable baseline and working byte copies before activation. See CHIRP's
  [official `chirpc` documentation](https://github.com/kk7ds/chirp/blob/master/README.chirpc).

The transferable lesson is not to emulate CHIRP's legacy size-only model
detection. It is to distinguish raw image bytes from trustworthy document
metadata, preserve the original bytes, and make missing metadata visible. This
repository already makes the stricter decision: a raw image is **Unbound** and
cannot establish Source Radio identity.

## Repository implications

The current project already establishes the essential safety rule in
[`ADR 0001`](../adr/0001-separate-raw-and-identity-bound-exports.md): a raw
export contains bytes but no identity, imports as Unbound, and cannot be written
to a Radio. The lifecycle table in
[`codeplug-file-lifecycle.md`](../codeplug-file-lifecycle.md) also classifies a
raw image as inspection-only.

There are two implementation consequences:

1. `createCodeplug()` currently proves exact byte length and creates an owned
   byte copy. It does not prove that arbitrary same-length bytes came from a
   UVL-15W or firmware `3.07.23`. The UI must say that the current validated
   layout is being used to **interpret** the image, not that the image's model
   or firmware was detected.
2. The active workspace and CPS File schema currently require a `SourceRadio`.
   Inventing placeholder Radio fields would collapse the type-level safety
   boundary. Completing raw import therefore requires a discriminated document
   binding, for example `binding.kind === "source-radio" | "unbound"`, and every
   Radio Write/restore entry point must require the former.

The current CPS File schema also requires `sourceRadio`, and the named local
Working Codeplug library stores that CPS File representation. If Unbound edits
must survive beyond the current browser session, the portable/local document
schema must represent Unbound provenance explicitly. A fabricated
`SourceRadio`, an empty serial number, or a filename-derived identity is not an
acceptable shortcut.

## Recommended import contract

### Accepted artifact

- One local `.bin` file.
- Exactly `102,400` bytes.
- Exact raw Codeplug address image only; no header, trailer, ZIP, sidecar, OEM
  project container, or partial memory range.
- Interpreted with the explicitly displayed `uvl15w-3.07.23` layout because it
  is the only decoder currently available. This is an operator-visible
  assumption, not detected metadata.

The `.bin` extension should be required for this command so wrong-feature
selections get a clear error, but neither the extension nor MIME type should be
treated as proof of content.

### Validation and activation pipeline

1. Open a single-file picker with
   `accept=".bin,application/octet-stream"`.
2. Reject a filename that does not end in `.bin` case-insensitively, with a
   format-specific error.
3. Reject unless `file.size === 102_400` before reading.
4. Read with `await file.arrayBuffer()` and turn a rejection into an actionable
   read error.
5. Recheck `buffer.byteLength === 102_400`.
6. Copy into an owned `Uint8Array`; never retain a mutable view supplied by a
   caller.
7. Construct both an immutable Baseline and a separate Working Codeplug from
   the bytes. Compute SHA-256 for provenance, not compatibility.
8. Run bounded layout decoders and repository consistency validators before
   activation. Decoder failures block import; semantic advisories that can also
   occur in a genuine Radio image should remain visible warnings rather than
   silently rewriting bytes.
9. Present an import review showing filename, exact size, SHA-256, assumed
   layout, `Unbound` status, and the consequences below.
10. Only explicit confirmation atomically replaces the current workspace.
    Cancellation or any failure leaves the existing document untouched.

The parser must never execute, inject, or render file bytes as HTML. Only the
ordinary React text path should display the filename. Error messages should be
fixed application copy rather than decoded file content.

### Unbound invariants

- `sourceRadio` is absent; it is not an object filled with unknown or empty
  values.
- Radio Write is unavailable.
- Restore preparation is unavailable.
- A subsequent fresh Radio Read does not silently bind or merge the document.
- The original imported bytes remain the Baseline; all edits affect a separate
  Working Codeplug.
- Reset restores the Working Codeplug to the imported Baseline.
- Raw import does not create a Backup History entry, because that history is
  evidence of successful reads/writes from a known Source Radio.
- The page shell and all settings routes may inspect/edit the Working Codeplug,
  but they must display a persistent `Unbound` status where the Source Radio is
  normally shown.
- Export or local saving must preserve `binding.kind === "unbound"` and the
  original import SHA-256. It must never upgrade provenance to Source Radio
  metadata.

## Persistence/export decision

The import itself can be built without changing the portable format, but that
would make offline edits ephemeral: the current `.uvl15cps` creator and named
Working Codeplug library require a `SourceRadio`. That does not satisfy the
documented promise that an imported raw Codeplug may be edited as a durable work
item.

The recommended complete design is an additive CPS File schema revision with a
discriminated binding:

```ts
type CodeplugBinding =
  | { kind: "source-radio"; sourceRadio: SourceRadio }
  | {
      kind: "unbound"
      provenance: {
        kind: "raw-import"
        importedFileName: string
        importedSha256: string
      }
    }
```

The importer should continue accepting schema version 1 as a bound document.
New exports use the revised schema. Both CPS File downloads and named IndexedDB
snapshots can then preserve Unbound edits using the existing baseline/working
members and integrity hashes. A separate “export edited raw bytes” feature is
not recommended as the primary persistence path because the existing Raw
Backup label deliberately means the immutable Baseline read from a Radio.

## Tests required for completion

- Reject wrong extension before reading.
- Reject `102,399`, `102,401`, empty, and very large files before
  `arrayBuffer()` is called.
- Accept upper/lower-case `.bin` and empty or `application/octet-stream` MIME.
- Turn an `arrayBuffer()` rejection into a stable import error.
- Recheck post-read byte length and defensively copy input bytes.
- Preserve exact imported bytes in Baseline and a distinct equal Working copy.
- Prove cancellation and every failure leave the previous active document
  unchanged.
- Prove Unbound documents cannot enter `prepareRadioWrite`, imported restore,
  Backup History restore, or any final Radio Write path.
- Prove edits/reset work through several representative settings modules.
- Fuzz bounded decoders with deterministic random, all-zero, and all-`0xFF`
  same-length images so a same-size hostile file cannot produce out-of-bounds
  reads or an unhandled render exception.
- Round-trip an edited Unbound document through CPS File export/import and the
  IndexedDB named-document store without acquiring Source Radio identity.
- Preserve existing schema-version-1 bound CPS File imports and their restore
  workflow.

## Product questions to resolve before coding

1. Is this command intentionally limited to exact Raw Backup Exports produced
   by this CPS, or should it also accept an OEM `.bin` format? The latter needs
   a captured format specimen and separate validated adapter; equal length is
   not sufficient evidence.
2. Should the complete implementation include the recommended additive CPS
   File schema revision so edited Unbound documents can be downloaded and saved
   in the named IndexedDB library? Without it, imported edits disappear when
   another document is opened or the page is reloaded.
3. Should selection immediately open the import review, or should the Backups
   page first expose separate “Open CPS File” and “Import Raw Backup” actions?
   Separate actions produce clearer error messages and avoid auto-detecting
   identity-bearing and identity-free formats from filename alone.

## Recommendation

Use a dedicated **Import Raw Backup** action and implement Unbound as a real
document binding across the workspace, Radio Write policy, CPS File schema, and
named local snapshots. Accept only exact `102,400`-byte `.bin` images for the
currently validated layout, show a confirmation review, preserve immutable
baseline bytes, and never infer model, firmware, Source Radio, or write
eligibility from the file.

## Implemented decision

The first product scope deliberately stays narrower than the persistence
recommendation above. It accepts only the validated firmware 3.07.23 profile
(`uvl15w-3.07.23`, 102,400 bytes), uses a separate **Import Raw Backup** review,
and opens a session-scoped Unbound document. The operator can inspect and edit
it and download the edited raw `.bin`. CPS File export and named IndexedDB
snapshots remain disabled because their current schema requires Source Radio
identity; no identity is fabricated. A future additive format revision can add
durable Unbound documents independently of this import boundary.
