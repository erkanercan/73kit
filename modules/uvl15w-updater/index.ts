import {
  ResponseFrameDecoder,
  encodeRequestFrame,
  encodeResponseFrame,
  type FrameDecodeEvent,
} from "../uvl15w-radio/protocol.ts"
import type {
  RadioConnection,
  RadioTransport,
} from "../uvl15w-radio/transport.ts"
import {
  xxteaEncrypt,
  type UpdateRadioCompatibility,
  type ValidatedFirmwarePackage,
  type ValidatedResourcePackage,
  type ValidatedUpdatePackage,
} from "../update-package/index.ts"

const COMMAND = {
  ready: 0x9c,
  identify: 0xc0,
  identifyResponse: 0x0c,
  information: 0xc1,
  informationResponse: 0x1c,
  firmwareBlock: 0xc2,
  firmwareBlockResponse: 0x2c,
  firmwareVerify: 0xc3,
  firmwareVerifyResponse: 0x3c,
  complete: 0xc4,
  completeResponse: 0x4c,
  resourceStart: 0xe3,
  resourceBlock: 0xe4,
  resourceComplete: 0xe5,
  resourceBlockResponse: 0xe6,
  error: 0xee,
} as const

const encoder = new TextEncoder()
const decoder = new TextDecoder("ascii")

type UpdateTransferPhase =
  "connecting" | "handshake" | "transferring" | "verifying" | "finalizing"

interface UpdateTransferProgress {
  readonly phase: UpdateTransferPhase
  readonly completedBlocks: number
  readonly totalBlocks: number
  readonly percent: number
  readonly lastAcknowledgedAddress?: number
  readonly destructiveStarted: boolean
  readonly radioFingerprint?: string
}

interface UpdateTransferResult {
  readonly kind: ValidatedUpdatePackage["kind"]
  readonly packageSha256: string
  readonly expectedFirmwareVersion?: string
  readonly expectedImageVersion?: string
  readonly expectedLanguageVersion?: string
  readonly requiresLanguageConfirmation: boolean
  readonly radioFingerprint: string
}

interface Uvl15wUpdaterOptions {
  readonly responseTimeoutMs?: number
  readonly compatibilityPolicy?: UpdateCompatibilityPolicy
}

type UpdateCompatibilityPolicy = UpdateRadioCompatibility

interface UpdateTransferOptions {
  readonly onProgress?: (progress: UpdateTransferProgress) => void
  readonly onDebugEvent?: (event: UpdateDebugEvent) => void
  readonly recovery?: boolean
}

interface UpdateDebugEvent {
  readonly sequence: number
  readonly elapsedMs: number
  readonly kind: "session" | "phase" | "frame" | "serial" | "error" | "retry"
  readonly direction?: "tx" | "rx"
  readonly command?: number
  readonly commandLabel?: string
  readonly code?: Uvl15wUpdaterErrorCode
  readonly detail: string
  readonly frameHex?: string
}

type Uvl15wUpdaterErrorCode =
  | "not-connected"
  | "connection-closed"
  | "response-timeout"
  | "protocol"
  | "unexpected-response"
  | "radio-frame-head"
  | "radio-frame-tail"
  | "radio-frame-length"
  | "radio-frame-lrc"
  | "radio-option-value"
  | "unsupported-recovery"
  | "incompatible-radio"

class Uvl15wUpdaterError extends Error {
  readonly code: Uvl15wUpdaterErrorCode
  readonly outcomeUnknown: boolean
  readonly recovery?: UpdateRecoveryDetails

  constructor(
    code: Uvl15wUpdaterErrorCode,
    message: string,
    outcomeUnknown = false,
    recovery?: UpdateRecoveryDetails,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = "Uvl15wUpdaterError"
    this.code = code
    this.outcomeUnknown = outcomeUnknown
    this.recovery = recovery
  }
}

