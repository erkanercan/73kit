# Firmware, Resource Flash, and Language Update Evidence

Date completed: 2026-08-28

## Result

The official TYT CPS update behavior has been captured and reduced to a
repeatable offline evidence set. The final implementation contract is
[`../technical/TYT_UVL-15W_UPDATE_PROTOCOL_V1.0.md`](../technical/TYT_UVL-15W_UPDATE_PROTOCOL_V1.0.md).

The result is intentionally narrower than “all flashing is complete”:

- Firmware `3.7.23`: full package validation, session-key derivation, transform,
  transfer, acknowledgements, and final verification are captured and
  reproduced offline.
- Language `1.01.05`: the successful bidirectional Resource Flash transfer and
  every acknowledgement are captured; its transmitted data exactly matches the
  DAT package.
- Image `1.01.00`: the successful bidirectional Resource Flash transfer and all
  5,795 acknowledgements are captured; its data exactly matches the DAT.
- Image recovery after a partial browser write: the official CPS successfully
  rewrote the same complete Image package from its first address with a
  recovery-only all-zero `E3` payload, then completed a normal Radio read.
- Combined language/image DAT: the successful bidirectional Resource Flash
  transfer and all 13,056 acknowledgements are captured; its data exactly
  matches the DAT.
- Resource Flash start command `E3`: eight observations and static analysis
  prove why its payload varies. The official CPS serializes incidental words
  from inside a 24-byte managed value rather than package-derived data. The
  implementation contract therefore pins one exact, successful compatibility
  payload per validated Resource Flash package kind.

All supplied Resource Flash package types are physically captured. No further
official-CPS discovery capture is required for this evidence set. The browser
implementation and all four single-Radio success paths are complete. The four
exact packages are released as beta with explicit user acknowledgement; stable
promotion remains gated by a second compatible Radio and controlled
interruption/recovery testing.

## Evidence inventory

### Vendor artifacts supplied by the user

Base directory:

```text
/Users/abajour/Desktop/20260723 UVL-15W CPS and FW 2/UVL-15W CPS & Firmware [Win10 11] 20260723
```

| Artifact                                             |         Size | SHA-256                                                            |
| ---------------------------------------------------- | -----------: | ------------------------------------------------------------------ |
| `UVL-15W_Program_Software.exe`                       | 10,921,472 B | `6677766dee106cf143861b888a2c5322d5279af216a32817c8a699f356f59590` |
| `Firmware/UVL-15W(R) 3.7.23 ... .Fir`                |    814,048 B | `3b4bc8f8feff871e0ea082a31f99488f411eaefd879903f13bbb7c30d385f6b4` |
| `Firmware/UVL-15W(R) 3.3.31 [Test Version] ... .Fir` |    905,504 B | `b5ac94f9f196551d9e6296c235dbc888dbec93308a0a7ddd900d0183391d89c3` |
| `Flash Data/Language/Language 1.01.05.DAT`           |    237,853 B | `bcf6c1f19233518d7bb7fde970a1062843f3868b5876d3ea6c3e6ed5e291e1e6` |
| `Flash Data/Image/Image 1.01.00.DAT`                 |  7,139,209 B | `0164e952aca45c345f152936fd57b54744be5aff78f6ef0b9ec5f63c2abbb5d2` |
| `Flash Data/Language 1.01.05 And Image 1.01.00.DAT`  | 16,084,992 B | `56213735761983aefd5ea6e9e449c1cbb0d998ebe851857102a02275fdf80934` |

The parent directory also contains `Operation instruction.docx`, SHA-256
`b18efd461820d5065c630e8bfc43bca17d0c01b3b5ccc05c85c148be98aca7cc`.

### Dynamic captures

These raw files are deliberately external to Git because `1C` responses and the
transform diagnostic contain opaque Radio identity/activation-derived values.
Do not paste those values into issues, logs, fixtures, or documentation.

