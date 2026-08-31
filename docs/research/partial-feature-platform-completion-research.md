# Platform Research for Completing Partially Implemented CPS Features

Date completed: 2026-08-31

## Result

The remaining platform work can be completed without changing the CPS's core
local-first safety model. The recommended contracts are:

1. Treat **installation** and **offline operation** as separate deliverables.
   Add an App Router manifest and service-worker registration for installation,
   then implement and test an explicit cache policy for offline operation.
2. Store named Working Codeplugs in **IndexedDB**, not `localStorage`. Save the
   Codeplug bytes and metadata atomically, request persistent origin storage
   after an explicit user save, and continue to present file export as the only
   portable backup.
3. Generate support reports from a **strict allowlist of diagnostic fields**.
   Do not serialize arbitrary recovery objects, raw protocol frames, full URLs,
   full user-agent strings, Radio identity payloads, Codeplug bytes, update
   package bytes, session keys, serial numbers, or stable device fingerprints.
4. Finish updater interruption coverage with a deterministic fault matrix over
   the existing scripted transport. This can prove the application's stop,
   classification, retry, persistence, and recovery-policy behavior without
   opening a serial port. It cannot prove that a physical Radio or bootloader
   survives an interruption, so it does not satisfy the existing hardware gate
   for promoting updates from beta to stable.

## Evidence boundary

This note uses the Next.js 16 documentation bundled with the repository and
public primary sources owned by Next.js, browser-platform documentation, the
relevant web specifications, and the Web Platform Tests project. It does not
infer Radio recovery behavior from browser APIs, and no hardware write is part
of this research.

## 1. Installable PWA and offline behavior

### Confirmed platform behavior

Next.js App Router has first-party support for `app/manifest.ts` or a static
manifest. A manifest can describe the app name, start URL, standalone display
mode, theme colors, and install icons. The Next.js guide also states explicitly
that an install prompt does **not** require offline support. Installation
therefore does not establish that every CPS route works without the network
([Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps),
[Next.js manifest reference](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest)).

Next.js shows a service worker registered at `/sw.js` with root scope and
`updateViaCache: "none"`. Its guide recommends serving that script as
JavaScript, disabling HTTP caching for the worker script, and applying a
same-origin script policy. For offline support specifically, the guide names
Serwist as one option and warns that its Next.js integration currently requires
webpack configuration. This is an option, not built-in offline behavior
([Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)).