class FrameInbox {
  #events: FrameDecodeEvent[] = []
  #waiter:
    | {
        resolve(event: FrameDecodeEvent): void
        reject(error: Error): void
      }
    | undefined
  #fatalError: Error | undefined

  push(event: FrameDecodeEvent) {
    if (this.#waiter) {
      const waiter = this.#waiter
      this.#waiter = undefined
      waiter.resolve(event)
    } else {
      this.#events.push(event)
    }
  }

  fail(error: Error) {
    this.#fatalError = error
    if (this.#waiter) {
      const waiter = this.#waiter
      this.#waiter = undefined
      waiter.reject(error)
    }
  }

  next(timeoutMs: number) {
    const event = this.#events.shift()
    if (event) return Promise.resolve(event)
    if (this.#fatalError) return Promise.reject(this.#fatalError)

    return new Promise<FrameDecodeEvent>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#waiter = undefined
        reject(
          new Uvl15wUpdaterError(
            "response-timeout",
            `The Radio did not respond within ${timeoutMs} ms`
          )
        )
      }, timeoutMs)

      this.#waiter = {
        resolve: (nextEvent) => {
          clearTimeout(timeout)
          resolve(nextEvent)
        },
        reject: (error) => {
          clearTimeout(timeout)
          reject(error)
        },
      }
    })
  }
}

class Uvl15wUpdater {
  readonly #transport: RadioTransport
  readonly #responseTimeoutMs: number
  readonly #compatibilityPolicy?: UpdateCompatibilityPolicy
  #connection: RadioConnection | undefined
  #frameDecoder = new ResponseFrameDecoder()
  #inbox = new FrameInbox()
  #destructiveStarted = false
  #radioFingerprint: string | undefined
  #lastAcknowledgedBlock = 0
  #lastAcknowledgedAddress: number | undefined
  #lastPhase: UpdateTransferPhase = "connecting"
  #debugCallback: UpdateTransferOptions["onDebugEvent"]
  #debugStartedAt = 0
  #debugSequence = 0
  #traceRawTransfer = false

  constructor(transport: RadioTransport, options: Uvl15wUpdaterOptions = {}) {
    this.#transport = transport
    this.#responseTimeoutMs = options.responseTimeoutMs ?? 10_000
    this.#compatibilityPolicy = options.compatibilityPolicy
  }