| Capture                                            | SHA-256                                                            | Use                                           |
| -------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| `01-language-1.01.05.jsonl`                        | `46ddc57232fe6e48233007134f6cce8db39aafa6b33867785bdfef146e774b1a` | Initial TX-only Language capture              |
| `02-language-1.01.05-rx.jsonl`                     | `4aa31f8cff91d9919c6f51329a036e9cf86b22068faed40d8b48ec547aaf3ea8` | Second TX-only capture; proved variable `E3`  |
| `03-language-1.01.05-rx.jsonl`                     | `d532bd8d017abb41cf66016c87949034324d93186b48f4c2bc615c4ad5e6d856` | Complete bidirectional Language capture       |
| `04-firmware-3.7.23.jsonl`                         | `684040de77b86a1ae77c4e23702012c70e0ad73f33ea51011190e43ebe9f7345` | Complete bidirectional Firmware capture       |
| `05-firmware-transform.jsonl`                      | `1eab0644cd9caaf71f148f7ec0e45cc9b6ebe52527077e2d262c2772170c74a1` | Second Firmware capture plus transform record |
| `06-image-1.01.00-callsite.jsonl`                  | `a97bfe55d733645718ceffe1a63aa7f9e16373edf6ff5941dd29180fbb82db17` | Complete bidirectional Image capture          |
| `07-combined-1.01.05-image-1.01.00-callsite.jsonl` | `b8026214ebcd65acb8f7d75a6b1d9ac4c28c65faa9f2227e9ed49be8dfbdf5d2` | Complete bidirectional combined capture       |
| `08-language-e3-callsite-v2.jsonl`                 | `e3fb97e42f0b668429c84aff2828305b403ff4bc4e79c2f835f2840e8f03c7f1` | Language capture plus Qt E3 caller            |
| `09-language-e3-cps-callsite-v3.jsonl`             | `3f4bfb1414dded0ee6844e64c0b0dc37062bdc3ac7ba76cb00f15ffe7eb86340` | Language capture plus direct CPS callsite     |
| `10-image-recovery-after-partial.jsonl`            | `639e6befc94b76bed43b9ec9c7202787c1268b874ea0816c339e469a0b671b9b` | Complete Image recovery after partial write   |

The hashes make accidental replacement detectable. Keep this exact set as the
baseline when researching a later TYT release; add a new identified evidence
set rather than overwriting it.

## What the captures prove

All complete captured request and response frames pass the documented escape
and LRC rules.

The Language capture has 194 `E4` blocks and 194 strictly alternating `E6`
acknowledgements. Reassembly produces 98,848 bytes at
`0x00740000..0x00758220`, exactly equal to Language `1.01.05.DAT`.

The versioned v2 diagnostic confirms that `QSerialPort::writeData` receives the
`E3` frame through `Qt6Core.dll`'s generic `QIODevice` dispatch. That immediate
Qt caller is not the CPS construction site, so the v3 helper instead observes
the higher `QIODevice::write` entry point to identify the direct CPS-relative
caller without logging process memory. Capture 09 identifies CPS RVA
`0x11c5d8`, the return point from the generic CPS serial sender. The complete
Language transfer again contains 194 blocks and acknowledgements and exactly
matches the DAT.

Static analysis then traces the Resource Flash builder at virtual address
`0x140056670`. It selects `E3`, reads 32-bit words at object offsets `+0x54` and
`+0x58`, formats each as eight hexadecimal characters, and serializes the
result. Construction/destruction code shows those offsets are inside a 24-byte
managed value starting at `+0x48`, not protocol fields. Calling that value a
Qt/C++ value is an inference; the overlap and builder instructions are directly
pinned by the verifier. This explains the seven distinct accepted payloads
without inventing a package or handshake formula. The canonical protocol
records the exact known-successful per-kind payloads chosen for browser
compatibility.

The Image capture has 5,795 `E4` blocks and 5,795 matching `E6`
acknowledgements. Reassembly produces 2,966,944 bytes at
`0x00170000..0x004445A0`, exactly equal to Image `1.01.00.DAT`. The final block
carries 416 bytes while declaring 512, consistent with the Language transfer's
final-block rule.

Capture 10 begins with the Radio in the known partial-Image state left after
the browser had acknowledged block 418. The official CPS sends
`E3 0000000000000000`, then rewrites all 5,795 Image blocks starting at
`0x00170000`; it does not resume at block 419. Every block is acknowledged, the
reassembled data again exactly matches Image `1.01.00.DAT`, completion succeeds,
and the CPS follows with a normal 50-block Codeplug read. This establishes a
narrow Image-only recovery profile. It does not establish the same behavior for
Language, combined, Firmware, another package, or another Radio build.

The combined capture has 13,056 `E4` blocks and 13,056 matching `E6`
acknowledgements. Reassembly produces 6,684,672 bytes at
`0x00170000..0x007D0000`, exactly equal to the combined Language `1.01.05` and
Image `1.01.00` DAT.

The first Firmware capture has 1,590 `C2` blocks and 1,590 strictly alternating
`2C "OK"` acknowledgements. The second capture repeats the full transfer and
also records the official CPS transform's input, key, round parameter, and
output for one block. Independent code reproduces all 3,180 blocks across the
two sessions, not merely the diagnostic block.

On 2026-08-28, the first browser Firmware run received `2C "OK"` for blocks
1–176, then the Radio returned `EE / Frame Head Error` for block 177. Offline
decoding proved the browser frame had the correct `C2` command, total count
1,590, block number 177, declared and actual 512-byte payload, escaping, LRC,
and tail. The official CPS capture was not slower in that region. This evidence
extends the already established bounded exact-block parser retry from `E4`
Resource blocks to `C2` Firmware blocks; it does not establish automatic
Firmware recovery or retry for any other error class.

