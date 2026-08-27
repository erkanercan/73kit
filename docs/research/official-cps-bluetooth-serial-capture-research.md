# Official TYT CPS Bluetooth Serial Capture Research

Date: 2026-08-27

> **Status: attempted and superseded.** CrossOver could not operate the TYT
> CPS COM selector, and TYT CPS did not accept the Parallels virtual `COM1`.
> No official-CPS Bluetooth traffic was captured. See the
> [completed hardware test and final support status](./bluetooth-host-connectivity-research.md#completed-hardware-test).

## Recommendation

Try **CrossOver on this Mac first**. It can map a native `/dev/...` serial
device to `COM1`; map `COM1` to a temporary PTY instead, then use `socat -x -v`
as a bidirectional relay between that PTY and `/dev/cu.ET25SE...`. The relay's
hex log captures the exact bytes sent and received while the official TYT CPS
performs one read-only Radio Read. This avoids installing Windows or a kernel
capture driver.

CodeWeavers documents native serial-device-to-COM mapping as a potential
workaround, but explicitly warns that it does not work for every application
([CrossOver serial mapping](https://support.codeweavers.com/using-usb-devices-with-crossover)).
Therefore the first gate is simply whether the official TYT CPS installs,
launches, and lists the mapped COM port in a CrossOver trial.

If CrossOver cannot run the CPS, use a **Windows 11 ARM virtual machine in
Parallels Desktop**. Parallels can expose the already-paired macOS
`/dev/cu.ET25SE...` device to the VM as a physical serial port; capture that
Windows COM port with **Electronic Team Serial Port Monitor 9.5**.

The Windows fallback is practical because:

- Parallels Desktop 26 can connect an existing Mac serial port to a VM as a
  physical serial port
  ([current Parallels serial-port documentation](https://docs.parallels.com/landing/pdfm-ug/parallels-desktop-for-mac-26-users-guide/parallels-desktop-preferences-and-virtual-machine-settings/virtual-machine-settings/hardware-settings/serial-port-settings)).
- Windows 11 on ARM runs ordinary x86 and x64 user-mode applications under
  built-in emulation, so an older Win32 TYT CPS is plausible without a separate
  Intel Windows installation. Kernel drivers are the important exception
  ([Microsoft's Windows-on-ARM documentation](https://learn.microsoft.com/en-ca/windows/arm/apps-on-arm-x86-emulation)).
- Electronic Team explicitly supports Windows on ARM, Bluetooth serial ports,
  capture of ports used by another application, full-duplex traffic, binary or
  hex data, timestamps, control lines, and raw-data export
  ([current product guide](https://help.electronic.us/support/solutions/articles/44002214665-introduction-to-serial-port-monitor)).
  The current download is a fully functional 14-day trial
  ([download page](https://www.electronic.us/products/serial-port-monitor/download/)).

Parallels 26 removed shared Bluetooth passthrough. That does **not** block the
host-serial plan because the radio is paired by macOS and exposed as a host
serial device.
If direct Bluetooth ownership by Windows is needed later, Parallels recommends
a USB Bluetooth dongle instead
([Parallels 26 change note](https://docs.parallels.com/landing/pdfm-ug/parallels-desktop-for-mac-26-users-guide/readme/whats-new-in-parallels-desktop-26)).

## CrossOver setup and capture

1. Install a CrossOver trial and create a Windows bottle for the official TYT
   CPS. First confirm that the CPS installs and launches; do not connect to or
   write the Radio during this compatibility check.
2. Pair the radio with macOS in Slave/Peripheral mode with CI-T Bluetooth SPP
   enabled. Confirm that `/dev/cu.ET25SE...` exists. Leave USB disconnected.
3. Create a temporary PTY and start a `socat -x -v` relay between it and the
   real `/dev/cu.ET25SE...` port. Preserve `socat`'s diagnostic output in a log;
   its `>` and `<` records distinguish the two byte directions. The exact PTY
   path should be generated for this test rather than hard-coded in project
   configuration.
4. In the CrossOver bottle, follow CodeWeavers' documented
   `HKEY_LOCAL_MACHINE > Software > Wine > Ports` procedure, but set `Com1` to
   the relay PTY instead of the physical ET25SE device. A direct mapping to the
   physical device would work for communication but would provide no place to
   intercept both directions.
5. Start the relay before launching TYT CPS. In TYT CPS select `COM1` and invoke
   **Read from Radio** once. Do not invoke Write/Program/Clone-to-Radio.
6. After success or timeout, close TYT CPS, stop the relay, and preserve the
   complete hex log plus the exact CPS result.

Do not try to open `/dev/cu.ET25SE...` with a second terminal while TYT CPS is
using it. Serial communication resources are normally opened exclusively; the
PTY relay is what provides a safe observation point
([Microsoft `CreateFile` communication-resource rules](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilea#communications-resources)).

## Parallels fallback setup

1. Pair the radio with macOS in Slave/Peripheral mode with CI-T Bluetooth SPP
   enabled. Confirm that `/dev/cu.ET25SE...` still exists. Leave USB disconnected.
2. Install or open a Windows 11 ARM VM in Parallels Desktop. Windows 11 ARM can
   emulate x86 and x64 user-mode software, but compatibility of this exact TYT
   CPS remains a test, not a guarantee.
3. Shut the VM down. In **Actions > Configure > Hardware**, add **Serial Port**.
4. Set **Source** to **Physical Serial Port**, choose `/dev/cu.ET25SE...`, and
   enable **Connected**. Parallels requires selecting the physical source before
   starting the VM.
5. Start Windows. In **Device Manager > Ports (COM & LPT)**, record the COM
   number assigned to the Parallels serial port, for example `COM1`.
6. Install the official TYT CPS and Electronic Team Serial Port Monitor 9.5.
   The monitor installs a signed driver, so run its installer as an
   administrator. Do not install the old Sysinternals Portmon for this test: its
   current Microsoft page still describes version 3.03 from 2012 and only
   documents Windows NT/2000-era use
   ([Microsoft Portmon page](https://learn.microsoft.com/en-us/sysinternals/downloads/portmon)).

## Parallels capture procedure

1. Keep the radio powered on, paired, and disconnected from USB.
2. Close the official TYT CPS if it is running.
3. Open Serial Port Monitor as administrator and create a monitoring session for
   the Parallels COM port. Enable the table/request view plus raw/hex data and
   record timestamps, `READ`, `WRITE`, serial configuration, and control-line
   changes.
4. Start monitoring **before** launching TYT CPS. This ensures the capture
   includes port open, baud/parity/data/stop-bit settings, DTR/RTS changes,
   timeouts, and the first transmitted bytes.
5. Launch TYT CPS, select the same COM port, and invoke **Read from Radio** once.
   Do not invoke Write/Program/Clone-to-Radio.
6. Wait for either a successful identity/read response or the TYT timeout. Stop
   monitoring immediately afterward.
7. Save the complete monitor session and export raw data if offered. Keep the
   directions distinct: CPS-to-radio `WRITE` and radio-to-CPS `READ`. Also save
   a screenshot showing the selected TYT COM port and final result.

Even a failed TYT read is useful. The capture will show whether TYT CPS sends
anything different from the browser's E0 request, changes baud rate or control
lines, sends a wake-up prefix, or receives bytes that our macOS test did not.

## What to return for analysis

- Serial Port Monitor's native session/log file.
- Raw or hex export with direction and timestamps preserved.
- The assigned Windows COM number.
- TYT CPS version and the exact Read result.
- Radio Bluetooth/module settings and firmware already recorded for the macOS
  test.

Do not post the capture publicly until it is checked for radio serial numbers,
Bluetooth addresses, or other identifiers.

## Alternatives

### Physical Windows computer

If one becomes available, this is the least layered setup: pair the ET25SE with
Windows, identify its outgoing Bluetooth SPP COM port, then use the same Serial
Port Monitor procedure. The monitor explicitly supports Bluetooth serial ports
and ports already used by another application. This removes VM forwarding as a
possible failure point.

### Windows VM with a USB Bluetooth dongle

Use this only if Parallels cannot open the macOS `/dev/cu.ET25SE...` device.
Parallels 26 recommends a USB Bluetooth dongle for direct VM Bluetooth access.
Pass the entire dongle to Windows, pair the radio inside Windows, identify the
SPP COM port, and capture it there. Confirm the dongle has a Windows ARM64
driver before buying it; Windows emulation does not run x86/x64 kernel drivers.

### Windows VM with direct Bluetooth capture

When Windows owns an external USB Bluetooth dongle, Wireshark 4.7.3 or later
can capture raw Bluetooth HCI traffic through `etwdump`: run Wireshark as
administrator, add the **Bluetooth Host Radio** provider, and start capture
before TYT CPS connects
([Wireshark Bluetooth capture setup](https://wiki.wireshark.org/CaptureSetup/Bluetooth)).
Wireshark supports L2CAP, RFCOMM, and SPP dissectors
([Wireshark Bluetooth protocols](https://wiki.wireshark.org/Bluetooth)). This is
deeper than COM-port capture and can establish whether Windows opened an RFCOMM
channel at all, but it requires a suitable USB dongle owned by the VM.

## Interpretation boundary

A successful official-CPS capture over the Parallels COM port proves that the
TYT application knows an activation or framing sequence missing from our
browser flow. A failed official-CPS capture, where TYT opens the port and sends
data but receives no reply, strongly supports the conclusion that this
radio/module firmware does not expose CPS programming over its normal SPP
connection. Failure before TYT opens the COM port proves only a VM or TYT-CPS
compatibility problem and says nothing about the radio protocol.