  async update(
    updatePackage: ValidatedUpdatePackage,
    options: UpdateTransferOptions = {}
  ): Promise<UpdateTransferResult> {
    if (
      options.recovery &&
      (updatePackage.kind === "firmware" ||
        updatePackage.recoveryCompatibilityPayload === undefined)
    ) {
      throw new Uvl15wUpdaterError(
        "unsupported-recovery",
        "This exact package has no captured recovery procedure"
      )
    }

    this.#destructiveStarted = false
    this.#debugCallback = options.onDebugEvent
    this.#debugStartedAt = performance.now()
    this.#debugSequence = 0
    this.#traceRawTransfer = false
    this.#emitDebug({
      kind: "session",
      detail: `${updatePackage.kind} ${options.recovery ? "recovery" : "fresh"}; ${updatePackage.blockCount} blocks`,
    })
    this.#radioFingerprint = undefined
    this.#lastAcknowledgedBlock = 0
    this.#lastAcknowledgedAddress = undefined
    this.#lastPhase = "connecting"
    this.#report(options, "connecting", 0, updatePackage.blockCount, 0)

    try {
      this.#connection = await this.#transport.open()
      this.#frameDecoder = new ResponseFrameDecoder()
      this.#inbox = new FrameInbox()
      void this.#receiveContinuously(
        this.#connection,
        this.#frameDecoder,
        this.#inbox
      )

      this.#report(options, "handshake", 0, updatePackage.blockCount, 1)
      const handshake = await this.#handshake(
        this.#compatibilityPolicy ?? updatePackage.radioCompatibility
      )
      this.#radioFingerprint = handshake.radioFingerprint
      this.#report(options, "transferring", 0, updatePackage.blockCount, 3)

      if (updatePackage.kind === "firmware") {
        await this.#updateFirmware(updatePackage, handshake, options)
      } else {
        await this.#updateResource(updatePackage, options)
      }

      this.#report(
        options,
        "finalizing",
        updatePackage.blockCount,
        updatePackage.blockCount,
        98
      )
      await this.#handshake()
      await this.#exchange(COMMAND.complete, Uint8Array.of(0), {
        command: COMMAND.completeResponse,
        payload: Uint8Array.of(0, ...encoder.encode("OK")),
      })

      return {
        kind: updatePackage.kind,
        packageSha256: updatePackage.sha256,
        expectedFirmwareVersion: updatePackage.targets.firmware,
        expectedImageVersion: updatePackage.targets.image,
        expectedLanguageVersion: updatePackage.targets.language,
        requiresLanguageConfirmation:
          updatePackage.targets.language !== undefined,
        radioFingerprint: handshake.radioFingerprint,
      }
    } catch (cause) {
      if (cause instanceof Uvl15wUpdaterError) {
        throw new Uvl15wUpdaterError(
          cause.code,
          cause.message,
          cause.outcomeUnknown || this.#destructiveStarted,
          cause.recovery ?? this.#recoveryDetails(updatePackage),
          { cause }
        )
      }
      throw new Uvl15wUpdaterError(
        "protocol",
        cause instanceof Error
          ? cause.message
          : "The update stopped unexpectedly",
        this.#destructiveStarted,
        this.#recoveryDetails(updatePackage),
        { cause }
      )
    } finally {
      await this.disconnect().catch(() => undefined)
    }
  }

  async disconnect() {
    const connection = this.#connection
    this.#connection = undefined
    await connection?.close()
  }

  async #updateFirmware(
    updatePackage: ValidatedFirmwarePackage,
    handshake: HandshakeResult,
    options: UpdateTransferOptions
  ) {
    const body = updatePackage.bytes.slice(16)
    const totalBlocks = updatePackage.blockCount
    const key = deriveFirmwareKey(handshake)

    this.#traceRawTransfer = true
    try {
      for (let index = 0; index < totalBlocks; index += 1) {
        const block = body.slice(
          index * 512,
          Math.min((index + 1) * 512, body.length)
        )
        const encrypted = xxteaEncrypt(block, key)
        const payload = new Uint8Array(6 + encrypted.byteLength)
        const view = new DataView(payload.buffer)
        view.setUint16(0, totalBlocks, false)
        view.setUint16(2, index + 1, false)
        view.setUint16(4, encrypted.byteLength, false)
        payload.set(encrypted, 6)

        this.#destructiveStarted = true
        if (index === 0) {
          this.#report(options, "transferring", 0, totalBlocks, 3)
        }
        await this.#exchangeRetriableBlock(
          COMMAND.firmwareBlock,
          "Firmware",
          payload,
          {
            command: COMMAND.firmwareBlockResponse,
            payload: encoder.encode("OK"),
          }
        )
        this.#lastAcknowledgedBlock = index + 1
        this.#report(
          options,
          "transferring",
          index + 1,
          totalBlocks,
          transferPercent(index + 1, totalBlocks)
        )
      }
    } finally {
      this.#traceRawTransfer = false
      key.fill(0)
    }

    this.#report(options, "verifying", totalBlocks, totalBlocks, 96)
    const verification = new Uint8Array(8)
    verification.set(updatePackage.bytes.slice(16, 20), 0)
    verification.set(updatePackage.bytes.slice(16, 20), 4)
    await this.#exchange(COMMAND.firmwareVerify, packedTime(new Date()), {
      command: COMMAND.firmwareVerifyResponse,
      payload: verification,
    })
  }

  async #updateResource(
    updatePackage: ValidatedResourcePackage,
    options: UpdateTransferOptions
  ) {
    const startPayload = options.recovery
      ? updatePackage.recoveryCompatibilityPayload
      : updatePackage.compatibilityPayload
    if (!startPayload) {
      throw new Uvl15wUpdaterError(
        "unsupported-recovery",
        "This exact package has no captured recovery procedure"
      )
    }
    await this.#exchange(COMMAND.resourceStart, startPayload, {
      command: COMMAND.resourceStart,
      payload: encoder.encode("WRITE START OK"),
    })
    this.#destructiveStarted = true
    this.#report(options, "transferring", 0, updatePackage.blockCount, 3)

    this.#traceRawTransfer = true
    try {
      for (let index = 0; index < updatePackage.blockCount; index += 1) {
        const data = updatePackage.bytes.slice(
          index * 512,
          Math.min((index + 1) * 512, updatePackage.bytes.byteLength)
        )
        const address = updatePackage.startAddress + index * 512
        const payload = new Uint8Array(6 + data.byteLength)
        const view = new DataView(payload.buffer)
        view.setUint32(0, address, false)
        view.setUint16(4, 512, false)
        payload.set(data, 6)

        const acknowledgement = new Uint8Array(11)
        acknowledgement.set(encoder.encode("WF OK"), 0)
        acknowledgement.set(payload.slice(0, 6), 5)
        await this.#exchangeRetriableBlock(
          COMMAND.resourceBlock,
          "Resource Flash",
          payload,
          {
            command: COMMAND.resourceBlockResponse,
            payload: acknowledgement,
          }
        )
        this.#lastAcknowledgedBlock = index + 1
        this.#lastAcknowledgedAddress = address
        this.#report(
          options,
          "transferring",
          index + 1,
          updatePackage.blockCount,
          transferPercent(index + 1, updatePackage.blockCount),
          address
        )
      }
    } finally {
      this.#traceRawTransfer = false
    }

    this.#report(
      options,
      "verifying",
      updatePackage.blockCount,
      updatePackage.blockCount,
      96
    )
    await this.#exchange(
      COMMAND.resourceComplete,
      encoder.encode("Read Complete"),
      { command: COMMAND.resourceComplete, payload: encoder.encode("OK") }
    )
  }

  async #handshake(
    compatibility?: UpdateCompatibilityPolicy
  ): Promise<HandshakeResult> {
    await this.#exchange(COMMAND.identify, Uint8Array.of(0), {
      command: COMMAND.identifyResponse,
      payload: Uint8Array.of(0, ...encoder.encode("OK")),
    })

    const time = packedTime(new Date())
    const fields: Uint8Array[] = []
    for (let index = 0; index < 7; index += 1) {
      const response = await this.#exchange(
        COMMAND.information,
        Uint8Array.of(index, ...time),
        {
          command: COMMAND.informationResponse,
          payloadPrefix: Uint8Array.of(index),
        }
      )
      fields[index] = response.payload.slice(1)
    }

    if (compatibility) {
      await assertCompatibleRadio(fields, compatibility)
    }

    const radioFingerprint = await digestHex(
      Uint8Array.of(...fields[1], ...fields[2], ...fields[3])
    )
    return { fields, time, radioFingerprint }
  }

  async #exchange(
    command: number,
    payload: Uint8Array,
    expected: ExpectedResponse
  ) {
    const connection = this.#connection
    if (!connection) {
      throw new Uvl15wUpdaterError(
        "not-connected",
        "The updater is not connected"
      )
    }

    const request = encodeRequestFrame(command, payload)
    this.#emitFrame("tx", command, payload, request)
    try {
      await connection.write(request)
    } catch (cause) {
      const error = new Uvl15wUpdaterError(
        "connection-closed",
        cause instanceof Error
          ? `The serial write failed: ${cause.message}`
          : "The serial write failed",
        this.#destructiveStarted,
        undefined,
        { cause }
      )
      this.#emitDebug({
        kind: "error",
        direction: "tx",
        command,
        commandLabel: commandLabel(command),
        code: error.code,
        detail: error.message,
      })
      throw error
    }
    if (isTransferBlockCommand(command)) {
      this.#emitDebug({
        kind: "serial",
        direction: "tx",
        command,
        commandLabel: commandLabel(command),
        detail: "Serial write completed",
      })
    }

    while (true) {
      let event: FrameDecodeEvent
      try {
        event = await this.#inbox.next(this.#responseTimeoutMs)
      } catch (cause) {
        if (
          cause instanceof Uvl15wUpdaterError &&
          (cause.code === "response-timeout" ||
            cause.code === "connection-closed")
        ) {
          const pending = this.#frameDecoder.pendingBytes()
          this.#emitDebug({
            kind: "error",
            direction: "rx",
            code: cause.code,
            detail: `${cause.message}; decoder buffered ${pending.byteLength} bytes`,
            frameHex:
              this.#traceRawTransfer && pending.byteLength > 0
                ? toHex(pending)
                : undefined,
          })
        }
        throw cause
      }
      if (event.type === "error") {
        this.#emitDebug({
          kind: "error",
          direction: "rx",
          code: "protocol",
          detail: event.error.message,
        })
        throw new Uvl15wUpdaterError("protocol", event.error.message)
      }

      const frame = event.frame
      if (frame.command === COMMAND.error) {
        const code = radioErrorCode(frame.payload)
        this.#emitDebug({
          kind: "error",
          direction: "rx",
          command: frame.command,
          commandLabel: commandLabel(frame.command),
          code,
          detail: decodeField(frame.payload) || "Unknown Radio error",
          frameHex: toHex(encodeResponseFrame(frame.command, frame.payload)),
        })
        throw new Uvl15wUpdaterError(
          code,
          `The Radio rejected the updater request: ${decodeField(frame.payload) || "unknown error"}`
        )
      }
      this.#emitFrame(
        "rx",
        frame.command,
        frame.payload,
        frame.command === COMMAND.informationResponse
          ? undefined
          : encodeResponseFrame(frame.command, frame.payload)
      )
      if (
        frame.command === COMMAND.ready &&
        equalBytes(frame.payload, Uint8Array.of(0))
      ) {
        continue
      }
      if (frame.command !== expected.command) {
        throw new Uvl15wUpdaterError(
          "unexpected-response",
          `Expected response 0x${expected.command.toString(16)}; received 0x${frame.command.toString(16)}`
        )
      }
      if (expected.payload && !equalBytes(frame.payload, expected.payload)) {
        throw new Uvl15wUpdaterError(
          "unexpected-response",
          "The Radio response payload did not match the active update step"
        )
      }
      if (
        expected.payloadPrefix &&
        !startsWithBytes(frame.payload, expected.payloadPrefix)
      ) {
        throw new Uvl15wUpdaterError(
          "unexpected-response",
          "The Radio response did not match the requested information index"
        )
      }
      return frame
    }
  }

  async #exchangeRetriableBlock(
    command: typeof COMMAND.firmwareBlock | typeof COMMAND.resourceBlock,
    operationLabel: "Firmware" | "Resource Flash",
    payload: Uint8Array,
    expected: ExpectedResponse
  ) {
    const maximumAttempts = 3
    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      try {
        return await this.#exchange(command, payload, expected)
      } catch (cause) {
        if (!isRetriableBlockFrameError(cause) || attempt === maximumAttempts) {
          throw cause
        }
        this.#emitDebug({
          kind: "retry",
          direction: "tx",
          command,
          commandLabel: commandLabel(command),
          detail: `Retrying the exact ${operationLabel} block after ${cause.code}; attempt ${attempt + 1} of ${maximumAttempts}`,
        })
      }
    }
    throw new Error(`Unreachable ${operationLabel} retry state`)
  }

  async #receiveContinuously(
    connection: RadioConnection,
    frameDecoder: ResponseFrameDecoder,
    inbox: FrameInbox
  ) {
    try {
      while (this.#connection === connection) {
        const chunk = await connection.read()
        if (chunk === null) {
          inbox.fail(
            new Uvl15wUpdaterError(
              "connection-closed",
              "The Radio connection closed during the update",
              this.#destructiveStarted
            )
          )
          return
        }
        if (this.#traceRawTransfer) {
          this.#emitDebug({
            kind: "serial",
            direction: "rx",
            detail: `Raw transfer chunk; ${chunk.byteLength} bytes`,
            frameHex: toHex(chunk),
          })
        }
        for (const event of frameDecoder.push(chunk)) inbox.push(event)
      }
    } catch (cause) {
      inbox.fail(
        new Uvl15wUpdaterError(
          "connection-closed",
          "The Radio connection failed during the update",
          this.#destructiveStarted,
          undefined,
          { cause }
        )
      )
    }
  }

  #report(
    options: UpdateTransferOptions,
    phase: UpdateTransferPhase,
    completedBlocks: number,
    totalBlocks: number,
    percent: number,
    lastAcknowledgedAddress?: number
  ) {
    this.#lastPhase = phase
    this.#emitDebug({
      kind: "phase",
      detail: `${phase}; ${completedBlocks}/${totalBlocks}; ${percent}%`,
    })
    options.onProgress?.({
      phase,
      completedBlocks,
      totalBlocks,
      percent,
      lastAcknowledgedAddress,
      destructiveStarted: this.#destructiveStarted,
      radioFingerprint: this.#radioFingerprint,
    })
  }

  #emitFrame(
    direction: "tx" | "rx",
    command: number,
    payload: Uint8Array,
    encodedFrame: Uint8Array | undefined
  ) {
    this.#emitDebug({
      kind: "frame",
      direction,
      command,
      commandLabel: commandLabel(command),
      detail: describeFrame(command, payload),
      frameHex:
        encodedFrame === undefined
          ? "<identity response hidden>"
          : toHex(encodedFrame),
    })
  }

  #emitDebug(event: Omit<UpdateDebugEvent, "sequence" | "elapsedMs">) {
    this.#debugCallback?.({
      ...event,
      sequence: ++this.#debugSequence,
      elapsedMs: Math.round(performance.now() - this.#debugStartedAt),
    })
  }

  #recoveryDetails(
    updatePackage: ValidatedUpdatePackage
  ): UpdateRecoveryDetails | undefined {
    if (!this.#destructiveStarted) return undefined
    return {
      packageSha256: updatePackage.sha256,
      packageKind: updatePackage.kind,
      lastAcknowledgedBlock: this.#lastAcknowledgedBlock,
      lastAcknowledgedAddress: this.#lastAcknowledgedAddress,
      radioFingerprint: this.#radioFingerprint,
      phase: this.#lastPhase,
    }
  }
}

