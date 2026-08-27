from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import frida


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Capture TYT CPS Qt6SerialPort traffic without opening the COM port."
    )
    parser.add_argument("output", type=Path, help="Output JSONL capture path")
    parser.add_argument(
        "--cps",
        type=Path,
        default=Path(r"C:\UVL15W-CPS\UVL-15W_Program_Software.exe"),
        help=r"CPS executable path (default: C:\UVL15W-CPS\UVL-15W_Program_Software.exe)",
    )
    args = parser.parse_args()

    cps = args.cps.expanduser().resolve()
    output = args.output.expanduser().resolve()
    hook = Path(__file__).with_name("hook.js")
    serial_dll = cps.with_name("Qt6SerialPort.dll")

    for required in (cps, hook, serial_dll):
        if not required.is_file():
            parser.error(f"Required file does not exist: {required}")

    output.parent.mkdir(parents=True, exist_ok=True)
    finished = threading.Event()
    sequence = 0

    with output.open("x", encoding="utf-8", buffering=1) as capture:

        def write_record(record: dict[str, Any]) -> None:
            nonlocal sequence
            sequence += 1
            capture.write(json.dumps({"sequence": sequence, **record}) + "\n")

        write_record(
            {
                "type": "metadata",
                "capturedAt": datetime.now(timezone.utc).isoformat(),
                "host": platform.platform(),
                "python": sys.version,
                "frida": frida.__version__,
                "cpsPath": str(cps),
                "cpsSha256": sha256(cps),
                "qtSerialPortSha256": sha256(serial_dll),
                "hookPath": str(hook),
                "hookSha256": sha256(hook),
            }
        )

        device = frida.get_local_device()
        previous_directory = Path.cwd()

        try:
            os.chdir(cps.parent)
            pid = device.spawn([str(cps)])
            session = device.attach(pid)

            def on_detached(reason: str, crash: Any) -> None:
                write_record(
                    {
                        "type": "detached",
                        "reason": reason,
                        "crash": str(crash) if crash else None,
                    }
                )
                finished.set()

            def on_message(message: dict[str, Any], data: bytes | None) -> None:
                if message.get("type") == "send":
                    payload = dict(message.get("payload") or {})
                    if data is not None:
                        payload["hex"] = bytes(data).hex().upper()
                    write_record(payload)
                    if payload.get("type") in {"ready", "fatal", "warning"}:
                        print(payload.get("message"), flush=True)
                    return

                write_record({"type": "frida-message", "message": message})
                print(json.dumps(message), file=sys.stderr, flush=True)

            session.on("detached", on_detached)
            script = session.create_script(hook.read_text(encoding="utf-8"))
            script.on("message", on_message)
            script.load()
            device.resume(pid)

            print(f"Capturing to {output}")
            print("Close TYT CPS after the operation, or press Ctrl+C to stop capture.")

            try:
                finished.wait()
            except KeyboardInterrupt:
                write_record({"type": "capture-stopped", "reason": "keyboard-interrupt"})
                session.detach()
        finally:
            os.chdir(previous_directory)

    print(f"Capture saved: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
