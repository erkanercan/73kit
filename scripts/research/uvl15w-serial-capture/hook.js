"use strict"

const SERIAL_MODULE = "Qt6SerialPort.dll"
const CORE_MODULE = "Qt6Core.dll"
const MAX_CAPTURE_BYTES = 16 * 1024 * 1024
const CPS_TRANSFORM_RVA = 0x92080
const MIN_TRANSFORM_INPUT_CHARS = 64
const HOOK_VERSION = 3

const SYMBOLS = {
  readData: "_ZN11QSerialPort8readDataEPcx",
  writeData: "_ZN11QSerialPort9writeDataEPKcx",
  open: "_ZN11QSerialPort4openE6QFlagsIN13QIODeviceBase12OpenModeFlagEE",
  close: "_ZN11QSerialPort5closeEv",
  setBaudRate: "_ZN11QSerialPort11setBaudRateEi6QFlagsINS_9DirectionEE",
  setDataBits: "_ZN11QSerialPort11setDataBitsENS_8DataBitsE",
  setStopBits: "_ZN11QSerialPort11setStopBitsENS_8StopBitsE",
  setParity: "_ZN11QSerialPort9setParityENS_6ParityE",
  setFlowControl: "_ZN11QSerialPort14setFlowControlENS_11FlowControlE",
  setRequestToSend: "_ZN11QSerialPort16setRequestToSendEb",
  setDataTerminalReady: "_ZN11QSerialPort20setDataTerminalReadyEb",
  setBreakEnabled: "_ZN11QSerialPort15setBreakEnabledEb",
}

let installed = false
let transformCaptured = false
let resourceFlashCallsiteCaptured = false
let resourceFlashCpsCallsiteCaptured = false
const serialPortObjects = new Set()

function emit(event, data) {
  send(
    {
      timestampMs: Date.now(),
      ...event,
    },
    data
  )
}

function hookEvent(module, symbol, name, readArgs) {
  const address = module.findExportByName(symbol)
  if (address === null) {
    emit({ type: "warning", message: `Missing export: ${name}` })
    return
  }

  Interceptor.attach(address, {
    onEnter(args) {
      emit({
        type: "serial-setting",
        name,
        portObject: args[0].toString(),
        ...readArgs(args),
      })
    },
  })
}

function readQString(value) {
  const data = value.add(Process.pointerSize).readPointer()
  const length = Number(value.add(Process.pointerSize * 2).readU64())

  if (length < 0 || length > MAX_CAPTURE_BYTES / 2) {
    throw new Error(`Invalid QString length: ${length}`)
  }

  return length === 0 ? "" : data.readUtf16String(length)
}

function readQByteArray(value) {
  const data = value.add(Process.pointerSize).readPointer()
  const length = Number(value.add(Process.pointerSize * 2).readU64())

  if (length < 0 || length > MAX_CAPTURE_BYTES) {
    throw new Error(`Invalid QByteArray length: ${length}`)
  }

  return { data, length }
}

function requestCommand(buffer, length) {
  if (length < 5) return null

  let index = 0
  while (index < length && buffer.add(index).readU8() === 0xfe) index += 1

  if (
    index + 2 >= length ||
    buffer.add(index).readU8() !== 0xee ||
    buffer.add(index + 1).readU8() !== 0xef
  ) {
    return null
  }

  return buffer.add(index + 2).readU8()
}

function relativeAddress(address) {
  const ownerModule = Process.enumerateModules().find(
    (candidate) =>
      address.compare(candidate.base) >= 0 &&
      address.compare(candidate.base.add(candidate.size)) < 0
  )

  return {
    module: ownerModule?.name ?? null,
    rva:
      ownerModule === undefined
        ? null
        : address.sub(ownerModule.base).toString(),
  }
}

function emitResourceFlashCpsCallsite(buffer, length, returnAddress, overload) {
  if (
    resourceFlashCpsCallsiteCaptured ||
    requestCommand(buffer, length) !== 0xe3
  ) {
    return
  }

  resourceFlashCpsCallsiteCaptured = true
  emit({
    type: "resource-flash-start-cps-callsite",
    hookVersion: HOOK_VERSION,
    overload,
    caller: relativeAddress(returnAddress),
  })
}

function installFirmwareTransformHook() {
  const mainModule = Process.mainModule
  const address = mainModule.base.add(CPS_TRANSFORM_RVA)

  Interceptor.attach(address, {
    onEnter(args) {
      this.capture = false
      if (transformCaptured) return

      try {
        // MinGW x64 non-trivial return ABI:
        // RCX = QString result storage, RDX = input hex QString,
        // R8D = extra round count, R9 = key hex QString.
        const inputHex = readQString(args[1])
        if (inputHex.length < MIN_TRANSFORM_INPUT_CHARS) return

        this.capture = true
        this.resultStorage = args[0]
        this.inputHex = inputHex
        this.keyHex = readQString(args[3])
        this.extraRounds = args[2].toInt32()
        transformCaptured = true
      } catch (error) {
        emit({
          type: "warning",
          message: `Failed to read firmware transform arguments: ${error}`,
        })
      }
    },
    onLeave() {
      if (!this.capture) return

      try {
        emit({
          type: "firmware-transform",
          functionRva: `0x${CPS_TRANSFORM_RVA.toString(16)}`,
          inputHex: this.inputHex,
          keyHex: this.keyHex,
          extraRounds: this.extraRounds,
          outputHex: readQString(this.resultStorage),
        })
      } catch (error) {
        emit({
          type: "warning",
          message: `Failed to read firmware transform result: ${error}`,
        })
      }
    },
  })
}