interface UpdateRecoveryDetails {
  readonly packageSha256: string
  readonly packageKind: ValidatedUpdatePackage["kind"]
  readonly lastAcknowledgedBlock: number
  readonly lastAcknowledgedAddress?: number
  readonly radioFingerprint?: string
  readonly phase: UpdateTransferPhase
}

interface HandshakeResult {
  readonly fields: readonly Uint8Array[]
  readonly time: Uint8Array
  readonly radioFingerprint: string
}

type ExpectedResponse = {
  readonly command: number
  readonly payload?: Uint8Array
  readonly payloadPrefix?: Uint8Array
}

async function assertCompatibleRadio(
  fields: readonly Uint8Array[],
  policy: UpdateCompatibilityPolicy
) {
  if (fields.length < 7 || fields.some((field) => !field)) {
    throw new Uvl15wUpdaterError(
      "incompatible-radio",
      "The Radio did not return a complete update-mode identity"
    )
  }

  const [hardware, bootloader, model] = await Promise.all([
    digestHex(fields[1]),
    digestHex(fields[2]),
    digestHex(fields[3]),
  ])
  const firmware = normalizeVersion(decodeField(fields[4]))

  if (
    !policy.hardwareFieldHashes.includes(hardware) ||
    !policy.bootloaderFieldHashes.includes(bootloader) ||
    !policy.modelFieldHashes.includes(model) ||
    firmware === null ||
    !policy.sourceFirmwareVersions.includes(firmware)
  ) {
    throw new Uvl15wUpdaterError(
      "incompatible-radio",
      "This Radio update-mode identity is outside the validated hardware, bootloader, model, or firmware set"
    )
  }
}

