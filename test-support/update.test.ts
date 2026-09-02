import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import test from "node:test"

import {
  md5,
  xxteaEncrypt,
  type ValidatedFirmwarePackage,
  type ValidatedResourcePackage,
} from "../modules/update-package/index.ts"
import {
  findCatalogPackageBySha256,
  getNormalModeFirmwareVersions,
} from "../modules/update-catalog/index.ts"
import { createUpdateDiagnosticReport } from "../modules/update-diagnostics/index.ts"
import { isUpdatePreparationConfirmed } from "../modules/update-policy/index.ts"
import {
  Uvl15wUpdaterError,
  createUvl15wUpdater,
  type UpdateDebugEvent,
  type UpdateCompatibilityPolicy,
} from "../modules/uvl15w-updater/index.ts"
import {
  encodeRequestFrame,
  encodeResponseFrame,
} from "../modules/uvl15w-radio/protocol.ts"
import {
  ScriptedTransport,
  type ScriptStep,
} from "./scripted-transport/index.ts"

const encoder = new TextEncoder()
const handshakeFields = [
  Uint8Array.from({ length: 12 }, (_, index) => index + 1),
  encoder.encode("HW-TEST"),
  encoder.encode("2026-07-23 19:06:47"),
  encoder.encode("UVL-15W"),
  encoder.encode("3.07.23"),
  encoder.encode("BUILD-TEST"),
  Uint8Array.of(0, 1, 2, 3),
]

test("publishes the validated Firmware package through catalog release state", () => {
  const updatePackage = findCatalogPackageBySha256(
    "3b4bc8f8feff871e0ea082a31f99488f411eaefd879903f13bbb7c30d385f6b4"
  )

  assert.equal(updatePackage?.id, "firmware-3.7.23")
  assert.equal(updatePackage?.releaseStatus, "beta")
  assert.deepEqual(updatePackage?.sourceFirmwareVersions, [
    "2.07.03",
    "2.11.18",
    "2.12.27",
    "3.03.16",
    "3.03.18",
    "3.03.31",
    "3.05.26",
    "3.07.15",
    "3.07.23",
  ])
  assert.deepEqual(
    getNormalModeFirmwareVersions(),
    updatePackage?.sourceFirmwareVersions
  )
})

test("requires explicit beta acknowledgement in addition to normal preparation", () => {
  const updatePackage = firmwarePackage(1)
  const confirmations = {
    backupReady: true,
    stablePower: true,
    bootModeReady: true,
    languagePrerequisiteReady: true,
    betaRiskAccepted: false,
  }

  assert.equal(
    isUpdatePreparationConfirmed(updatePackage, confirmations),
    false
  )
  assert.equal(
    isUpdatePreparationConfirmed(updatePackage, {
      ...confirmations,
      betaRiskAccepted: true,
    }),
    true
  )
  assert.equal(
    isUpdatePreparationConfirmed(
      { ...updatePackage, releaseStatus: "stable" },
      confirmations
    ),
    true
  )
  assert.equal(
    isUpdatePreparationConfirmed(
      { ...updatePackage, releaseStatus: "disabled" },
      { ...confirmations, betaRiskAccepted: true }
    ),
    false
  )
})

test("creates a portable error report without serializing the package object", () => {
  const updatePackage = firmwarePackage(1)
  const report = createUpdateDiagnosticReport({
    generatedAt: "2026-08-28T12:34:56.000Z",
    locale: "en",
    pathname: "http://localhost:3000/en/updates?secret=value",
    environment: diagnosticEnvironment(),
    phase: "outcome-unknown",
    errorCode: "response-timeout",
    selectedPackage: updatePackage,
    progress: {
      percent: 10,
      completedBlocks: 111,
      totalBlocks: 1590,
    },
    recovery: {
      phase: "transferring",
      errorCode: "response-timeout",
      lastAcknowledgedBlock: 111,
    },
    transfer: null,
    events: [
      {
        sequence: 1,
        elapsedMs: 4043,
        kind: "error",
        code: "response-timeout",
        detail: "Timed out with 0 decoder bytes pending",
        frameHex: "SECRET-FRAME-BYTES",
      },
    ],
  })
  const content = JSON.parse(report.content) as {
    schemaVersion: number
    failure: { errorCode: string }
    package: Record<string, unknown>
    protocolEvents: Array<Record<string, unknown>>
  }

  assert.equal(
    report.fileName,
    "tyt-uvl15w-update-error-2026-08-28T12-34-56.000Z.json"
  )
  assert.equal(content.schemaVersion, 2)
  assert.equal(content.failure.errorCode, "response-timeout")
  assert.equal("detail" in (content.protocolEvents[0] ?? {}), false)
  assert.equal("bytes" in content.package, false)
  assert.equal(report.content.includes("SECRET-FRAME-BYTES"), false)
  assert.equal(report.content.includes("Timed out with 0 decoder"), false)
  assert.equal(report.content.includes("secret=value"), false)
})

