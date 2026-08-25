const en = {
  metadataDescription:
    "Read, inspect, and manage a TYT UVL-15W Codeplug locally.",
  languageSwitcherLabel: "Language",
  languageTr: "Türkçe",
  languageEn: "English",
  sidebarTitle: "Navigation",
  sidebarDescription: "Shows the CPS navigation on mobile.",
  sidebarClose: "Close navigation",
  sidebarToggle: "Toggle navigation",
  navWorkspace: "Workspace",
  navRadio: "Radio",
  navChannels: "Channels",
  navZones: "Zones",
  navScanLists: "Scan Lists",
  navConfiguration: "Programming",
  navAprs: "APRS",
  navSettings: "Radio Settings",
  navData: "Codeplug Data",
  navBackups: "Backups",
  navDiagnostics: "Diagnostics",
  navAbout: "About",
  planned: "Planned",
  plannedUnavailable: "{item} is planned and not yet available.",
  localRadioWorkspace: "Local radio programming",
  workingCodeplugReady: "Working Codeplug ready",
  noWorkingCodeplug: "No Working Codeplug",
  workingCodeplug: "Working Codeplug",
  noCodeplug: "No Codeplug",
  radioReadInProgress: "Radio Read in progress",
  sessionStorage: "Stored for this session",
  ready: "Ready",
  empty: "Empty",
  readingRadio: "Reading Radio…",
  readingRadioPlain: "Reading Radio",
  readRadio: "Read Radio",
  readAgain: "Read Again",
  writeRadio: "Write Radio",
  writeRadioPlanned: "Write Radio is planned",
  noRadio: "No Radio",
  changesCount: "Changes: {count, number}",
  localSave: "Local save: {value}",
  sessionOnly: "Session only",
  noData: "No data",
  idle: "Idle",
  connecting: "Connecting",
  reading: "Reading",
  backupReady: "Backup ready",
  localConnection: "Direct USB connection",
  readEnabled: "Radio Read available",
  overviewDescription:
    "Check the Radio identity and make a complete, unchanged Codeplug Backup. Radio communication stays between this browser and your Radio.",
  webSerialUnavailable: "Web Serial is unavailable",
  webSerialHelp:
    "Open this CPS over a secure connection in Chrome, Edge, or another Chromium browser that supports Web Serial.",
  secureContextRequired: "A secure connection is required",
  secureContextHelp:
    "Open this CPS over HTTPS or on localhost before using Radio operations.",
  radioReadStopped: "Radio Read stopped",
  radioInformation: "Radio identity",
  radioInformationDescription:
    "Information reported directly by the Radio during the connection handshake.",
  noRadioInformation: "No Radio identity available",
  noRadioInformationDescription:
    "Run a Radio Read to verify the Source Radio and create a Working Codeplug from an immutable Baseline Backup.",
  serialNumber: "Serial number",
  firmware: "Firmware version",
  hardware: "Hardware version",
  imageResources: "Image resource version",
  notReported: "Not reported",
  sourceRadioVerified: "Source Radio verified by handshake",
  readProtection: "Read protection",
  writeProtection: "Write protection",
  technicalDetails: "Technical details",
  subModel: "Sub-model",
  bootloaderModel: "Bootloader model",
  cpuId: "CPU ID",
  on: "On",
  off: "Off",
  workingCodeplugDescription:
    "Editable Codeplug created from the latest complete Radio Read.",
  readingCodeplug: "Reading Codeplug",
  baselineBackup: "Baseline Backup",
  notCreated: "Not created",
  readyToInspect: "Ready to inspect",
  none: "None",
  pendingChanges: "Pending changes",
  localPersistence: "Local storage",
  codeplugBackupReady: "Codeplug Backup ready",
  codeplugBackupValidated:
    "The complete 102,400-byte Codeplug passed protocol validation.",
  rawBackup: "Download Raw Backup",
  noRadioSelected: "No Radio was selected.",
  serialPermissionDenied:
    "Serial-port access was blocked. Allow this CPS to use the Radio's USB port and try again.",
  serialPortUnavailable:
    "The selected serial port could not be opened. Close other programming software, reconnect the Radio, and try again.",
  serialConnectionClosed:
    "The USB serial connection closed. Reconnect the Radio before starting another Radio Read.",
  serialStreamsUnavailable:
    "The selected USB port does not provide the data streams required for Radio programming.",
  radioAlreadyConnected: "A Radio is already connected to this CPS.",
  radioNotConnected: "Connect a Radio before starting a Radio Read.",
  radioOperationInProgress: "Another Radio operation is already in progress.",
  radioConnectionClosed:
    "The Radio connection closed during the operation. Reconnect the Radio and run the Radio Read again.",
  radioResponseTimeout:
    "The Radio did not respond in time. Check the USB cable and Radio connection, then try again.",
  radioProtocolError:
    "The Radio returned invalid data. No Codeplug Backup was created; reconnect it and try the Radio Read again.",
  incompatibleRadio:
    "The connected Radio is not a TYT UVL-15W and cannot be read by this CPS.",
  readPasswordRequired:
    "This Radio has read protection enabled. Password-protected Radio Reads are not supported yet.",
  unexpectedRadioResponse:
    "The Radio sent an unexpected response. No Codeplug Backup was created; reconnect it and try again.",
  unknownRadioError: "An unknown Radio error occurred.",
} as const

export type Messages = { [Key in keyof typeof en]: string }

export default en