function deriveFirmwareKey(handshake: HandshakeResult) {
  const base = handshake.fields[0]?.slice()
  const build = decodeField(handshake.fields[2] ?? new Uint8Array())
  const minute = build.slice(-5, -3)

  if (
    !base ||
    base.byteLength !== 12 ||
    build.length < 5 ||
    !/^\d{2}$/.test(minute)
  ) {
    throw new Uvl15wUpdaterError(
      "protocol",
      "The Radio returned an invalid firmware session-key source"
    )
  }

  base[5] = build.charCodeAt(build.length - 1)
  base[9] = minute.charCodeAt(0)
  base[11] = minute.charCodeAt(1)
  return Uint8Array.of(...base, 0x5d, ...handshake.time)
}

function packedTime(date: Date) {
  return Uint8Array.of(
    toPackedBcd(date.getHours()),
    toPackedBcd(date.getMinutes()),
    toPackedBcd(date.getSeconds())
  )
}

function toPackedBcd(value: number) {
  return (Math.floor(value / 10) << 4) | (value % 10)
}

function transferPercent(completed: number, total: number) {
  return 3 + Math.floor((completed / total) * 91)
}

function decodeField(bytes: Uint8Array) {
  let end = bytes.byteLength
  while (
    end > 0 &&
    (bytes[end - 1] === 0 || bytes[end - 1] === 0xff || bytes[end - 1] === 0x20)
  ) {
    end -= 1
  }
  return decoder.decode(bytes.slice(0, end))
}