test("restores package metadata in an error report after a page reload", () => {
  const updatePackage = firmwarePackage(1)
  const report = createUpdateDiagnosticReport({
    generatedAt: "2026-08-28T12:34:56.000Z",
    locale: "tr",
    pathname: "/tr/updates",
    environment: diagnosticEnvironment(),
    phase: "outcome-unknown",
    errorCode: "response-timeout",
    selectedPackage: updatePackage,
    progress: {
      percent: 10,
      completedBlocks: 111,
      totalBlocks: 1590,
    },
    recovery: {
      phase: "transferring",
      errorCode: "response-timeout",
      lastAcknowledgedBlock: 111,
    },
    transfer: null,
    events: [],
  })
  const content = JSON.parse(report.content) as {
    package: { catalogId: string; version: string } | null
  }

  assert.equal(content.package?.catalogId, updatePackage.catalogId)
  assert.equal(content.package?.version, updatePackage.version)
})

test("implements MD5 and modified XXTEA deterministically", () => {
  assert.equal(
    toHex(md5(encoder.encode("abc"))),
    "900150983cd24fb0d6963f7d28e17f72"
  )
  assert.equal(
    toHex(
      xxteaEncrypt(
        Uint8Array.from({ length: 16 }, (_, index) => index),
        Uint8Array.from({ length: 16 }, (_, index) => 15 - index)
      )
    ),
    "f6a0b862029b55c21c82d598d146308a"
  )
})

test("runs the captured Resource Flash command sequence and strict acknowledgement", async () => {
  const updatePackage = resourcePackage()
  const steps = [
    ...handshakeSteps(),
    {
      expectedWrite: encodeRequestFrame(
        0xe3,
        updatePackage.compatibilityPayload
      ),
      responseChunks: [
        encodeResponseFrame(0xe3, encoder.encode("WRITE START OK")),
      ],
    },
    resourceBlockStep(updatePackage, false),
    {
      expectedWrite: encodeRequestFrame(0xe5, encoder.encode("Read Complete")),
      responseChunks: [encodeResponseFrame(0xe5, encoder.encode("OK"))],
    },
    ...handshakeSteps(),
    {
      expectedWrite: encodeRequestFrame(0xc4, Uint8Array.of(0)),
      responseChunks: [
        encodeResponseFrame(0x4c, Uint8Array.of(0, ...encoder.encode("OK"))),
      ],
    },
  ] satisfies ScriptStep[]
  const transport = new ScriptedTransport(steps)
  const progress: number[] = []
  const updater = createUvl15wUpdater(transport, {
    responseTimeoutMs: 100,
    compatibilityPolicy: testCompatibilityPolicy(),
  })

  const result = await updater.update(updatePackage, {
    onProgress: (event) => progress.push(event.percent),
  })

  assert.equal(result.kind, "language")
  assert.equal(result.requiresLanguageConfirmation, true)
  assert.equal(progress.at(-1), 98)
  transport.assertComplete()
})

