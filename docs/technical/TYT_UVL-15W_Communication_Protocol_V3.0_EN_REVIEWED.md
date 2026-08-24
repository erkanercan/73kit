# TYT UVL-15W Communication Protocol Specification

Version V3.0 | Corrected the E5 command and added complete frame examples

English developer edition: terminology and descriptions have been normalized for implementation clarity while preserving the source protocol values, addresses, offsets, and byte layouts.

**Translation review note:** This English edition was re-reviewed against the original Chinese document. All command values, frame bytes, addresses, lengths, and examples are preserved. The source communication document labels the CMD 0xE1 payload as "71 bytes", but the listed fields extend through offset 80 (81 bytes total). The separate Data Storage Reference also describes the newer E1 payload as 81 bytes. This discrepancy is in the source documentation, not introduced by the translation.

## 1. Protocol Overview

### 1.1 Core Characteristics

- **Protocol type**: binary request-response protocol.
- **Transport**: USB CDC virtual serial port or ET25SE Bluetooth transparent-serial module.
- **Core mechanism**: fixed frame header/tail, payload byte escaping, and LRC checksum.
- **Direction**: The two directions use different core headers. Host requests use `FE EE EF` as the core header; radio responses use `FE EF EE` as the core header.
- **Frame synchronization**: Before the core header, a real frame must include at least one (normally two or more) `0xFE` preamble byte (s), used primarily to wake the radio from **sleep** and provide **byte-stream synchronization**.

### 1.2 Address Space

Read/write operations target the following absolute range in the radio's external SPI flash (defined by the firmware):

- **start address (SP\_READ\_WRITE\_ADDR\_START)**: `0x8000` (decimal 32768)
- **End address (SP\_READ\_WRITE\_ADDR\_STOP)**: `0x21000` (decimal 135168)
- **Valid data-region size**: 102,400 bytes (0x21000 - 0x8000).

**Note**: All multi-byte addresses and lengths are **Big-Endian**. Normal CPS read/write operations should stay within this range.

## 2. Protocol Frame Format

### 2.1 Host -> Radio (Request Frame)

[preamble 0xFE]... [preamble 0xFE] 0xEE 0xEF <CMD> <escaped payload> <escaped LRC> 0xFD

**The core request header is a fixed 3-byte value**: `FE EE EF`. It must be preceded by **at least one `0xFE`** for synchronization and wake-up.

### 2.2 Radio -> Host (Response Frame)

[preamble 0xFE]... [preamble 0xFE] 0xEF 0xEE <CMD> <escaped payload> <escaped LRC> 0xFD

**The core response header is a fixed 3-byte value**: `FE EF EE`. It must be preceded by **at least one `0xFE`**.

### 2.3 Frame Elements

| Field | Length | Description | Escaping |
| --- | --- | --- | --- |
| Request header | 3 bytes | Core header fixed at `FE EE EF`, preceded by at least one `0xFE` preamble byte (s). | Do not escape |
| Response header | 3 bytes | Core header fixed at `FE EF EE`, preceded by at least one `0xFE` preamble byte (s). | Do not escape |
| Command byte (CMD) | 1 byte | Identifies the operation; see Section 5 | **Do not escape** |
| Payload | Variable | Command parameters/data; see Section 5 | **Escape required** |
| Checksum (LRC) | 1 byte | Longitudinal redundancy check value | **Escape required** |
| Frame tail | 1 byte | fixed `0xFD` | Do not escape |

## 3. Byte Escaping Rules

### 3.1 Purpose of Escaping

Prevents payload/LRC bytes from colliding with frame control bytes (0xFE, 0xEF, 0xEE, 0xFD) or the escape byte (0xFF).

### 3.2 Transmit-Side Byte Escaping (Host Encoding)

**Escaping scope**: Only **Payload** and **LRC** raw bytes are escaped; the command byte itself is never escaped.