function radioErrorCode(payload: Uint8Array): Uvl15wUpdaterErrorCode {
  switch (decodeField(payload)) {
    case "Frame Head Error":
      return "radio-frame-head"
    case "Frame Tail Error":
      return "radio-frame-tail"
    case "Frame Length Error":
      return "radio-frame-length"
    case "Frame Lrc Error":
      return "radio-frame-lrc"
    case "Option Value Error":
      return "radio-option-value"
    default:
      return "unexpected-response"
  }
}

function isRetriableBlockFrameError(
  cause: unknown
): cause is Uvl15wUpdaterError & {
  readonly code:
    | "radio-frame-head"
    | "radio-frame-tail"
    | "radio-frame-length"
    | "radio-frame-lrc"
} {
  return (
    cause instanceof Uvl15wUpdaterError &&
    [
      "radio-frame-head",
      "radio-frame-tail",
      "radio-frame-length",
      "radio-frame-lrc",
    ].includes(cause.code)
  )
}

function isTransferBlockCommand(command: number) {
  return command === COMMAND.firmwareBlock || command === COMMAND.resourceBlock
}

function commandLabel(command: number) {
  const labels: Readonly<Record<number, string>> = {
    [COMMAND.ready]: "Radio Ready",
    [COMMAND.identify]: "Identify",
    [COMMAND.identifyResponse]: "Identify Response",
    [COMMAND.information]: "Information",
    [COMMAND.informationResponse]: "Information Response",
    [COMMAND.firmwareBlock]: "Firmware Block",
    [COMMAND.firmwareBlockResponse]: "Firmware ACK",
    [COMMAND.firmwareVerify]: "Firmware Verify",
    [COMMAND.firmwareVerifyResponse]: "Firmware Verify Response",
    [COMMAND.complete]: "Complete",
    [COMMAND.completeResponse]: "Complete Response",
    [COMMAND.resourceStart]: "Resource Start",
    [COMMAND.resourceBlock]: "Resource Block",
    [COMMAND.resourceComplete]: "Resource Complete",
    [COMMAND.resourceBlockResponse]: "Resource ACK",
    [COMMAND.error]: "Radio Error",
  }
  return labels[command] ?? `Command 0x${hexByte(command)}`
}