test("uses the captured recovery start payload and rewrites a Resource Flash package from its first address", async () => {
  const updatePackage = resourcePackage()
  const recoveryPayload = Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0)
  const recoveryPackage = {
    ...updatePackage,
    recoveryCompatibilityPayload: recoveryPayload,
  } satisfies ValidatedResourcePackage
  const steps = [
    ...handshakeSteps(),
    {
      expectedWrite: encodeRequestFrame(0xe3, recoveryPayload),
      responseChunks: [
        encodeResponseFrame(0xe3, encoder.encode("WRITE START OK")),
      ],
    },
    resourceBlockStep(recoveryPackage, false),
    {
      expectedWrite: encodeRequestFrame(0xe5, encoder.encode("Read Complete")),
      responseChunks: [encodeResponseFrame(0xe5, encoder.encode("OK"))],
    },
    ...handshakeSteps(),
    {
      expectedWrite: encodeRequestFrame(0xc4, Uint8Array.of(0)),
      responseChunks: [
        encodeResponseFrame(0x4c, Uint8Array.of(0, ...encoder.encode("OK"))),
      ],
    },
  ] satisfies ScriptStep[]
  const transport = new ScriptedTransport(steps)
  const updater = createUvl15wUpdater(transport, {
    responseTimeoutMs: 100,
    compatibilityPolicy: testCompatibilityPolicy(),
  })

  await updater.update(recoveryPackage, { recovery: true })

  transport.assertComplete()
})

test("rejects recovery before opening the Radio when the package has no captured recovery payload", async () => {
  const updatePackage = resourcePackage()
  const transport = new ScriptedTransport([])
  const updater = createUvl15wUpdater(transport, {
    responseTimeoutMs: 100,
    compatibilityPolicy: testCompatibilityPolicy(),
  })

  await assert.rejects(
    updater.update(updatePackage, { recovery: true }),
    (error) => {
      assert.ok(error instanceof Uvl15wUpdaterError)
      assert.equal(error.code, "unsupported-recovery")
      assert.equal(error.outcomeUnknown, false)
      return true
    }
  )
  transport.assertComplete()
})

test("traces the exact Resource Flash start rejection without exposing handshake payloads", async () => {
  const updatePackage = resourcePackage()
  const debugEvents: Array<{
    kind: string
    command?: number
    code?: string
    direction?: string
  }> = []
  const steps = [
    ...handshakeSteps(),
    {
      expectedWrite: encodeRequestFrame(
        0xe3,
        updatePackage.compatibilityPayload
      ),
      responseChunks: [
        encodeResponseFrame(0xee, encoder.encode("Option Value Error")),
      ],
    },
  ] satisfies ScriptStep[]
  const transport = new ScriptedTransport(steps)
  const updater = createUvl15wUpdater(transport, {
    responseTimeoutMs: 100,
    compatibilityPolicy: testCompatibilityPolicy(),
  })

  await assert.rejects(
    updater.update(updatePackage, {
      onDebugEvent: (event) => debugEvents.push(event),
    }),
    (error) => {
      assert.ok(error instanceof Uvl15wUpdaterError)
      assert.equal(error.code, "radio-option-value")
      return true
    }
  )

  assert.deepEqual(
    debugEvents
      .filter((event) => event.command === 0xe3 || event.code)
      .map(({ kind, direction, command, code }) => ({
        kind,
        direction,
        command,
        ...(code ? { code } : {}),
      })),
    [
      { kind: "frame", direction: "tx", command: 0xe3 },
      {
        kind: "error",
        direction: "rx",
        command: 0xee,
        code: "radio-option-value",
      },
    ]
  )
  assert.equal(debugEvents.filter((event) => event.command === 0xee).length, 1)
  transport.assertComplete()
})

test("marks a disconnect after Resource Flash begins as Update Outcome Unknown", async () => {
  const updatePackage = resourcePackage()
  const steps = [
    ...handshakeSteps(),
    {
      expectedWrite: encodeRequestFrame(
        0xe3,
        updatePackage.compatibilityPayload
      ),
      responseChunks: [
        encodeResponseFrame(0xe3, encoder.encode("WRITE START OK")),
      ],
    },
    resourceBlockStep(updatePackage, true),
  ] satisfies ScriptStep[]
  const transport = new ScriptedTransport(steps)
  const updater = createUvl15wUpdater(transport, {
    responseTimeoutMs: 100,
    compatibilityPolicy: testCompatibilityPolicy(),
  })

  await assert.rejects(updater.update(updatePackage), (error) => {
    assert.ok(error instanceof Uvl15wUpdaterError)
    assert.equal(error.outcomeUnknown, true)
    return true
  })
  transport.assertComplete()
})

