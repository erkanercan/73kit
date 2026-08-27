# UVL-15W official-CPS serial capture

Driverless Windows ARM64 capture for the supplied x64 TYT CPS. The controller
launches the official CPS through Frida and records calls to the exported
`QSerialPort::readData`, `QSerialPort::writeData`, buffered
`QIODevice::readAll`, serial configuration, control signals, open, and close
methods. It does not open the COM port itself.

For the supplied CPS build, it also records the first non-trivial call to the
firmware block transform. That diagnostic record contains the transform input,
session key, round count, and output needed to reproduce the official updater.
On the first Resource Flash `E3` request, it records both the Qt dispatch caller
and the direct CPS caller of `QIODevice::write`. In the supplied build that CPS
caller is the generic serial sender, which is still useful as a stable static
analysis entry point. The hook does not dump process memory or change the
request.

Install ARM64 Python and Frida:

```powershell
winget install --exact --id Python.Python.3.13 --architecture arm64
py -3.13 -m pip install --upgrade "frida>=17.1,<18"
```

Place `capture.py` and `hook.js` together. The script defaults to the established
CPS location `C:\UVL15W-CPS\UVL-15W_Program_Software.exe`. Run from the capture
directory:

```powershell
py -3.13 .\capture.py ".\capture-language-1.01.05.jsonl"
```

Use `--cps C:\path\to\UVL-15W_Program_Software.exe` only when the executable is
not in that established location.

Wait for `Qt6SerialPort capture hooks installed` before starting the update.
Close the CPS after the operation to finalize the capture.

The JSONL output includes executable/DLL hashes, serial settings, timestamps,
direction, port-object identity, length, and exact hexadecimal bytes. It may
contain radio identifiers or activation material and should be treated as
sensitive.