// Pseudocode: escape one raw byte
unsigned char raw\_byte; // raw data
unsigned char temp = raw\_byte + 0x80; // core operation: add 0x80
if (temp > 0xF9) { // Case 1: special escaping. Send 0xFF followed by the low nibble of temp send\_byte (0xFF); send\_byte (temp & 0x0F);
} else { // Case 2: send temp directly send\_byte (temp);
}

### 3.3 Receive-Side Unescaping (Radio decoding / host response parsing)

// Pseudocode: unescape the received encoded payload
while (data remains) { if (current\_byte != 0xFF) { // Case 1: normal byte. raw\_byte = current\_byte + 0x80 raw\_byte = current\_byte + 0x80; advance pointer by 1 byte; } else { // Case 2: 0xFF escape sequence. raw\_byte = 0xF0 + next\_byte + 0x80 raw\_byte = 0xF0 + next\_byte + 0x80; advance pointer by 2 bytes; // skip 0xFF and the following low-nibble byte } store raw\_byte; }

## 4. LRC Checksum

### 4.1 Calculation Rules

- **Calculation scope**: **Only the original payload bytes (before escaping)** are included in the sum; **the command byte is excluded**.
- **Algorithm**: Perform an 8-bit sum (discarding carry), then take its two's complement.

  LRC = (unsigned char)(0x100 - (sum & 0xFF));
- **The LRC byte**: The calculated LRC byte **must also be escaped** before being transmitted in the frame.
- **verify**: The receiver sums the unescaped payload bytes plus the LRC; validation passes when the low 8 bits equal zero.

### 4.2 Example (CMD 0xE0 Request)

// raw payload: "UVL-15W" in ASCII
unsigned char raw\_data[] = {0x55, 0x56, 0x4C, 0x2D, 0x31, 0x35, 0x57};
// 1. Sum bytes
unsigned char sum = 0x55+0x56+0x4C+0x2D+0x31+0x35+0x57; // = 0x1E1, keep low 8 bits 0xE1
// 2. Take two's complement
unsigned char lrc = 0x100 - 0xE1; // = 0x1F
// 3. Escape LRC: 0x1F + 0x80 = 0x9F (≤0xF9, send directly)
// 4. Escape payload: each raw byte + 0x80
// 0x55+0x80=0xD5, 0x56+0x80=0xD6, 0x4C+0x80=0xCC, 0x2D+0x80=0xAD, 0x31+0x80=0xB1, 0x35+0x80=0xB5, 0x57+0x80=0xD7
// Therefore the transmitted LRC byte is 0x9F, and the escaped payload is D5 D6 CC AD B1 B5 D7
// 5. Complete request-frame example (two 0xFE preamble bytes):
// FE FE EE EF E0 D5 D6 CC AD B1 B5 D7 9F FD

## 5. Command Reference

### 5.1 Command Summary

| Command | Function | Request payload (raw) | Success response | Key notes |
| --- | --- | --- | --- | --- |
| **0xE0** | Get device information | 7 bytesModel string | **0xE1** + 71Bdevice information | Handshake command; must send `"UVL-15W"` |
| **0xE1** | Device information response | 71 bytedevice information | (None) | Response to 0xE0; see Section 5.2 for the format |
| **0xE2** | Begin read session | 8 bytesAddress range | `"READ START OK"` | Requires read permission (`Clone_Read_Allow==true`) |
| **0xE3** | Begin write session | 8 bytesAddress range | `"WRITE START OK"` | Requires write permission (`Clone_Write_Allow==true`) |
| **0xE4** | Write one data block | 6+Nbytes (Address+Length+Data) | **0xE6** + `"WF OK"` +echoed address and length | Must be used after `0xE3` after |
| **0xE5** | Complete read/write session | operation-specific string (see Section 5.7) | `"Reboot"` | **The radio reboots after this command** |
| **0xE6** | Read a data block | 6 bytes (Address+Length) | **0xE4** + echoed address and length + Data | Supports fragmented transfer (when length > 128) |
| **0xE7** | Password Verification | 9 bytes (type+Password) | password result string | Password Verification may be required |
| **0xEE** | Generic Error | error-description string | (None) | frame/LRC/command errors; see Section 5.10 |

### 5.2 CMD 0xE0: Get Device Information

- **Request payload**: 7 bytes, must be the model string `"UVL-15W"` as ASCII bytes `{0x55,0x56,0x4C,0x2D,0x31,0x35,0x57}`.
- **Verified request-frame example (two 0xFE preamble bytes)**: `FE FE EE EF E0 D5 D6 CC AD B1 B5 D7 9F FD`

### 5.3 CMD 0xE1: Device Information Response (71 bytes)

Response to the CMD 0xE0 handshake. The raw device-information payload is defined by the following offsets and lengths:

| Offset | Length | Field name | Description and valid range |
| --- | --- | --- | --- |
| 0 | 7 | Model string | `"UVL-15W"` (ASCII) |
| 7 | 1 | Separator | `'_'` (0x5F) |
| 8 | 1 | Sub-model identifier | Fixed at `0x01` |
| 9 | 1 | Separator | `'_'` (0x5F) |
| 10 | 1 | Read-protection flag | `0x00` =Read allowed, `0x01` =Password required |
| 11 | 1 | Write-protection flag | `0x00` =Write allowed, `0x01` =Password required |
| 12 | 8 | Firmware/software version | 8 bytesFirmware/software version information |
| 20 | 1 | Separator | `'_'` (0x5F) |
| 21 | 3 | Image-resource version | Format: {major, minor, revision}, Example: `{0x01, 0x00, 0x00}` |
| 24 | 12 | CPU unique ID | 12 bytesCPU unique identifier |
| 36 | 16 | Bootloader model information | 16 bytesModel information stored by the bootloader |
| 52 | 9 | Hardware version (decrypted) | 9-byte decrypted hardware-version string |
| 61 | 20 | Serial number (decrypted) | 20-byte decrypted serial-number string |

**Note**: After receiving this response, the host should check the read/write protection flags at bytes 10 and 11 to determine whether password verification is required (`CMD 0xE7`).

### 5.4 CMD 0xE2: Begin Read/Clone Session

- **Request payload**: 8 bytes. 4-byte start address (Big-Endian) + 4-byte end address (Big-Endian). The range should be within `0x8000` - `0x21000` range.
- **Example**:
  **Typical usage: announce the entire valid data region (0x8000-0x21000), so the radio knows the full operation range and the host can calculate/display progress.**
  - start address: `0x8000` (Big-Endian: `0x00 0x00 0x80 0x00`)
  - End address: `0x21000` (Big-Endian: `0x00 0x02 0x10 0x00`)
  - Raw data: `{0x00, 0x00, 0x80, 0x00, 0x00, 0x02, 0x10, 0x00}`
  - Escaped: raw byte + 0x80 -> `{0x80, 0x80, 0x00, 0x80, 0x80, 0x82, 0x90, 0x80}`
  - LRC calculation (raw payload): `0x00+0x00+0x80+0x00+0x00+0x02+0x10+0x00=0x92`, two's complement `0x6E`, Escaped `0x6E+0x80=0xEE`.
  - **Complete request-frame example (two 0xFE preamble bytes)**: *FE FE EE EF E2 80 80 00 80 80 82 90 80 EE FD*
- **Response**: ASCII string `"READ START OK"` (escaped).

### 5.5 CMD 0xE3: Begin Write/Clone Session

- **Request payload**: Same as **CMD 0xE2** (8 bytesAddress range).
- **Example**:
  **Typical usage: announce the entire valid data region (0x8000-0x21000), so the radio knows the full operation range and the host can calculate/display progress.**
  - start address: `0x8000` (Big-Endian: `0x00 0x00 0x80 0x00`)
  - End address: `0x21000` (Big-Endian: `0x00 0x02 0x10 0x00`)
  - Raw data: `{0x00, 0x00, 0x80, 0x00, 0x00, 0x02, 0x10, 0x00}`
  - Escaped: raw byte + 0x80 -> `{0x80, 0x80, 0x00, 0x80, 0x80, 0x82, 0x90, 0x80}`
  - LRC calculation (raw payload): `0x00+0x00+0x80+0x00+0x00+0x02+0x10+0x00=0x92`, two's complement `0x6E`, Escaped `0x6E+0x80=0xEE`.
  - **Complete request-frame example (two 0xFE preamble bytes)**: *FE FE EE EF E3 80 80 00 80 80 82 90 80 EE FD*
- **Response**: ASCII string `"WRITE START OK"` (escaped).

### 5.6 CMD 0xE4: Write a Data Block

- **Request payload**: `6 + N` bytes.
  - bytes 0-3: Write address (4 bytes, Big-Endian)
  - bytes 4-5: Data length N (2 bytes, Big-Endian)
  - bytes 6-(6+N-1): N raw data bytes to write
- **Example**:
  **Typical usage: write to address `0x8000` write 512 bytes of data.**
  - **Raw request payload (6+512=518 bytes)**:
  1. **Address**: `0x8000` -> Big-Endianbytes: `{0x00, 0x00, 0x80, 0x00}`
  2. **Length**: `512` (`0x0200`) -> Big-Endianbytes: `{0x02, 0x00}`
  3. **Data**: The example uses a patterned 512-byte block, e.g. incrementing from `0x00` incrementing through `0xFF`, repeated twice.
     `{0x00, 0x01, 0x02, ..., 0xFD, 0xFE, 0xFF, 0x00, 0x01, ..., 0xFD, 0xFE, 0xFF}`- **Escaping**: Apply escaping to the **entire raw payload** (all 518 bytes containing address, length, and data). Apply the rule to **each raw byte**: `+0x80` operation.If the result is greater than `0xF9` use `0xFF` special escaping.
  - **LRC calculation (raw payload)**:
    - Calculation scope: 518 bytesRaw data (Address+Length+Data).
    - Sum (low 8 bits): assume `S`.
    - LRC\_raw value: `LRC_raw = 0x100 - S`.
    - LRC escaping: `LRC_escaped = LRC_raw + 0x80` (if result <= 0xF9), or use `0xFF` escaping.
  - **Complete request-frame structure example**:
    *[preamble 0xFE] [preamble 0xFE] 0xEE 0xEF E4 [escaped518 bytesPayload] [escaped LRC] FD*
    *This is a structural example. Actual frame length is approximately 2(preamble) + 3(frame header) + 1(CMD) + 518(escaped payload; length may increase due to special escapes) + 1(LRC) + 1(Frame tail) = 526 bytesapproximately.*
- **Response (0xE6)**: Payload is `"WF OK"` (5 bytes) + echoed address (4 bytes) + echoed length (2 bytes).

Source revision note: corrected CMD 0xE5 description

### 5.7 CMD 0xE5: Complete Read/Write Session

- **Request payload**: Send a different ASCII string depending on the operation type:
  - **Read complete**: send `"Read Complete"` (13 bytes, without a null terminator)
  - **Write complete**: send `"Write Complete"` (14 bytes, without a null terminator)
- **Example1: Read complete (send"Read Complete")**:
  - Raw payload: `"Read Complete"` → ASCII: `{0x52, 0x65, 0x61, 0x64, 0x20, 0x43, 0x6F, 0x6D, 0x70, 0x6C, 0x65, 0x74, 0x65}`
  - Escaped: For the13 bytesapply `+0x80` operation.
  - Calculate LRC over the 13 raw bytes, then escape the LRC.
  - **Complete request-frame example (two 0xFE preamble bytes)**:
    *FE FE EE EF E5 [escaped"Read Complete"] [escaped LRC] FD*
- **Example2: Write complete (send"Write Complete")**:
  - Raw payload: `"Write Complete"` → ASCII: `{0x57, 0x72, 0x69, 0x74, 0x65, 0x20, 0x43, 0x6F, 0x6D, 0x70, 0x6C, 0x65, 0x74, 0x65}`
  - Escaped: For the14 bytesapply `+0x80` operation.
  - Calculate LRC over the 14 raw bytes, then escape the LRC.
  - **Complete request-frame example (two 0xFE preamble bytes)**:
    *FE FE EE EF E5 [escaped"Write Complete"] [escaped LRC] FD*
- **Response**: ASCII string `"Reboot"` (escaped). **After sending this response, the radio automatically reboots after approximately 400 ms**, The host should be prepared to reconnect.

### 5.8 CMD 0xE6: Read Data Block

- **Request payload**: 6 bytes.
  - bytes 0-3: Read start address (4 bytes, Big-Endian)
  - bytes 4-5: Number of bytes to read N (2 bytes, Big-Endian)
- **Example** (from observed communication): from address `0x00000000` read `0x0800` (2048) bytes.
  - Raw request payload: `{0x00,0x00,0x00,0x00, 0x08,0x00}`
  - Escaping: apply the escaping rule to each of the 6 raw bytes (address + length) `+0x80` operation.
  - Calculate LRC over the 6 raw bytes, then escape the LRC.
  - Verified request frame (2 preamble 0xFE): `FE FE EE EF E6 80 80 00 80 88 80 F8 FD`
- **Response rules**:
  1. **If N ≤ 128**: single-frame response **CMD 0xE4**. Payload format: echoed address (4 B) + echoed length (2 B) + N bytes of returned data.
  2. **If N > 128**: use **fragmented transfer**.
     - **First fragment**: send one **incomplete** `0xE4` frame (**None `0xFD` Frame tail**), containingechoed address, echoed lengthand the first up-to-128 bytes of data.
     - **Middle fragments**: send consecutive **raw data fragments** (no command byte), up to 128 bytes each, using the same escaping rules.
     - **Final fragment**: Send the final data fragment followed by **escaped LRC** and **Frame tail `0xFD`**, to complete the logical frame.
- **Note**: The host must use the length field in the first fragment to continue receiving and assembling fragments until the requested byte count is complete.

### 5.9 CMD 0xE7: Password Verification

- **Request payload**: 9 bytes.
  - bytes 0: Verification type. `0x00` =verify read password, `0x01` =verify write password.
  - bytes 1-8: Password. 8 bytesASCII, pad unused bytes with `0xFF` padding.
- **Response**: verification result string (escaped).
  - Read password correct: `"Read Password Right"`
  - Read password incorrect: `"Read Password Error"`
  - Write password correct: `"Write Password Right"`
  - Write password incorrect: `"Write Password Error"`

### 5.10 CMD 0xEE: Generic Error Response

The radio returns CMD 0xEE when request parsing or execution fails. A robust CPS should handle these errors explicitly. **Error string (escaped)** and **Trigger condition** as follows:

| Error message (raw ASCII) | Trigger condition | Recommended host handling |
| --- | --- | --- |
| `"Frame Head Error"` | The received frame core header (`FE EE EF`) is incorrect. | Verify the transmitted header and check the link for corruption. |
| `"Frame Tail Error"` | The received frame does not end with `0xFD`. | Check frame integrity and whether the data stream was truncated. |
| `"Frame Length Error"` | The received frame is too short (<5 bytes), not enough to form a valid frame. | Verify that the request was transmitted completely. |
| `"Frame Lrc Error"` | The received frame failed LRC validation. | Check payload escaping and LRC calculation. **The host should retry the failed request**. This is a common transport/protocol error. |
| `"Option Value Error"` | The command byte is unknown, or a CMD 0xE8 subfunction is unsupported. | Verify the command byte and whether the installed firmware supports it. |

**Important**: All error responses use the standard response-frame format: *[preamble FE]... FE EF EE EE [escaped error information] [escaped LRC] FD*. When the host receives *CMD 0xEE* it should apply an appropriate **retry strategy** or error-handling strategy.e.g., if `"Frame Lrc Error"` causes a block read/write failure, retry the corresponding `0xE6` or `0xE4` command.

## 6. Typical Communication Flows

Source revision note: complete read flow updated to include Read Complete

### 6.1 Complete Read Flow

1. APP -> radio: **0xE0** (`"UVL-15W"`) // handshake
2. radio -> APP: **0xE1** (device information) // check read-protection flag (bytes10)
3. (if protected) APP -> radio: **0xE7** (type0x00 + read password) // verify
4. APP -> radio: **0xE2** (start address, End address) // start read
5. radio -> APP: `"READ START OK"` // acknowledgement
6. **loop** {
   - APP -> radio: **0xE6** (Address, Length) // request one block
   - radio -> APP: **0xE4** (Address, Length, Data) // return data (may be fragmented)} until all data has been read
7. APP -> radio: **0xE5** (`"Read Complete"`) // Read complete
8. radio -> APP: `"Reboot"` // radio will reboot
9. (after the radio reboots) the app reconnects starting from step 1.

Source revision note: corrected the write-completion command

### 6.2 Complete Write Flow

1. APP -> radio: **0xE0** (`"UVL-15W"`) // handshake
2. radio -> APP: **0xE1** (device information) // check write-protection flag (bytes11)
3. (if protected) APP -> radio: **0xE7** (type0x01 + write password) // verify
4. APP -> radio: **0xE3** (start address, End address) // start write
5. radio -> APP: `"WRITE START OK"` // acknowledgement
6. **loop** {
   - APP -> radio: **0xE4** (Address, Length, Data) // send one block (typically 512 bytes)
   - radio -> APP: **0xE6** (`"WF OK"` +Address+Length) // write acknowledgement} until all data has been sent
7. APP -> radio: **0xE5** (`"Write Complete"`) // Write complete
8. radio -> APP: `"Reboot"` // radio will reboot
9. (after the radio reboots) the app reconnects starting from step 1.

## 7. Host/CPS Implementation Notes

1. **Frame synchronization**: request core header is `FE EE EF`, it must be preceded by **at least one `0xFE`** for device wake-up and byte-stream synchronization. Expected response core header: `FE EF EE`.
2. **Escaping scope**: only payload and LRC are escaped (`+0x80`), command. Do not escape. Pay special attention to the `0xFF` escape sequence.
3. **LRC calculation**: **OnlyPayloadraw\_byte** calculate the two's-complement checksum. Validate the implementation against a known-good frame such as CMD 0xE0 before implementing the full protocol.
4. **Addresses and lengths**: use **Big-Endian order**. Operation addresses should remain within `0x8000` (32768) to `0x21000` (135168) .
5. **Progress and operation range**: `CMD 0xE2` and `CMD 0xE3` The full valid address range sent with these commands (`0x8000-0x21000`) tells the radio the complete transfer extent and can be used by the host for progress calculation.
6. **Fragmented reads**: must implement `0xE6 0xE4` response-fragment reassembly. Use the length field in the first fragment to continue receiving subsequent fragments.
7. **Error handling and retries**: **must correctly handle `CMD 0xEE` error responses**. For `"Frame Lrc Error"` transport errors, implement command-level **retry strategy**, with sensible timeout and retry limits.
8. **Final reboot**: `0xE5` command (send `"Read Complete"` for read completion and `"Write Complete"` for write completion) causes the radio to reboot; this is normal.

End of Document

**Notes**: This document is a protocol reference for host-side/CPS development. Implementations should follow the framing, escaping, and checksum rules exactly.