for (const [label, interruptedBlock] of [
  ["first", 0],
  ["middle", 1],
  ["final", 2],
] as const) {
  test(`classifies a ${label}-block Firmware disconnect without advancing recovery`, async () => {
    const updatePackage = firmwarePackage(3)
    const acknowledgedSteps = Array.from(
      { length: interruptedBlock },
      () =>
        ({
          expectedWrite: expectCommand(0xc2),
          responseChunks: [encodeResponseFrame(0x2c, encoder.encode("OK"))],
        }) satisfies ScriptStep
    )
    const transport = new ScriptedTransport([
      ...handshakeSteps(),
      ...acknowledgedSteps,
      { expectedWrite: expectCommand(0xc2), closeAfterWrite: true },
    ])
    const updater = createUvl15wUpdater(transport, {
      responseTimeoutMs: 100,
      compatibilityPolicy: testCompatibilityPolicy(),
    })

    await assert.rejects(updater.update(updatePackage), (error) => {
      assert.ok(error instanceof Uvl15wUpdaterError)
      assert.equal(error.outcomeUnknown, true)
      assert.equal(error.recovery?.lastAcknowledgedBlock, interruptedBlock)
      return true
    })
    transport.assertComplete()
  })

  test(`classifies a ${label}-block Resource Flash disconnect without advancing recovery`, async () => {
    const oneBlockPackage = resourcePackage()
    const updatePackage = {
      ...oneBlockPackage,
      byteLength: 3 * 512,
      blockCount: 3,
      endAddress: oneBlockPackage.startAddress + 3 * 512,
      bytes: Uint8Array.from({ length: 3 * 512 }, (_, index) => index),
    } satisfies ValidatedResourcePackage
    const acknowledgedSteps = Array.from(
      { length: interruptedBlock },
      (_, index) => resourceBlockStep(updatePackage, false, index)
    )
    const transport = new ScriptedTransport([
      ...handshakeSteps(),
      {
        expectedWrite: encodeRequestFrame(
          0xe3,
          updatePackage.compatibilityPayload
        ),
        responseChunks: [
          encodeResponseFrame(0xe3, encoder.encode("WRITE START OK")),
        ],
      },
      ...acknowledgedSteps,
      resourceBlockStep(updatePackage, true, interruptedBlock),
    ])
    const updater = createUvl15wUpdater(transport, {
      responseTimeoutMs: 100,
      compatibilityPolicy: testCompatibilityPolicy(),
    })

    await assert.rejects(updater.update(updatePackage), (error) => {
      assert.ok(error instanceof Uvl15wUpdaterError)
      assert.equal(error.outcomeUnknown, true)
      assert.equal(error.recovery?.lastAcknowledgedBlock, interruptedBlock)
      return true
    })
    transport.assertComplete()
  })
}

for (const message of [
  "Frame Head Error",
  "Frame Tail Error",
  "Frame Length Error",
  "Frame Lrc Error",
] as const) {
  test(`retries the exact Firmware block after ${message}`, async () => {
    const updatePackage = firmwarePackage(1)
    let firstAttempt: Uint8Array | undefined
    const steps = [
      ...handshakeSteps(),
      {
        expectedWrite: (bytes: Uint8Array) => {
          assert.equal(bytes[4], 0xc2)
          firstAttempt = bytes
        },
        responseChunks: [encodeResponseFrame(0xee, encoder.encode(message))],
      },
      {
        expectedWrite: (bytes: Uint8Array) => {
          assert.ok(firstAttempt)
          assert.deepEqual(bytes, firstAttempt)
        },
        responseChunks: [encodeResponseFrame(0x2c, encoder.encode("OK"))],
      },
      firmwareVerificationStep(updatePackage),
      ...handshakeSteps(),
      completionStep(),
    ] satisfies ScriptStep[]
    const transport = new ScriptedTransport(steps)
    const updater = createUvl15wUpdater(transport, {
      responseTimeoutMs: 100,
      compatibilityPolicy: testCompatibilityPolicy(),
    })

    const result = await updater.update(updatePackage)

    assert.equal(result.kind, "firmware")
    transport.assertComplete()
  })
}

