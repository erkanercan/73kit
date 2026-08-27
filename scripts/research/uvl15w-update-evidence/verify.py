#!/usr/bin/env python3
"""Verify the retained UVL-15W updater evidence without touching a radio."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import sys
from dataclasses import dataclass
from pathlib import Path


EXPECTED_HASHES = {
    "01-language-1.01.05.jsonl": "46ddc57232fe6e48233007134f6cce8db39aafa6b33867785bdfef146e774b1a",
    "02-language-1.01.05-rx.jsonl": "4aa31f8cff91d9919c6f51329a036e9cf86b22068faed40d8b48ec547aaf3ea8",
    "03-language-1.01.05-rx.jsonl": "d532bd8d017abb41cf66016c87949034324d93186b48f4c2bc615c4ad5e6d856",
    "04-firmware-3.7.23.jsonl": "684040de77b86a1ae77c4e23702012c70e0ad73f33ea51011190e43ebe9f7345",
    "05-firmware-transform.jsonl": "1eab0644cd9caaf71f148f7ec0e45cc9b6ebe52527077e2d262c2772170c74a1",
    "06-image-1.01.00-callsite.jsonl": "a97bfe55d733645718ceffe1a63aa7f9e16373edf6ff5941dd29180fbb82db17",
    "07-combined-1.01.05-image-1.01.00-callsite.jsonl": "b8026214ebcd65acb8f7d75a6b1d9ac4c28c65faa9f2227e9ed49be8dfbdf5d2",
    "08-language-e3-callsite-v2.jsonl": "e3fb97e42f0b668429c84aff2828305b403ff4bc4e79c2f835f2840e8f03c7f1",
    "09-language-e3-cps-callsite-v3.jsonl": "3f4bfb1414dded0ee6844e64c0b0dc37062bdc3ac7ba76cb00f15ffe7eb86340",
}

VENDOR_FILES = {
    "firmware": (
        "Firmware/UVL-15W(R) 3.7.23 2026-07-23 19.06.47.Fir",
        "3b4bc8f8feff871e0ea082a31f99488f411eaefd879903f13bbb7c30d385f6b4",
    ),
    "language": (
        "Flash Data/Language/Language 1.01.05.DAT",
        "bcf6c1f19233518d7bb7fde970a1062843f3868b5876d3ea6c3e6ed5e291e1e6",
    ),
    "image": (
        "Flash Data/Image/Image 1.01.00.DAT",
        "0164e952aca45c345f152936fd57b54744be5aff78f6ef0b9ec5f63c2abbb5d2",
    ),
    "combined": (
        "Flash Data/Language 1.01.05 And Image 1.01.00.DAT",
        "56213735761983aefd5ea6e9e449c1cbb0d998ebe851857102a02275fdf80934",
    ),
}

PACKAGE_KEY = bytes.fromhex("178B09AA043DFF60370D542FCA9C30AA")
DELTA = 0x645A75C5
MASK32 = 0xFFFFFFFF
CPS_SHA256 = "6677766dee106cf143861b888a2c5322d5279af216a32817c8a699f356f59590"


@dataclass(frozen=True)
class Frame:
    direction: str
    command: int
    payload: bytes


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def pe_bytes_at(path: Path, virtual_address: int, length: int) -> bytes:
    data = path.read_bytes()
    require(data[:2] == b"MZ", "CPS executable DOS signature")
    pe_offset = struct.unpack_from("<I", data, 0x3C)[0]
    require(data[pe_offset : pe_offset + 4] == b"PE\0\0", "CPS executable PE signature")
    section_count = struct.unpack_from("<H", data, pe_offset + 6)[0]
    optional_size = struct.unpack_from("<H", data, pe_offset + 20)[0]
    optional_offset = pe_offset + 24
    require(struct.unpack_from("<H", data, optional_offset)[0] == 0x20B, "CPS PE32+ format")
    image_base = struct.unpack_from("<Q", data, optional_offset + 24)[0]
    requested_rva = virtual_address - image_base
    section_offset = optional_offset + optional_size
    for index in range(section_count):
        offset = section_offset + index * 40
        virtual_size, section_rva, raw_size, raw_offset = struct.unpack_from(
            "<IIII", data, offset + 8
        )
        if section_rva <= requested_rva < section_rva + max(virtual_size, raw_size):
            file_offset = raw_offset + requested_rva - section_rva
            return data[file_offset : file_offset + length]
    raise ValueError(f"CPS virtual address not mapped: {virtual_address:#x}")


def verify_cps_e3_builder(path: Path) -> None:
    signatures = {
        0x1400566C4: bytes.fromhex("0F858E080000"),
        0x140056740: bytes.fromhex("418B5754"),
        0x140056980: bytes.fromhex("418B5758"),
        0x140053893: bytes.fromhex("49C744245000000000"),
        0x14005389C: bytes.fromhex("49C744245800000000"),
        0x1400539C7: bytes.fromhex("498D4C2460"),
        0x1400539D1: bytes.fromhex("498D4C2448"),
    }
    for address, expected in signatures.items():
        require(pe_bytes_at(path, address, len(expected)) == expected, f"CPS E3 signature at {address:#x}")
    require(
        pe_bytes_at(path, 0x14026A11D, 15) == b"FE FE EE EF E3\0",
        "CPS E3 frame-prefix literal",
    )


def decode_escaped(data: bytes) -> bytes:
    output = bytearray()
    index = 0
    while index < len(data):
        value = data[index]
        if value == 0xFF:
            require(index + 1 < len(data), "truncated escape sequence")
            low = data[index + 1]
            require(low <= 0x0F, "invalid escape suffix")
            output.append((0xF0 + low + 0x80) & 0xFF)
            index += 2
        else:
            output.append((value + 0x80) & 0xFF)
            index += 1
    return bytes(output)


def parse_frames(stream: bytes, direction: str) -> list[Frame]:
    if not stream:
        return []
    core = b"\xEE\xEF" if direction == "tx" else b"\xEF\xEE"
    pattern = re.compile(b"\xFE+" + re.escape(core))
    frames: list[Frame] = []
    cursor = 0
    while match := pattern.search(stream, cursor):
        command_at = match.end()
        require(command_at < len(stream), "frame missing command")
        tail = stream.find(b"\xFD", command_at + 1)
        require(tail >= 0, "frame missing tail")
        decoded = decode_escaped(stream[command_at + 1 : tail])
        require(decoded, "frame missing LRC")
        payload, lrc = decoded[:-1], decoded[-1]
        require((sum(payload) + lrc) & 0xFF == 0, "invalid frame LRC")
        frames.append(Frame(direction, stream[command_at], payload))
        cursor = tail + 1
    require(frames, f"no {direction} frames found in non-empty stream")
    return frames


def load_capture(path: Path) -> tuple[list[Frame], list[dict[str, object]]]:
    streams = {"tx": bytearray(), "rx": bytearray()}
    diagnostics: list[dict[str, object]] = []
    with path.open(encoding="utf-8") as source:
        for line in source:
            event = json.loads(line)
            if event.get("type") == "serial-data":
                direction = event["direction"]
                streams[direction].extend(bytes.fromhex(event["hex"]))
            elif event.get("type") == "firmware-transform":
                diagnostics.append(event)
    return (
        parse_frames(bytes(streams["tx"]), "tx")
        + parse_frames(bytes(streams["rx"]), "rx"),
        diagnostics,
    )


def load_events(path: Path) -> list[dict[str, object]]:
    with path.open(encoding="utf-8") as source:
        return [json.loads(line) for line in source]


def frames_in(frames: list[Frame], direction: str, command: int) -> list[Frame]:
    return [f for f in frames if f.direction == direction and f.command == command]


def parse_dat(path: Path) -> dict[int, bytes]:
    records: dict[int, bytes] = {}
    with path.open("rb") as source:
        for line_number, raw_line in enumerate(source, 1):
            line = raw_line.rstrip(b"\r\n")
            require(
                re.fullmatch(rb"[0-9A-F]{8}0020[0-9A-F]{64}", line) is not None,
                f"{path.name}:{line_number}: invalid DAT record",
            )
            address = int(line[:8], 16)
            require(address not in records, f"{path.name}: duplicate address")
            records[address] = bytes.fromhex(line[12:].decode("ascii"))
    require(records, f"{path.name}: empty DAT")
    addresses = sorted(records)
    require(
        all(right == left + 32 for left, right in zip(addresses, addresses[1:])),
        f"{path.name}: non-contiguous records",
    )
    return records


def xxtea_encrypt(data: bytes, key: bytes) -> bytes:
    require(len(data) >= 8 and len(data) % 4 == 0, "XXTEA input length")
    require(len(key) == 16, "XXTEA key length")
    values = list(struct.unpack(f"<{len(data) // 4}I", data))
    key_words = struct.unpack("<4I", key)
    count = len(values)
    rounds = 32 + 52 // count
    total = 0
    z = values[-1]
    for _ in range(rounds):
        total = (total + DELTA) & MASK32
        e = (total >> 2) & 3
        for position in range(count - 1):
            y = values[position + 1]
            mix = (
                (((z >> 5) ^ ((y << 2) & MASK32)) + ((y >> 3) ^ ((z << 4) & MASK32)))
                ^ ((total ^ y) + (key_words[(position & 3) ^ e] ^ z))
            ) & MASK32
            values[position] = (values[position] + mix) & MASK32
            z = values[position]
        y = values[0]
        position = count - 1
        mix = (
            (((z >> 5) ^ ((y << 2) & MASK32)) + ((y >> 3) ^ ((z << 4) & MASK32)))
            ^ ((total ^ y) + (key_words[(position & 3) ^ e] ^ z))
        ) & MASK32
        values[position] = (values[position] + mix) & MASK32
        z = values[position]
    return struct.pack(f"<{count}I", *values)


def handshake_key(frames: list[Frame]) -> bytes:
    requests = frames_in(frames, "tx", 0xC1)
    responses = frames_in(frames, "rx", 0x1C)
    require(len(requests) >= 7 and len(responses) >= 7, "incomplete C1 handshake")
    initial_requests = requests[:7]
    by_index = {frame.payload[0]: frame.payload[1:] for frame in responses[:7]}
    require(set(range(7)).issubset(by_index), "missing C1 response index")
    time_bcd = initial_requests[0].payload[1:4]
    base = bytearray(by_index[0])
    build = by_index[2].decode("ascii")
    require(len(base) == 12 and len(build) >= 5, "unexpected C1 identity shape")
    minute = build[-5:-3]
    require(minute.isdigit(), "unexpected bootloader timestamp")
    base[5] = ord(build[-1])
    base[9] = ord(minute[0])
    base[11] = ord(minute[1])
    return bytes(base) + b"\x5D" + time_bcd


def verify_resource(
    capture: Path, dat_records: dict[int, bytes], expected_blocks: int
) -> None:
    frames, _ = load_capture(capture)
    writes = frames_in(frames, "tx", 0xE4)
    acks = frames_in(frames, "rx", 0xE6)
    require(
        len(writes) == expected_blocks and len(acks) == expected_blocks,
        "Resource Flash block count",
    )
    reconstructed = bytearray()
    expected_address = min(dat_records)
    for request, ack in zip(writes, acks):
        address = int.from_bytes(request.payload[:4], "big")
        declared = int.from_bytes(request.payload[4:6], "big")
        data = request.payload[6:]
        require(address == expected_address, "Resource Flash address sequence")
        require(declared == 512, "Resource Flash declared block length")
        require(
            ack.payload == b"WF OK" + request.payload[:6],
            "Resource Flash acknowledgement",
        )
        reconstructed.extend(data)
        expected_address += len(data)
    dat_bytes = b"".join(dat_records[address] for address in sorted(dat_records))
    require(bytes(reconstructed) == dat_bytes, "Resource Flash capture differs from DAT")
    require(
        frames_in(frames, "tx", 0xE5)[-1].payload == b"Read Complete",
        "Resource Flash completion",
    )


def verify_firmware(capture: Path, firmware: bytes, expected_stream_hash: str) -> None:
    frames, _ = load_capture(capture)
    blocks = frames_in(frames, "tx", 0xC2)
    acks = frames_in(frames, "rx", 0x2C)
    require(len(blocks) == 1590 and len(acks) == 1590, "firmware block/ACK count")
    require(all(frame.payload == b"OK" for frame in acks), "firmware ACK payload")
    key = handshake_key(frames)
    transmitted = bytearray()
    body = firmware[16:]
    for index, frame in enumerate(blocks, 1):
        total = int.from_bytes(frame.payload[:2], "big")
        number = int.from_bytes(frame.payload[2:4], "big")
        length = int.from_bytes(frame.payload[4:6], "big")
        data = frame.payload[6:]
        require(total == 1590 and number == index and length == len(data), "firmware block header")
        plain = body[(index - 1) * 512 : (index - 1) * 512 + length]
        require(xxtea_encrypt(plain, key) == data, "firmware transformed block mismatch")
        transmitted.extend(data)
    require(hashlib.sha256(transmitted).hexdigest() == expected_stream_hash, "firmware stream hash")
    verification = frames_in(frames, "rx", 0x3C)
    require(verification and verification[-1].payload == firmware[16:20] * 2, "firmware final verification")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--vendor-root", type=Path, required=True)
    parser.add_argument("--capture-dir", type=Path, required=True)
    args = parser.parse_args()

    for name, expected in EXPECTED_HASHES.items():
        path = args.capture_dir / name
        require(path.is_file(), f"missing capture: {path}")
        require(sha256(path) == expected, f"capture hash mismatch: {name}")
    print("PASS capture manifest (9 files)")

    parsed_captures = {
        name: load_capture(args.capture_dir / name)[0] for name in EXPECTED_HASHES
    }
    expected_e3 = {
        "01-language-1.01.05.jsonl": "0000001500000000",
        "02-language-1.01.05-rx.jsonl": "C42FC32FC62FC52F",
        "03-language-1.01.05-rx.jsonl": "0000000D00000000",
        "06-image-1.01.00-callsite.jsonl": "0000001D00000000",
        "07-combined-1.01.05-image-1.01.00-callsite.jsonl": "0000001100000000",
        "08-language-e3-callsite-v2.jsonl": "0000000100000001",
        "09-language-e3-cps-callsite-v3.jsonl": "0000000D00000000",
    }
    for name, expected in expected_e3.items():
        starts = frames_in(parsed_captures[name], "tx", 0xE3)
        require(len(starts) == 1, f"{name}: Resource Flash E3 count")
        require(starts[0].payload.hex().upper() == expected, f"{name}: E3 payload")
    require(len(set(expected_e3.values())) == 6, "expected six distinct E3 payloads")
    print("PASS all capture frame LRCs and seven pinned E3 observations")

    cps_path = args.vendor_root / "UVL-15W_Program_Software.exe"
    require(cps_path.is_file(), f"missing vendor CPS: {cps_path}")
    require(sha256(cps_path) == CPS_SHA256, "vendor CPS hash mismatch")
    verify_cps_e3_builder(cps_path)
    print("PASS pinned CPS binary and E3-builder signatures")

    vendor_paths: dict[str, Path] = {}
    for label, (relative, expected) in VENDOR_FILES.items():
        path = args.vendor_root / relative
        require(path.is_file(), f"missing vendor file: {path}")
        require(sha256(path) == expected, f"vendor hash mismatch: {path.name}")
        vendor_paths[label] = path
    print("PASS vendor package manifest (4 files)")

    language = parse_dat(vendor_paths["language"])
    image = parse_dat(vendor_paths["image"])
    combined = parse_dat(vendor_paths["combined"])
    require(all(combined.get(address) == data for address, data in language.items()), "combined lacks language records")
    require(all(combined.get(address) == data for address, data in image.items()), "combined lacks image records")
    print("PASS DAT grammar, continuity, and combined-file inclusion")

    verify_resource(
        args.capture_dir / "03-language-1.01.05-rx.jsonl", language, 194
    )
    print("PASS captured language write and 194 acknowledgements")

    verify_resource(
        args.capture_dir / "08-language-e3-callsite-v2.jsonl", language, 194
    )
    print("PASS v2 E3 diagnostic language write")

    verify_resource(
        args.capture_dir / "09-language-e3-cps-callsite-v3.jsonl", language, 194
    )
    capture_09_events = load_events(
        args.capture_dir / "09-language-e3-cps-callsite-v3.jsonl"
    )
    callsites = [
        event
        for event in capture_09_events
        if event.get("type") == "resource-flash-start-cps-callsite"
    ]
    require(len(callsites) == 1, "v3 CPS callsite diagnostic count")
    require(callsites[0].get("hookVersion") == 3, "v3 CPS callsite hook version")
    require(
        callsites[0].get("caller")
        == {"module": "UVL-15W_Program_Software.exe", "rva": "0x11c5d8"},
        "v3 CPS callsite",
    )
    print("PASS v3 CPS-callsite language write")

    verify_resource(
        args.capture_dir / "06-image-1.01.00-callsite.jsonl", image, 5795
    )
    print("PASS captured image write and 5,795 acknowledgements")

    verify_resource(
        args.capture_dir / "07-combined-1.01.05-image-1.01.00-callsite.jsonl",
        combined,
        13056,
    )
    print("PASS captured combined write and 13,056 acknowledgements")

    firmware = vendor_paths["firmware"].read_bytes()
    digest_text = firmware[16:].hex().upper().encode("ascii")
    require(xxtea_encrypt(hashlib.md5(digest_text).digest(), PACKAGE_KEY) == firmware[:16], "firmware package tag")
    print("PASS firmware package integrity tag")

    verify_firmware(
        args.capture_dir / "04-firmware-3.7.23.jsonl",
        firmware,
        "810f4428d961ead62c24a7512f776dc642d9cba67a7ad90d0c519753fc0e03dd",
    )
    verify_firmware(
        args.capture_dir / "05-firmware-transform.jsonl",
        firmware,
        "8a8a5c04ee0e0eac06f2b7e0d6aad8109b9586c100163651825004f2d0a79f90",
    )
    print("PASS both captured firmware streams (3,180 transformed blocks)")

    _, diagnostics = load_capture(args.capture_dir / "05-firmware-transform.jsonl")
    require(len(diagnostics) == 1, "firmware transform diagnostic count")
    diagnostic = diagnostics[0]
    require(
        xxtea_encrypt(bytes.fromhex(str(diagnostic["inputHex"])), bytes.fromhex(str(diagnostic["keyHex"])))
        == bytes.fromhex(str(diagnostic["outputHex"])),
        "instrumented firmware transform",
    )
    print("PASS instrumented transform record")
    print("All offline updater evidence verified; no serial port was opened.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"FAIL {error}", file=sys.stderr)
        raise SystemExit(1) from error