function describeFrame(command: number, payload: Uint8Array) {
  if (command === COMMAND.informationResponse) {
    return `Identity response index ${payload[0] ?? "?"}; payload hidden`
  }
  if (command === COMMAND.resourceStart) {
    return payload.byteLength === 8
      ? `Compatibility payload ${toCompactHex(payload)}`
      : decodeField(payload) || `${payload.byteLength} bytes`
  }
  if (command === COMMAND.resourceBlock && payload.byteLength >= 6) {
    const view = new DataView(
      payload.buffer,
      payload.byteOffset,
      payload.byteLength
    )
    return `Address 0x${view.getUint32(0, false).toString(16).toUpperCase().padStart(8, "0")}; declared ${view.getUint16(4, false)}; data ${payload.byteLength - 6} bytes`
  }
  if (command === COMMAND.resourceBlockResponse && payload.byteLength >= 11) {
    const view = new DataView(
      payload.buffer,
      payload.byteOffset + 5,
      payload.byteLength - 5
    )
    return `${decodeField(payload.slice(0, 5))}; address 0x${view.getUint32(0, false).toString(16).toUpperCase().padStart(8, "0")}; declared ${view.getUint16(4, false)}`
  }
  if (command === COMMAND.firmwareBlock && payload.byteLength >= 6) {
    const view = new DataView(
      payload.buffer,
      payload.byteOffset,
      payload.byteLength
    )
    return `Block ${view.getUint16(2, false)}/${view.getUint16(0, false)}; data ${view.getUint16(4, false)} bytes`
  }
  const text = decodeField(payload)
  return text || `${payload.byteLength} bytes`
}