test("stops after three Firmware Frame Head Error responses without advancing the block", async () => {
  const updatePackage = firmwarePackage(2)
  let failedBlock: Uint8Array | undefined
  const headError = encodeResponseFrame(
    0xee,
    encoder.encode("Frame Head Error")
  )
  const steps = [
    ...handshakeSteps(),
    {
      expectedWrite: expectCommand(0xc2),
      responseChunks: [encodeResponseFrame(0x2c, encoder.encode("OK"))],
    },
    {
      expectedWrite: (bytes: Uint8Array) => {
        assert.equal(bytes[4], 0xc2)
        failedBlock = bytes
      },
      responseChunks: [headError],
    },
    {
      expectedWrite: (bytes: Uint8Array) => {
        assert.ok(failedBlock)
        assert.deepEqual(bytes, failedBlock)
      },
      responseChunks: [headError],
    },
    {
      expectedWrite: (bytes: Uint8Array) => {
        assert.ok(failedBlock)
        assert.deepEqual(bytes, failedBlock)
      },
      responseChunks: [headError],
    },
  ] satisfies ScriptStep[]
  const transport = new ScriptedTransport(steps)
  const updater = createUvl15wUpdater(transport, {
    responseTimeoutMs: 100,
    compatibilityPolicy: testCompatibilityPolicy(),
  })

  await assert.rejects(updater.update(updatePackage), (error) => {
    assert.ok(error instanceof Uvl15wUpdaterError)
    assert.equal(error.code, "radio-frame-head")
    assert.equal(error.outcomeUnknown, true)
    assert.equal(error.recovery?.lastAcknowledgedBlock, 1)
    assert.equal(error.recovery?.lastAcknowledgedAddress, undefined)
    return true
  })
  transport.assertComplete()
})

test("does not retry a Firmware block after Option Value Error", async () => {
  const updatePackage = firmwarePackage(1)
  const steps = [
    ...handshakeSteps(),
    {
      expectedWrite: expectCommand(0xc2),
      responseChunks: [
        encodeResponseFrame(0xee, encoder.encode("Option Value Error")),
      ],
    },
  ] satisfies ScriptStep[]
  const transport = new ScriptedTransport(steps)
  const updater = createUvl15wUpdater(transport, {
    responseTimeoutMs: 100,
    compatibilityPolicy: testCompatibilityPolicy(),
  })

  await assert.rejects(updater.update(updatePackage), (error) => {
    assert.ok(error instanceof Uvl15wUpdaterError)
    assert.equal(error.code, "radio-option-value")
    assert.equal(error.outcomeUnknown, true)
    assert.equal(error.recovery?.lastAcknowledgedBlock, 0)
    return true
  })
  transport.assertComplete()
})

test("traces a completed Firmware write followed by a zero-byte response timeout", async () => {
  const updatePackage = firmwarePackage(1)
  const debugEvents: UpdateDebugEvent[] = []
  const steps = [
    ...handshakeSteps(),
    { expectedWrite: expectCommand(0xc2) },
  ] satisfies ScriptStep[]
  const transport = new ScriptedTransport(steps)
  const updater = createUvl15wUpdater(transport, {
    responseTimeoutMs: 10,
    compatibilityPolicy: testCompatibilityPolicy(),
  })

  await assert.rejects(
    updater.update(updatePackage, {
      onDebugEvent: (event) => debugEvents.push(event),
    }),
    { code: "response-timeout" }
  )

  assert.deepEqual(
    debugEvents
      .filter(
        (event) => event.command === 0xc2 || event.code === "response-timeout"
      )
      .map(({ kind, direction, command, code, detail, frameHex }) => ({
        kind,
        direction,
        command,
        code,
        detail,
        hasFrame: frameHex !== undefined,
      })),
    [
      {
        kind: "frame",
        direction: "tx",
        command: 0xc2,
        code: undefined,
        detail: "Block 1/1; data 512 bytes",
        hasFrame: true,
      },
      {
        kind: "serial",
        direction: "tx",
        command: 0xc2,
        code: undefined,
        detail: "Serial write completed",
        hasFrame: false,
      },
      {
        kind: "error",
        direction: "rx",
        command: undefined,
        code: "response-timeout",
        detail:
          "The Radio did not respond within 10 ms; decoder buffered 0 bytes",
        hasFrame: false,
      },
    ]
  )
  transport.assertComplete()
})

