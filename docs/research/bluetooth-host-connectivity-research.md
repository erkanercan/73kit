# UVL-15W Bluetooth Host Connectivity Research

Date: 2026-08-27

## Answer

**Final test status: Bluetooth CPS Radio Read/programming is unverified and did
not work in the tested setup. Treat it as unsupported and unverified. Do not
claim that Radio Read or Radio Write works over Bluetooth. USB Radio Read is
proven. These tests do not prove that the radio lacks Bluetooth CPS support.**

The radio paired with macOS and exposed Bluetooth Classic serial endpoints,
but it returned no bytes to the browser CPS identity request. The identical
request received the expected identity response immediately over USB. Attempts
to use the official TYT CPS through CrossOver and a Parallels virtual serial
bridge were blocked before the official CPS opened the Bluetooth-backed port.
Consequently, this test does not prove that the radio firmware rejects CPS over
SPP; it proves only that none of the tested host paths established a working
Bluetooth CPS session.

- **Windows and macOS are plausible for Bluetooth Classic SPP.** The supplied
  TYT communication specification names the ET25SE Bluetooth
  transparent-serial module as an alternative transport for the same binary CPS
  protocol used over USB
  ([protocol overview](../technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md#11-core-characteristics)).
  Chrome 117 and later can expose paired Bluetooth Classic RFCOMM/SPP services
  through Web Serial on desktop
  ([Chrome's serial-over-Bluetooth documentation](https://developer.chrome.com/blog/serial-over-bluetooth/)).
  Chrome documents Web Serial itself on ChromeOS, Linux, macOS, and Windows
  ([Web Serial browser support](https://developer.chrome.com/docs/capabilities/serial/#browser-support)).
- **BLE will not work with the current application.** The Codeplug has switches
  for both CI-T Bluetooth SPP and BLE, but the application implements only a
  Web Serial transport. There is no Web Bluetooth/GATT transport
  ([Function Settings codec](../../modules/codeplug/function-settings.ts),
  [Web Serial adapter](../../adapters/web-serial/index.ts)).
- **Bluetooth SPP appeared as macOS serial endpoints, but CPS communication did
  not complete.** The paired radio exposed both `/dev/cu.ET25SE...` and
  `/dev/tty.ET25SE...`. Direct tests of the current E0 identity request through
  the `cu` endpoint at 9600 and 115200 baud, and through the `tty` endpoint at
  9600 baud, received zero bytes. Pairing and serial endpoint creation therefore
  do not demonstrate CPS compatibility.
- **The application cannot write/program the physical radio today over any
  transport.** It can connect to and read the Radio, then edit the Working
  Codeplug locally. Its Radio interface exposes `connect`, `read`, and
  `disconnect`, but no write operation
  ([Radio interface](../../modules/uvl15w-radio/index.ts),
  [current UI read flow](../../components/cps-workspace-provider.tsx)). USB CDC
  in Chrome on macOS is the only repository-documented, hardware-proven Radio
  transport
  ([feature reference](../CPS_FEATURE_REFERENCE.md#31-browser--radio-connection--proven-transport)).

## Completed hardware test

The following matrix records observations from the 2026-08-27 test. “No bytes”
means the serial port opened and the request was transmitted, but the receive
buffer remained empty through the timeout.

| Host and transport                              | Test                                                                                      | Observed result                                                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| macOS Bluetooth SPP                             | Pair radio in Slave/Peripheral mode with CI-T Bluetooth SPP enabled                       | `/dev/cu.ET25SE...` and `/dev/tty.ET25SE...` were created                                                             |
| macOS Bluetooth SPP                             | Send E0 identity frame at 9600 baud through `cu` endpoint                                 | No bytes received                                                                                                     |
| macOS Bluetooth SPP                             | Send E0 identity frame at 115200 baud through `cu` endpoint                               | No bytes received                                                                                                     |
| macOS Bluetooth SPP                             | Send E0 identity frame at 9600 baud through `tty` endpoint                                | No bytes received                                                                                                     |
| macOS Bluetooth SPP                             | Open the port, wait five seconds, then send E0                                            | No bytes received; post-open settling did not change the result                                                       |
| macOS USB CDC                                   | Send the identical E0 identity frame at 115200 baud                                       | Complete E1 identity response received immediately                                                                    |
| CrossOver, mapped serial                        | Map a PTY as `COM1` and test the official TYT CPS                                         | The CPS COM selector did not open and did not enumerate the mapped port                                               |
| CrossOver, real USB mapping                     | Map the hardware-proven USB serial device as `COM1`                                       | The CPS COM selector still did not open; this isolates the failure to CrossOver/CPS enumeration rather than Bluetooth |
| Parallels Windows 11 ARM, real USB              | Pass the TYT USB device directly to Windows as `COM3` and run official TYT CPS Radio Read | `COM3` appeared in the CPS and Radio Read completed successfully                                                      |
| Parallels Windows 11 ARM, virtual serial bridge | Add the Bluetooth-backed Parallels socket serial port as generic `COM1`                   | Windows exposed `ARM PL011 Serial Port Device (COM1)`, but the official CPS did not list/select it or write bytes     |
| Parallels Windows 11 ARM, Mac Bluetooth sharing | Attempt to give the VM direct ownership of the Mac Bluetooth adapter                      | Not available in Parallels Desktop 26                                                                                 |
| Parallels Windows 11 ARM, USB Bluetooth         | Pass a USB Bluetooth adapter directly to Windows                                          | Not tested; no USB Bluetooth dongle was available                                                                     |

These results establish that the current E0 frame and radio CPS protocol work
over USB, and that the official CPS runs under Windows 11 ARM when it sees the
real TYT USB device. They do **not** establish why Bluetooth SPP stayed silent.

## Interpretation boundary

Observed facts:

- macOS paired with the radio and created Classic serial endpoints.
- The tested Bluetooth endpoints returned no bytes for the E0 identity request.
- The same radio and request returned E1 over USB.
- Official TYT CPS completed Radio Read over real USB `COM3` in Windows.
- Official TYT CPS did not expose the CrossOver-mapped port or the Parallels
  generic virtual `COM1`, so no official-CPS Bluetooth request was captured.

Possible explanations, none proven by this test:

- Bluetooth SPP is intended for another data function, such as TNC/APRS, rather
  than CPS programming.
- The official CPS uses an undocumented Bluetooth activation sequence, serial
  control-line behavior, or device-identification check.
- The ET25SE module or tested firmware configuration requires another
  radio-side state before forwarding CPS frames.

Because the official CPS never opened a Bluetooth-backed COM port, the test
cannot distinguish among these explanations.

## What the radio's Bluetooth menu proves

The manufacturer-filed UVL-15W manual documents Bluetooth headset pairing,
Bluetooth PTT pairing, a paired-headset history, and Bluetooth module status.
It does **not** document pairing a Mac or Windows PC, a desktop programming
workflow, an SPP service UUID, or a BLE GATT service
([UVL-15W user manual, printed pages 22-24](https://fccid.io/2BLTR-UVL15W/User-Manual/13-UVL-15W-Users-Manual-9378982.pdf)).
Therefore headset/PTT support must not be presented as proof of desktop CPS
connectivity.

Separately, the supplied storage reference exposes CI-T USB CDC, Bluetooth SPP,
and Bluetooth BLE switches
([Function Settings data interfaces](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md#222-function-settings)).
Those settings prove that the firmware models Bluetooth data interfaces, but
they do not establish the host pairing procedure or browser compatibility.

## Current compatibility assessment

| Path                         | macOS                                                        | Windows                                                                                                          | This application today                                  |
| ---------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| USB CDC                      | Hardware-proven in Chrome                                    | Hardware-proven with official TYT CPS on Windows 11 ARM through Parallels USB passthrough                        | Radio Read works; physical Radio Write is absent        |
| Bluetooth Classic SPP/RFCOMM | Pairing and serial endpoints proven; E0 received no response | Not directly tested with a Windows-owned Bluetooth adapter; the generic Parallels `COM1` was filtered by TYT CPS | Radio Read did not complete; unsupported and unverified |
| Bluetooth LE/GATT            | Host OS supports BLE in general                              | Host OS supports BLE in general                                                                                  | No transport implementation; will not work              |
| Bluetooth headset/PTT        | Desktop compatibility not documented by TYT                  | Desktop compatibility not documented by TYT                                                                      | Accessory feature only; not a CPS transport             |

## Why the remaining Windows test was not run

CodeWeavers documents Wine serial-to-COM mapping only as a workaround and warns
that it does not work for every application or device
([CodeWeavers serial-device guidance](https://support.codeweavers.com/en_US/using-usb-devices-with-crossover)).
That limitation was encountered here even with the known-good USB device.

Parallels Desktop 26 removed Mac Bluetooth sharing. Its documented replacement
for a VM that needs direct Bluetooth access is a USB Bluetooth adapter passed
to Windows
([Parallels Desktop 26 change note](https://docs.parallels.com/landing/pdfm-ug/parallels-desktop-for-mac-26-users-guide/readme/whats-new-in-parallels-desktop-26)).
No such adapter was available, so Windows could not pair with and own the
radio's SPP service directly.

If this investigation resumes, the smallest useful next test is a physical
Windows computer or the existing Windows 11 ARM VM with a compatible USB
Bluetooth dongle. Pair the radio inside Windows, verify that the TYT CPS lists
the resulting Bluetooth SPP COM port, and perform one read-only Radio Read. For
deeper evidence, Wireshark 4.7.3 or later can capture Windows Bluetooth HCI
traffic through `etwdump` when Windows owns the Bluetooth adapter
([Wireshark Bluetooth capture setup](https://wiki.wireshark.org/CaptureSetup/Bluetooth)).
Until that test succeeds, Bluetooth CPS support remains **unsupported and
unverified**.