function hexByte(value: number) {
  return value.toString(16).toUpperCase().padStart(2, "0")
}

function toCompactHex(bytes: Uint8Array) {
  return [...bytes].map(hexByte).join("")
}

function toHex(bytes: Uint8Array) {
  return [...bytes].map(hexByte).join(" ")
}

function normalizeVersion(value: string) {
  const stripped = value.trim().replace(/^V/i, "")
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(stripped)
  if (!match) return null
  return `${Number(match[1])}.${Number(match[2]).toString().padStart(2, "0")}.${Number(match[3]).toString().padStart(2, "0")}`
}

async function digestHex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer)
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function startsWithBytes(bytes: Uint8Array, prefix: Uint8Array) {
  return (
    bytes.byteLength >= prefix.byteLength &&
    prefix.every((byte, index) => bytes[index] === byte)
  )
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  return (
    left.byteLength === right.byteLength &&
    left.every((byte, index) => byte === right[index])
  )
}

function createUvl15wUpdater(
  transport: RadioTransport,
  options?: Uvl15wUpdaterOptions
) {
  return new Uvl15wUpdater(transport, options)
}

export { Uvl15wUpdaterError, createUvl15wUpdater }
export type {
  UpdateDebugEvent,
  UpdateTransferOptions,
  UpdateRecoveryDetails,
  UpdateTransferPhase,
  UpdateTransferProgress,
  UpdateTransferResult,
  UpdateCompatibilityPolicy,
  Uvl15wUpdaterErrorCode,
  Uvl15wUpdaterOptions,
}