test("traces raw and buffered bytes when a Firmware acknowledgement is truncated", async () => {
  const updatePackage = firmwarePackage(1)
  const debugEvents: UpdateDebugEvent[] = []
  const partialAcknowledgement = encodeResponseFrame(
    0x2c,
    encoder.encode("OK")
  ).slice(0, -1)
  const steps = [
    ...handshakeSteps(),
    {
      expectedWrite: expectCommand(0xc2),
      responseChunks: [partialAcknowledgement],
    },
  ] satisfies ScriptStep[]
  const transport = new ScriptedTransport(steps)
  const updater = createUvl15wUpdater(transport, {
    responseTimeoutMs: 10,
    compatibilityPolicy: testCompatibilityPolicy(),
  })

  await assert.rejects(
    updater.update(updatePackage, {
      onDebugEvent: (event) => debugEvents.push(event),
    }),
    { code: "response-timeout" }
  )

  const rawHex = toSpacedHex(partialAcknowledgement)
  assert.deepEqual(
    debugEvents
      .filter(
        (event) =>
          (event.kind === "serial" && event.direction === "rx") ||
          event.code === "response-timeout"
      )
      .map(({ kind, direction, code, detail, frameHex }) => ({
        kind,
        direction,
        code,
        detail,
        frameHex,
      })),
    [
      {
        kind: "serial",
        direction: "rx",
        code: undefined,
        detail: `Raw transfer chunk; ${partialAcknowledgement.byteLength} bytes`,
        frameHex: rawHex,
      },
      {
        kind: "error",
        direction: "rx",
        code: "response-timeout",
        detail: `The Radio did not respond within 10 ms; decoder buffered ${partialAcknowledgement.byteLength} bytes`,
        frameHex: rawHex,
      },
    ]
  )
  transport.assertComplete()
})

test("retries the same Resource Flash block after an explicit Frame Lrc Error", async () => {
  const updatePackage = resourcePackage()
  const failedBlock = resourceBlockStep(updatePackage, false)
  const steps = [
    ...handshakeSteps(),
    {
      expectedWrite: encodeRequestFrame(
        0xe3,
        updatePackage.compatibilityPayload
      ),
      responseChunks: [
        encodeResponseFrame(0xe3, encoder.encode("WRITE START OK")),
      ],
    },
    {
      expectedWrite: failedBlock.expectedWrite,
      responseChunks: [
        encodeResponseFrame(0xee, encoder.encode("Frame Lrc Error")),
      ],
    },
    failedBlock,
    {
      expectedWrite: encodeRequestFrame(0xe5, encoder.encode("Read Complete")),
      responseChunks: [encodeResponseFrame(0xe5, encoder.encode("OK"))],
    },
    ...handshakeSteps(),
    {
      expectedWrite: encodeRequestFrame(0xc4, Uint8Array.of(0)),
      responseChunks: [
        encodeResponseFrame(0x4c, Uint8Array.of(0, ...encoder.encode("OK"))),
      ],
    },
  ] satisfies ScriptStep[]
  const transport = new ScriptedTransport(steps)
  const updater = createUvl15wUpdater(transport, {
    responseTimeoutMs: 100,
    compatibilityPolicy: testCompatibilityPolicy(),
  })

  const result = await updater.update(updatePackage)

  assert.equal(result.kind, "language")
  transport.assertComplete()
})

for (const message of [
  "Frame Head Error",
  "Frame Tail Error",
  "Frame Length Error",
] as const) {
  test(`retries the exact Resource Flash block after ${message}`, async () => {
    const updatePackage = resourcePackage()
    const block = resourceBlockStep(updatePackage, false)
    const steps = [
      ...handshakeSteps(),
      {
        expectedWrite: encodeRequestFrame(
          0xe3,
          updatePackage.compatibilityPayload
        ),
        responseChunks: [
          encodeResponseFrame(0xe3, encoder.encode("WRITE START OK")),
        ],
      },
      {
        expectedWrite: block.expectedWrite,
        responseChunks: [encodeResponseFrame(0xee, encoder.encode(message))],
      },
      block,
      {
        expectedWrite: encodeRequestFrame(
          0xe5,
          encoder.encode("Read Complete")
        ),
        responseChunks: [encodeResponseFrame(0xe5, encoder.encode("OK"))],
      },
      ...handshakeSteps(),
      {
        expectedWrite: encodeRequestFrame(0xc4, Uint8Array.of(0)),
        responseChunks: [
          encodeResponseFrame(0x4c, Uint8Array.of(0, ...encoder.encode("OK"))),
        ],
      },
    ] satisfies ScriptStep[]
    const transport = new ScriptedTransport(steps)
    const updater = createUvl15wUpdater(transport, {
      responseTimeoutMs: 100,
      compatibilityPolicy: testCompatibilityPolicy(),
    })

    const result = await updater.update(updatePackage)

    assert.equal(result.kind, "language")
    transport.assertComplete()
  })
}

