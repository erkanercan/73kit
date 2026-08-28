# UVL-15W updater evidence verifier

This standard-library-only tool replays the retained official-CPS evidence
offline. It opens no serial port and cannot write to a Radio.

Keep the ten raw capture files outside Git because they contain opaque Radio
identity/activation material. The verifier pins their SHA-256 hashes, validates
every captured frame LRC, and performs these checks:

- Language `1.01.05.DAT` grammar and exact reconstruction from the captured
  `E4` write blocks, including all 194 `E6` acknowledgements.
- Image `1.01.00.DAT` exact reconstruction from 5,795 captured `E4` blocks and
  all corresponding acknowledgements.
- Image recovery after a partial browser write: recovery-only `E3` payload,
  full rewrite from the package's first address, 5,795 acknowledgements, and
  the official CPS's following normal Radio read.
- Combined Language `1.01.05` and Image `1.01.00` exact reconstruction from
  13,056 captured blocks and acknowledgements.
- Every complete frame LRC in all ten captures and all eight pinned Resource
  Flash `E3` observations (seven distinct payloads).
- The v3 direct CPS callsite diagnostic and its complete Language transfer.
- The pinned official CPS executable and exact E3-builder/object-layout
  signatures used by the static analysis conclusion.
- Image, language, and combined DAT continuity, plus exact inclusion of every
  separate language/image record in the combined package.
- Firmware package integrity tag.
- Session-key derivation without printing the inputs or derived key.
- Byte-for-byte replay of both complete 1,590-block firmware captures.
- The separately instrumented firmware-transform record.

From the repository root, run:

```sh
python3 scripts/research/uvl15w-update-evidence/verify.py \
  --capture-dir /Users/abajour/Desktop \
  --vendor-root "/Users/abajour/Desktop/20260723 UVL-15W CPS and FW 2/UVL-15W CPS & Firmware [Win10 11] 20260723"
```

The external filenames and content hashes are part of the verifier's manifest.
If files move, change only the two directory arguments. If TYT releases a new
package, retain this evidence set unchanged and add a separately identified
manifest/capture set; do not silently replace these fixtures.