After exact-package official-CPS recovery and the bounded `C2` correction, a
second browser Firmware run received `2C "OK"` for blocks 1–111. The block-112
frame was structurally valid and the Web Serial write promise completed, but no
complete response arrived within the ten-second timeout. No `EE` response or
retry occurred. The Radio was again restored with the official CPS. Because a
timeout cannot distinguish an unexecuted request from an executed request with
a lost acknowledgement, it remains non-retriable. Transfer-only raw RX,
write-completion, decoder-buffer, and terminal-error tracing was added for the
next controlled run.

After the second exact-package official-CPS recovery, the next browser Firmware
run completed successfully on 2026-08-28 (user-reported). Its retained final
trace shows block 1,590 acknowledged with `2C "OK"`, the exact expected `3C`
verification response, a complete second identity handshake, and `4C 00 "OK"`
after `C4` finalization. The raw transfer diagnostics show complete nine-byte
acknowledgement chunks in the retained final window, with no truncated-response
or timeout condition.

The DAT analysis proves:

- Language: 3,089 contiguous 32-byte records.
- Image: 92,717 contiguous 32-byte records.
- Combined latest: 208,896 contiguous 32-byte records.
- Every separate Language and Image record exactly matches its address in the
  combined package.

The boot-picture PNG is a separate vendor workflow and is outside this evidence
set.

## Reproduce the result without another manual Radio test

Run:

```sh
python3 scripts/research/uvl15w-update-evidence/verify.py \
  --capture-dir /Users/abajour/Desktop \
  --vendor-root "/Users/abajour/Desktop/20260723 UVL-15W CPS and FW 2/UVL-15W CPS & Firmware [Win10 11] 20260723"
```

Expected output ends with:

```text
PASS both captured firmware streams (3,180 transformed blocks)
PASS instrumented transform record
All offline updater evidence verified; no serial port was opened.
```

The verifier is standard-library-only. It validates hashes first, prints no
identity response or session key, and opens no serial device. Its README lists
all assertions.

This offline run replaces the completed protocol-discovery tests. Physical
testing is needed again only for a new hardware/bootloader combination, a new
package/protocol revision, browser transport integration and package-kind
enablement, or recovery/interruption behavior.

## How the evidence was captured

The reusable capture helper is
[`../../scripts/research/uvl15w-serial-capture/`](../../scripts/research/uvl15w-serial-capture/README.md).
It launches the supplied x64 Qt CPS under Frida on Windows ARM64 and observes
the CPS's own `QSerialPort`/`QIODevice` calls. It never competes for the COM port.

The finalized procedure was:

1. Place `capture.py` and `hook.js` together in Windows.
2. Install native Windows ARM64 Python and Frida as documented in the helper
   README.
3. Launch `capture.py` with the official CPS path and a new JSONL output path.
4. Wait for `Qt6SerialPort capture hooks installed`.
5. Perform exactly one official-CPS update.
6. Close the CPS so the capture finalizes.
7. Copy only the JSONL back, calculate SHA-256, inspect/redact disclosure, and
   register the capture in this inventory.
8. Run the offline verifier before drawing protocol conclusions.

Early captures missed RX because Qt filled `QIODevice`'s internal buffer without
calling `QSerialPort::readData()`. The finalized hook also intercepts
`QIODevice::read(char*, qint64)` and `readLine(char*, qint64)`. USBPcap is not
required for this supplied CPS/Windows ARM64 setup.

## Vendor workflow and safety evidence

The supplied TYT instructions require the ordinary unchipped programming cable
and update mode entered by holding PTT plus the top orange button while powering
on. They state these ordering constraints:

- write flash data before updating beyond Firmware `3.5.16`;
- install Language `1.01.04` before updating beyond `3.7.11`;
- install Language `1.01.05` before Firmware `3.7.23`.

TYT's change notes mention prior interrupted/repeated-update problems and a
random flash-write freeze. Therefore disconnects after write start are
**Update Outcome Unknown**, not ordinary failure, until post-reboot verification
or a documented recovery completes.

The second browser Image run provided a concrete instance: after 2,217 exact
E4/E6 exchanges, the Radio rejected the next 525-byte E4 frame at `0x00285200`
with `Frame Head Error`. Offline decoding proved that browser frame had valid
framing, escaping, and LRC and matched capture 06's successful official-CPS
frame for the same address byte-for-byte. The implementation therefore retries
only the same encoded E4 block, at most three total attempts, for the documented
pre-execution Head, Tail, Length, and LRC parser errors. It does not retry other
responses, timeouts, disconnects, or control commands.

## Remaining manual gates

Completed discovery captures and single-Radio success-path writes do not need
repeating. These distinct stable-release gates remain:

1. Test each exact package on a second compatible Radio/hardware instance.
2. Complete browser validation of the captured Image recovery profile and the
   controlled interruption matrix for the remaining operation kinds/phases.

Until then, each current package remains explicitly marked `beta` in the update
catalog. Production requires the beta warning and acknowledgement. Later
packages start `disabled` and require their own evidence; no filename or version
inherits this release status.