test("stops after three Frame Head Error responses without advancing the block", async () => {
  const firstBlockPackage = resourcePackage()
  const updatePackage = {
    ...firstBlockPackage,
    byteLength: 1024,
    blockCount: 2,
    endAddress: firstBlockPackage.startAddress + 1024,
    bytes: Uint8Array.from({ length: 1024 }, (_, index) => index),
  } satisfies ValidatedResourcePackage
  const firstBlock = resourceBlockStep(updatePackage, false, 0)
  const failedBlock = resourceBlockStep(updatePackage, false, 1)
  const headFailure = {
    expectedWrite: failedBlock.expectedWrite,
    responseChunks: [
      encodeResponseFrame(0xee, encoder.encode("Frame Head Error")),
    ],
  } satisfies ScriptStep
  const steps = [
    ...handshakeSteps(),
    {
      expectedWrite: encodeRequestFrame(
        0xe3,
        updatePackage.compatibilityPayload
      ),
      responseChunks: [
        encodeResponseFrame(0xe3, encoder.encode("WRITE START OK")),
      ],
    },
    firstBlock,
    headFailure,
    headFailure,
    headFailure,
  ] satisfies ScriptStep[]
  const transport = new ScriptedTransport(steps)
  const updater = createUvl15wUpdater(transport, {
    responseTimeoutMs: 100,
    compatibilityPolicy: testCompatibilityPolicy(),
  })

  await assert.rejects(updater.update(updatePackage), (error) => {
    assert.ok(error instanceof Uvl15wUpdaterError)
    assert.equal(error.code, "radio-frame-head")
    assert.equal(error.outcomeUnknown, true)
    assert.equal(error.recovery?.lastAcknowledgedBlock, 1)
    assert.equal(
      error.recovery?.lastAcknowledgedAddress,
      updatePackage.startAddress
    )
    return true
  })
  transport.assertComplete()
})

test("stops after three Frame Lrc Error responses without advancing the block", async () => {
  const updatePackage = resourcePackage()
  const failedBlock = resourceBlockStep(updatePackage, false)
  const lrcFailure = {
    expectedWrite: failedBlock.expectedWrite,
    responseChunks: [
      encodeResponseFrame(0xee, encoder.encode("Frame Lrc Error")),
    ],
  } satisfies ScriptStep
  const steps = [
    ...handshakeSteps(),
    {
      expectedWrite: encodeRequestFrame(
        0xe3,
        updatePackage.compatibilityPayload
      ),
      responseChunks: [
        encodeResponseFrame(0xe3, encoder.encode("WRITE START OK")),
      ],
    },
    lrcFailure,
    lrcFailure,
    lrcFailure,
  ] satisfies ScriptStep[]
  const transport = new ScriptedTransport(steps)
  const updater = createUvl15wUpdater(transport, {
    responseTimeoutMs: 100,
    compatibilityPolicy: testCompatibilityPolicy(),
  })

  await assert.rejects(updater.update(updatePackage), (error) => {
    assert.ok(error instanceof Uvl15wUpdaterError)
    assert.equal(error.code, "radio-frame-lrc")
    assert.equal(error.outcomeUnknown, true)
    assert.equal(error.recovery?.lastAcknowledgedBlock, 0)
    return true
  })
  transport.assertComplete()
})