A service worker installation succeeds only after the promises passed to its
`install` event complete. An updated worker normally waits until pages using
the previous worker close, which prevents two application versions from being
mixed. `skipWaiting()` bypasses that safety. Versioned caches should be cleaned
during activation, and cache cleanup must be restricted to this application's
own prefix because Cache Storage is shared by the origin
([Chrome service-worker lifecycle](https://web.dev/articles/service-worker-lifecycle),
[MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)).

### Recommended CPS implementation contract

There is one toolchain decision to make before implementation. The current
Next.js guide names Serwist for offline support but documents a webpack-based
integration. Serwist's own current Next.js guide also offers a config-based mode
that retains Turbopack and generates a revisioned precache manifest, at the cost
of adding Serwist, its CLI/build dependencies, and a parallel worker build
([Serwist Next.js guide](https://serwist.pages.dev/docs/next/getting-started)).
For complete, repeatable offline coverage of build-generated Next.js chunks,
the generated-manifest approach is safer than a hand-maintained worker. A
handwritten worker is reasonable only if the product accepts “routes and assets
visited while online” rather than deterministic full precaching. This dependency
and build-pipeline choice should be explicit rather than hidden inside the PWA
change.

- Add a root App Router manifest with the existing localized entry route as the
  start URL, `display: "standalone"`, and real 192 px and 512 px icons. Keep the
  app's desktop-only product policy; installability does not broaden Web Serial
  support to mobile browsers.
- Register one root-scoped `/sw.js` from a small client component, using
  `updateViaCache: "none"`. Register in production and in an explicit PWA test
  mode, not by default in ordinary development, where a stale worker makes UI
  debugging misleading.
- Add the Next.js-recommended response headers for `/sw.js`: JavaScript content
  type, `Cache-Control: no-cache, no-store, must-revalidate`, and a same-origin
  service-worker script policy.
- Use application-prefixed, versioned cache names. On activation, delete only
  older caches bearing that exact prefix.
- Cache only successful same-origin `GET` responses. Never cache uploads,
  downloads generated from user data, error responses, update packages, or any
  cross-origin request.
- Use cache-first behavior for immutable, content-hashed `/_next/static/`
  assets. Use network-first behavior with a cached fallback for navigations and
  App Router data requests so an online user receives the latest application
  while a previously prepared screen can still open offline.
- Do not force `skipWaiting()` while a Radio Read, Radio Write, restore, or
  firmware/resource update is active. Let the new worker wait, surface an
  “update ready” action when the CPS is idle, and reload only after the user
  accepts. This preserves one application version through a safety transaction.
- Define offline readiness honestly. A manifest plus worker registration means
  “installable.” “Offline ready” should be shown only after the required shell,
  locale, routes, and hashed assets have been cached successfully.

The browser can safely call `register()` more than once for the same script and
scope; it updates the existing registration rather than creating overlapping
workers. Root scope is appropriate because `/sw.js` is itself at the origin
root
([MDN `ServiceWorkerContainer.register()`](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register),
[MDN `updateViaCache`](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updateViaCache)).

### Acceptance tests

Run these against a production build over HTTPS or a trustworthy local origin:

1. Manifest inspection shows the correct name, standalone display, start URL,
   theme colors, and valid 192/512 icons.
2. First online visit registers exactly one root worker. Reload is controlled
   by that worker; an unchanged registration does not create duplicates.
3. After offline preparation, disconnect the network and directly open every
   released CPS route in each supported locale. The shell and route render; no
   route silently falls back to an unrelated page.
4. While offline, open a named Working Codeplug and make/save an edit. IndexedDB
   work continues even though network fetches fail.
5. Return online and deploy a new worker/cache version. The old version remains
   active during an in-progress safety operation, and the new version activates
   only after the operation is idle and the user accepts a reload.
6. A failed new-worker install leaves the previous worker and cache usable.
7. Cache inspection contains no Codeplug, backup, diagnostic-report, or update
   package body.

## 2. Named local Working Codeplugs

### Confirmed platform behavior

IndexedDB stores structured data and supports offline-capable applications. Its
read/write transactions are atomic: either every change in the transaction is
committed, or an error aborts and rolls the changes back. A transaction's
`complete` event means it committed; an individual request's `success` event is
not the transaction boundary
([IndexedDB 3.0 specification](https://w3c.github.io/IndexedDB/)).

Browser storage is best-effort by default and may be evicted under storage
pressure. `navigator.storage.persist()` requests persistent treatment, while
`persisted()` reads the current state and `estimate()` reports approximate
origin usage and quota. The browser may deny persistence, and the user can
still explicitly clear site data. IndexedDB and Cache Storage share the
origin's storage bucket, so eviction can remove both, not just one record
([WHATWG Storage Standard](https://storage.spec.whatwg.org/),
[MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)).

IndexedDB is origin-scoped. Changing scheme, host, or port creates a different
origin and therefore a different database. Schema upgrades can be blocked by an
older open tab; applications should handle `blocked` and close an existing
connection on `versionchange`. Writes started from an unload handler are not
reliable and should not be the save strategy
([MDN Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)).

### Recommended CPS data model and behavior

Use a versioned IndexedDB database with one `workingCodeplugs` object store. A
record should contain only data needed to reopen and validate the document:

| Field                             | Purpose                                                                 |
| --------------------------------- | ----------------------------------------------------------------------- |
| `id`                              | Random local document ID; primary key                                   |
| `name`                            | User-visible name, trimmed and uniqueness-checked case-insensitively    |
| `createdAt`, `updatedAt`          | ISO timestamps                                                          |
| `formatVersion`                   | Browser-store record schema                                             |
| `codeplugFormatVersion`           | CPS Codeplug serializer/schema version                                  |
| `bytes`                           | Complete 102,400-byte Working Codeplug as `Uint8Array`/structured clone |
| `sha256`                          | Integrity check over exactly those bytes                                |
| `sourceRadio`                     | The existing safe Source Radio metadata needed by Radio Write policy    |
| `baselineBytes`, `baselineSha256` | Immutable baseline required to derive the Change Set                    |
| `revision`                        | Monotonic revision used to reject stale-tab overwrites                  |

Do not persist view state, derived decoded forms, undo history, object URLs, a
live serial port, or arbitrary controller state in the document record. Decode
from the canonical bytes when opening the document.

- Create/rename/save/delete in a single, narrowly scoped `readwrite`
  transaction and resolve the application promise only on transaction
  `complete`. Surface `abort`, `QuotaExceededError`, and unexpected database
  closure as save failures; never show “Saved” after only an object-store
  request succeeds.
- Persist complete immutable byte snapshots. Do not clear in one transaction
  and rewrite in another. This makes an interrupted save leave either the old
  document or the new document, not an empty hybrid.
- Compare the caller's expected `revision` inside the save transaction and
  reject a stale-tab write instead of silently using last-write-wins. Opening,
  renaming, duplicating, and deleting from two tabs must have deterministic
  conflict behavior.
- Save explicitly and/or after a short edit debounce while the page is active.
  Never rely on `beforeunload`/`unload` to create the only save transaction.
- On the first explicit named-document save, explain that the document is local
  to this browser and request `navigator.storage.persist()`. Record and display
  `persisted()` status, but allow saving if the browser denies persistence.
- Keep `.uvl15cps` export visible as “portable backup.” Persistent browser
  storage improves eviction resistance; it is not a backup and cannot survive
  an explicit site-data clear, browser-profile loss, or origin change.
- On database `versionchange`, close the connection and ask the user to reload.
  On `blocked`, explain that another CPS tab must close before the upgrade can
  finish.
- Verify length, hash, schema versions, and the existing Source Radio invariants
  before a stored document becomes the active Working Codeplug. A corrupt or
  future-version record must fail closed and remain exportable for support.

The IndexedDB specification includes a `strict` durability hint for cases where
reducing data-loss risk outweighs performance. It remains a hint and is not
uniformly implemented. It may be requested for explicit document saves when
supported, with a normal `readwrite` fallback; atomic transaction design and
portable export remain mandatory regardless
([IndexedDB durability model](https://w3c.github.io/IndexedDB/#transaction-durability)).

## 3. Web Serial diagnostics and privacy-safe support reports

### Confirmed platform behavior

Web Serial is secure-context-only and permission-gated. `requestPort()` requires
a user gesture, while `getPorts()` returns only ports for which the origin
already has permission. `SerialPort.getInfo()` exposes USB vendor/product IDs or
a Bluetooth service-class ID, not a friendly port name
([Chrome Web Serial guide](https://developer.chrome.com/docs/capabilities/serial),
[MDN `SerialPort.getInfo()`](https://developer.mozilla.org/en-US/docs/Web/API/SerialPort/getInfo)).

The Web Serial specification treats device identifiers and device-resident data
as sensitive. Vendor/product IDs identify make and model; a device protocol may
also reveal its own identifiers and other private information. The
specification deliberately prevents silent enumeration and leaves device access
under user control
([Web Serial security and privacy considerations](https://wicg.github.io/serial/#security-and-privacy)).

Chrome documents that a full user-agent string can contain enough combined
browser, OS, and device detail to contribute to unique identification. Support
reports should therefore prefer capability flags and low-entropy browser data
over copying `navigator.userAgent` wholesale
([Chrome User-Agent Client Hints guidance](https://developer.chrome.com/docs/privacy-security/user-agent-client-hints)).

### Recommended report schema

Build a fresh JSON object from approved scalar fields. Do not pass runtime
objects through `JSON.stringify()`.

Include:

- report schema version, CPS product version/build, report type, and UTC time;
- locale and a route identifier or pathname with query and fragment removed;
- `isSecureContext`, online state, Web Serial support, service-worker state,
  standalone-display state, IndexedDB availability, and persistent-storage
  state;
- browser brand and major version from low-entropy UA Client Hints when
  available, with a coarse fallback such as `Chromium-compatible: true`;
- operation name, safe coordinator phase, stable application error code,
  elapsed time, and progress counters;
- selected package catalog ID, kind, public version, byte length, SHA-256, block
  count, and target versions, but never package bytes;
- bounded event records containing sequence, elapsed time, category, direction,
  command number/label, stable error code, byte count, decoder buffered-byte
  count, block number/address, and retry number;
- optional USB vendor/product IDs or Bluetooth service-class ID only after
  clearly showing those fields in the report preview. They identify device
  make/model and are not required for every support case.

Exclude:

- full URL, query string, fragment, referrer, full raw user-agent string, IP or
  network identifiers;
- USB serial number, Bluetooth MAC address, browser permission IDs, or a hash of
  any of those values;
- Radio fingerprint, opaque identity/activation payloads, session key, build
  fields not explicitly classified as public, or handshake frame contents;
- Codeplug/backup bytes, decoded customer/user content, update package bytes,
  raw TX/RX frame hex, serial chunks, stack traces containing local paths, and
  arbitrary `recoveryRecord` or `transferResult` objects.

This requires changing the current updater report shape: its full `pageUrl`,
full `userAgent`, opaque recovery object, opaque transfer result, and diagnostic
events containing `frameHex` must not flow directly into the downloadable
report. In-memory raw traces may remain narrowly bounded for immediate protocol
debugging, but the downloadable serializer must transform them into metadata
and discard payload bytes.

Before download, show a human-readable disclosure listing the report sections
and offer a formatted JSON preview. Generate a Blob locally, trigger download
through an object URL, and revoke that object URL after the download begins to
release the browser resource
([MDN `URL.revokeObjectURL()`](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static)).

### Diagnostics acceptance tests

- Snapshot the exact schema and recursively reject forbidden key names such as
  `bytes`, `frameHex`, `fingerprint`, `serialNumber`, `sessionKey`, `userAgent`,
  `search`, and `hash`.
- Seed every source object with sentinel secrets and assert that none appears in
  the generated JSON, file name, or preview.
- Test a query-bearing URL and assert only the approved route/path remains.
- Test USB, Bluetooth, unavailable `getInfo()`, denied permission, unsupported
  browser, disconnected stream, timeout, malformed frame, and recovery-after-
  reload cases.
- Cap events by count and string length so a failure loop cannot create an
  unbounded support file.

## 4. Updater interruption and recovery validation without hardware writes

### What automation can establish

Web Platform Tests automate Web Serial with a browser-provided test-only fake
serial interface; tests suffixed `-manual` are reserved for real hardware. This
is direct precedent for separating deterministic API behavior from physical
device validation
([Web Serial Testing](https://chromium.googlesource.com/external/w3c/web-platform-tests/+/refs/tags/merge_pr_33132/serial/README.md)).

For this repository, the existing `RadioTransport` seam and `ScriptedTransport`
are the appropriate deeper boundary. They can inject exact read chunks,
acknowledgements, timeouts, errors, and connection closures without exposing a
real port or sending a package to a Radio.

### Required deterministic matrix

Run each applicable fault at every protocol phase and, for block loops, at the
first, middle, and final block:

| Injection point                                | Faults                                                                                                        | Required assertion                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Transport open                                 | reject/close                                                                                                  | Outcome is known; no recovery retry; zero writes                                                        |
| Pre-destructive handshake                      | timeout, close, truncated/malformed response, wrong command, incompatible identity                            | Outcome is known; package transfer never starts                                                         |
| Resource start / first firmware block boundary | write rejection before completion, write completion then silence, explicit Radio error                        | Classification follows whether destructive transfer may have begun; ambiguous cases stop                |
| Block transfer                                 | chunk fragmentation, truncated ACK, timeout, close, wrong ACK, frame head/tail/length/LRC error, option error | Only explicitly safe parser errors retry; retry is byte-identical and bounded; ambiguity never advances |
| Verification/finalization                      | timeout, close, malformed/wrong response                                                                      | Outcome Unknown persists with last acknowledged progress; no blind retry                                |
| Cleanup                                        | close rejection, repeated disconnect                                                                          | Primary error is preserved; cleanup is attempted once; no additional package write                      |
| Recovery reload                                | missing record, corrupt record, wrong package hash, wrong kind/target, unsupported firmware recovery          | Fail closed before transport open                                                                       |
| Supported resource recovery                    | exact package and captured recovery payload                                                                   | Rewrite begins from the first address; it never resumes from the last acknowledged block                |

For every destructive-path failure, also assert:

- `outcomeUnknown` is true;
- the recovery record is durably written before the UI offers another action;
- package identity is exact and complete, but package bytes are not in the
  diagnostic report;
- last acknowledged block/address never exceeds an actually acknowledged
  block;
- automatic reconnect, automatic continuation, and blind retry do not occur;
- refresh/reload restores the recovery gate and requires inspection;
- same-package recovery is offered only where captured evidence explicitly
  enables it; firmware recovery remains unsupported;
- the redacted report retains enough command/phase/count information to
  distinguish zero-byte timeout from truncated response without retaining raw
  frame bytes.

Use exhaustive table-driven tests rather than timers where possible. The fake
transport should control when reads resolve or reject. A small number of short
timeout tests can verify the real timeout wrapper, but the complete phase matrix
should not depend on wall-clock scheduling.

### What automation cannot establish

Passing this matrix proves application behavior under modeled failures. It does
not prove that a particular TYT bootloader remains recoverable after power,
cable, host, or browser interruption at a particular flash address. Stable
promotion still requires the already-defined second compatible Radio and
controlled physical interruption/recovery evidence. Until then the correct
claim is: **offline fault handling is verified; physical interruption recovery
remains unverified, and updater packages remain beta**.

## Implementation order

1. Redact and schema-test diagnostic reports first; the updater fault matrix
   will then produce support artifacts safe enough to inspect and share.
2. Complete the table-driven updater interruption matrix without hardware.
3. Add the IndexedDB named-document store and persistence-status UX.
4. Add the manifest, service worker, cache lifecycle, and offline-readiness UX.
5. Validate the full production build in the required Chrome browser, including
   installability, offline navigation, local document edits, worker updates,
   and the rule that no service-worker activation interrupts a Radio safety
   transaction.