function installHooks() {
  if (installed) return

  const serialModule = Process.findModuleByName(SERIAL_MODULE)
  if (serialModule === null) return

  installed = true

  installFirmwareTransformHook()

  const writeAddress = serialModule.findExportByName(SYMBOLS.writeData)
  const readAddress = serialModule.findExportByName(SYMBOLS.readData)

  if (writeAddress === null || readAddress === null) {
    emit({
      type: "fatal",
      message: "Qt6SerialPort readData/writeData exports were not found",
    })
    return
  }

  Interceptor.attach(writeAddress, {
    onEnter(args) {
      const length = args[2].toInt32()
      if (length <= 0 || length > MAX_CAPTURE_BYTES) return

      if (
        !resourceFlashCallsiteCaptured &&
        requestCommand(args[1], length) === 0xe3
      ) {
        resourceFlashCallsiteCaptured = true
        emit({
          type: "resource-flash-start-callsite",
          hookVersion: HOOK_VERSION,
          caller: relativeAddress(this.returnAddress),
        })
      }

      emit(
        {
          type: "serial-data",
          direction: "tx",
          length,
          portObject: args[0].toString(),
        },
        args[1].readByteArray(length)
      )
    },
  })

  Interceptor.attach(readAddress, {
    onEnter(args) {
      this.portObject = args[0].toString()
      this.buffer = args[1]
      this.maximumLength = args[2].toInt32()
    },
    onLeave(returnValue) {
      const length = returnValue.toInt32()
      if (
        length <= 0 ||
        length > this.maximumLength ||
        length > MAX_CAPTURE_BYTES
      ) {
        return
      }

      emit(
        {
          type: "serial-data",
          direction: "rx",
          length,
          portObject: this.portObject,
        },
        this.buffer.readByteArray(length)
      )
    },
  })

  // In buffered mode QSerialPort's Windows backend fills QIODevice's internal
  // buffer directly. The CPS then consumes that buffer through QIODevice, so
  // QSerialPort::readData() is not necessarily called for received bytes.
  const coreModule = Process.findModuleByName(CORE_MODULE)

  const ioWriteBufferAddress = coreModule?.findExportByName(
    "_ZN9QIODevice5writeEPKcx"
  )
  if (ioWriteBufferAddress === null || ioWriteBufferAddress === undefined) {
    emit({
      type: "warning",
      message: "Missing export: QIODevice::write(buffer)",
    })
  } else {
    Interceptor.attach(ioWriteBufferAddress, {
      onEnter(args) {
        const portObject = args[0].toString()
        if (!serialPortObjects.has(portObject)) return

        const length = args[2].toInt32()
        if (length <= 0 || length > MAX_CAPTURE_BYTES) return
        emitResourceFlashCpsCallsite(
          args[1],
          length,
          this.returnAddress,
          "QIODevice::write(const char*,qint64)"
        )
      },
    })
  }

  const ioWriteByteArrayAddress = coreModule?.findExportByName(
    "_ZN9QIODevice5writeERK10QByteArray"
  )
  if (
    ioWriteByteArrayAddress === null ||
    ioWriteByteArrayAddress === undefined
  ) {
    emit({
      type: "warning",
      message: "Missing export: QIODevice::write(QByteArray)",
    })
  } else {
    Interceptor.attach(ioWriteByteArrayAddress, {
      onEnter(args) {
        const portObject = args[0].toString()
        if (!serialPortObjects.has(portObject)) return

        try {
          const value = readQByteArray(args[1])
          if (value.length <= 0) return
          emitResourceFlashCpsCallsite(
            value.data,
            value.length,
            this.returnAddress,
            "QIODevice::write(const QByteArray&)"
          )
        } catch (error) {
          emit({
            type: "warning",
            message: `Failed to inspect QIODevice::write(QByteArray): ${error}`,
          })
        }
      },
    })
  }

  function hookBufferRead(symbol, readMethod) {
    const address = coreModule?.findExportByName(symbol)
    if (address === null || address === undefined) {
      emit({ type: "warning", message: `Missing export: ${readMethod}` })
      return
    }

    Interceptor.attach(address, {
      onEnter(args) {
        this.portObject = args[0].toString()
        this.buffer = args[1]
        this.maximumLength = args[2].toInt32()
        this.isSerialPort = serialPortObjects.has(this.portObject)
      },
      onLeave(returnValue) {
        if (!this.isSerialPort) return

        const length = returnValue.toInt32()
        if (
          length <= 0 ||
          length > this.maximumLength ||
          length > MAX_CAPTURE_BYTES
        ) {
          return
        }

        emit(
          {
            type: "serial-data",
            direction: "rx",
            length,
            portObject: this.portObject,
            readMethod,
          },
          this.buffer.readByteArray(length)
        )
      },
    })
  }

  hookBufferRead("_ZN9QIODevice4readEPcx", "QIODevice::read(char*,qint64)")
  hookBufferRead(
    "_ZN9QIODevice8readLineEPcx",
    "QIODevice::readLine(char*,qint64)"
  )

  const readAllAddress = coreModule?.findExportByName("_ZN9QIODevice7readAllEv")

  if (readAllAddress === null || readAllAddress === undefined) {
    emit({ type: "warning", message: "Missing export: QIODevice::readAll" })
  } else {
    Interceptor.attach(readAllAddress, {
      onEnter(args) {
        // MinGW x64 uses an implicit return-storage pointer for QByteArray:
        // RCX = QByteArray result storage, RDX = QIODevice this.
        this.resultStorage = args[0]
        this.portObject = args[1].toString()
        this.isSerialPort = serialPortObjects.has(this.portObject)
      },
      onLeave() {
        if (!this.isSerialPort) return

        try {
          // Qt 6 QByteArray contains QArrayDataPointer<char>:
          // allocation pointer, data pointer, then qsizetype length.
          const data = this.resultStorage.add(Process.pointerSize).readPointer()
          const lengthValue = this.resultStorage
            .add(Process.pointerSize * 2)
            .readU64()
          const length = Number(lengthValue)

          if (length <= 0 || length > MAX_CAPTURE_BYTES) return

          emit(
            {
              type: "serial-data",
              direction: "rx",
              length,
              portObject: this.portObject,
              readMethod: "QIODevice::readAll",
            },
            data.readByteArray(length)
          )
        } catch (error) {
          emit({
            type: "warning",
            message: `Failed to capture QIODevice::readAll result: ${error}`,
          })
        }
      },
    })
  }

  const openAddress = module.findExportByName(SYMBOLS.open)
  if (openAddress === null) {
    emit({ type: "warning", message: "Missing export: open" })
  } else {
    Interceptor.attach(openAddress, {
      onEnter(args) {
        this.portObject = args[0].toString()
        this.openMode = args[1].toInt32()
      },
      onLeave(returnValue) {
        const succeeded = returnValue.toInt32() !== 0
        if (succeeded) serialPortObjects.add(this.portObject)
        emit({
          type: "serial-setting",
          name: "open",
          portObject: this.portObject,
          openMode: this.openMode,
          succeeded,
        })
      },
    })
  }

  const closeAddress = module.findExportByName(SYMBOLS.close)
  if (closeAddress === null) {
    emit({ type: "warning", message: "Missing export: close" })
  } else {
    Interceptor.attach(closeAddress, {
      onEnter(args) {
        const portObject = args[0].toString()
        serialPortObjects.delete(portObject)
        emit({ type: "serial-setting", name: "close", portObject })
      },
    })
  }
  hookEvent(module, SYMBOLS.setBaudRate, "setBaudRate", (args) => ({
    baudRate: args[1].toInt32(),
    directions: args[2].toInt32(),
  }))
  hookEvent(module, SYMBOLS.setDataBits, "setDataBits", (args) => ({
    value: args[1].toInt32(),
  }))
  hookEvent(module, SYMBOLS.setStopBits, "setStopBits", (args) => ({
    value: args[1].toInt32(),
  }))
  hookEvent(module, SYMBOLS.setParity, "setParity", (args) => ({
    value: args[1].toInt32(),
  }))
  hookEvent(module, SYMBOLS.setFlowControl, "setFlowControl", (args) => ({
    value: args[1].toInt32(),
  }))
  hookEvent(module, SYMBOLS.setRequestToSend, "setRequestToSend", (args) => ({
    value: args[1].toInt32() !== 0,
  }))
  hookEvent(
    module,
    SYMBOLS.setDataTerminalReady,
    "setDataTerminalReady",
    (args) => ({ value: args[1].toInt32() !== 0 })
  )
  hookEvent(module, SYMBOLS.setBreakEnabled, "setBreakEnabled", (args) => ({
    value: args[1].toInt32() !== 0,
  }))

  emit({
    type: "ready",
    message: `Qt6SerialPort capture hooks installed (hook v${HOOK_VERSION})`,
    hookVersion: HOOK_VERSION,
    processArchitecture: Process.arch,
    moduleBase: module.base.toString(),
  })
}

const installTimer = setInterval(() => {
  installHooks()
  if (installed) clearInterval(installTimer)
}, 25)