function handshakeSteps(): ScriptStep[] {
  const steps: ScriptStep[] = [
    {
      expectedWrite: encodeRequestFrame(0xc0, Uint8Array.of(0)),
      responseChunks: [
        encodeResponseFrame(0x0c, Uint8Array.of(0, ...encoder.encode("OK"))),
      ],
    },
  ]

  for (let index = 0; index < 7; index += 1) {
    steps.push({
      expectedWrite: expectCommand(0xc1),
      responseChunks: [
        encodeResponseFrame(
          0x1c,
          Uint8Array.of(index, ...handshakeFields[index])
        ),
      ],
    })
  }
  return steps
}

function resourceBlockStep(
  updatePackage: ValidatedResourcePackage,
  closeAfterWrite: boolean,
  index = 0
): ScriptStep {
  const data = updatePackage.bytes.slice(
    index * 512,
    Math.min((index + 1) * 512, updatePackage.bytes.byteLength)
  )
  const payload = new Uint8Array(6 + data.byteLength)
  const view = new DataView(payload.buffer)
  view.setUint32(0, updatePackage.startAddress + index * 512, false)
  view.setUint16(4, 512, false)
  payload.set(data, 6)
  const acknowledgement = Uint8Array.of(
    ...encoder.encode("WF OK"),
    ...payload.slice(0, 6)
  )
  return {
    expectedWrite: encodeRequestFrame(0xe4, payload),
    responseChunks: closeAfterWrite
      ? []
      : [encodeResponseFrame(0xe6, acknowledgement)],
    closeAfterWrite,
  }
}

function resourcePackage(): ValidatedResourcePackage {
  return {
    catalogId: "test-language",
    kind: "language",
    fileName: "Language test.DAT",
    version: "1.01.05",
    releaseStatus: "beta",
    byteLength: 32,
    sha256: "test-package",
    blockCount: 1,
    startAddress: 0x00740000,
    endAddress: 0x00740020,
    compatibilityPayload: Uint8Array.of(0, 0, 0, 0x0d, 0, 0, 0, 0),
    targets: { language: "1.01.05" },
    prerequisites: [],
    radioCompatibility: testCompatibilityPolicy(),
    bytes: Uint8Array.from({ length: 32 }, (_, index) => index),
  }
}

function firmwarePackage(blockCount: number): ValidatedFirmwarePackage {
  const header = Uint8Array.from({ length: 16 }, (_, index) => index + 1)
  const body = Uint8Array.from(
    { length: blockCount * 512 },
    (_, index) => index
  )
  return {
    catalogId: "test-firmware",
    kind: "firmware",
    fileName: "Firmware test.Fir",
    version: "3.7.23",
    releaseStatus: "beta",
    byteLength: header.byteLength + body.byteLength,
    sha256: "test-firmware-package",
    blockCount,
    targets: { firmware: "3.07.23" },
    prerequisites: [
      { kind: "language", version: "1.01.05", relation: "exact" },
    ],
    radioCompatibility: testCompatibilityPolicy(),
    bytes: Uint8Array.of(...header, ...body),
  }
}

function firmwareVerificationStep(
  updatePackage: ValidatedFirmwarePackage
): ScriptStep {
  const version = updatePackage.bytes.slice(16, 20)
  return {
    expectedWrite: expectCommand(0xc3),
    responseChunks: [
      encodeResponseFrame(0x3c, Uint8Array.of(...version, ...version)),
    ],
  }
}

function completionStep(): ScriptStep {
  return {
    expectedWrite: encodeRequestFrame(0xc4, Uint8Array.of(0)),
    responseChunks: [
      encodeResponseFrame(0x4c, Uint8Array.of(0, ...encoder.encode("OK"))),
    ],
  }
}

function testCompatibilityPolicy(): UpdateCompatibilityPolicy {
  return {
    hardwareFieldHashes: [sha256(handshakeFields[1])],
    bootloaderFieldHashes: [sha256(handshakeFields[2])],
    modelFieldHashes: [sha256(handshakeFields[3])],
    sourceFirmwareVersions: ["3.07.23"],
  }
}

function expectCommand(command: number) {
  return (bytes: Uint8Array) => {
    assert.equal(bytes[4], command)
  }
}

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex")
}

function toHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function diagnosticEnvironment() {
  return {
    secureContext: true,
    online: true,
    webSerialSupported: true,
    serviceWorkerSupported: true,
    indexedDbSupported: true,
  }
}

function toSpacedHex(bytes: Uint8Array) {
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join(" ")
}
