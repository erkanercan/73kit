import { strFromU8, strToU8, unzipSync, zipSync } from "fflate"

import {
  CODEPLUG_LAYOUT_3_07_23,
  createCodeplug,
  getCodeplugLayout,
  type Codeplug,
  type CodeplugLayoutId,
} from "../codeplug/index.ts"
import type { SourceRadio } from "../uvl15w-radio/index.ts"
import { evaluateFirmwareSupport, TYT_UVL15W } from "../radio-support/index.ts"

const CPS_FILE_FORMAT = "73kit-cps"
const CPS_FILE_SCHEMA_VERSION = 1

interface CpsFileManifest {
  readonly format: typeof CPS_FILE_FORMAT
  readonly schemaVersion: typeof CPS_FILE_SCHEMA_VERSION
  readonly createdAt: string
  readonly radioModelId: typeof TYT_UVL15W.id
  readonly supportProfileId: string
  readonly layout: {
    readonly id: CodeplugLayoutId
    readonly firmwareVersion: string
    readonly byteLength: number
  }
  readonly sourceRadio: SourceRadio
  readonly baseline: CpsFileMember
  readonly working: CpsFileMember
}

interface CpsFileMember {
  readonly path: "baseline.bin" | "working.bin"
  readonly sha256: string
  readonly byteLength: number
}

interface CreateCpsFileInput {
  readonly sourceRadio: SourceRadio
  readonly baseline: Codeplug
  readonly working: Codeplug
  readonly createdAt?: Date
}

interface ParsedCpsFile {
  readonly manifest: CpsFileManifest
  readonly baseline: Codeplug
  readonly working: Codeplug
  readonly edited: boolean
  readonly compatibility: CpsFileCompatibility
}

type CpsFileCompatibility =
  | { readonly status: "same-layout"; readonly layoutId: CodeplugLayoutId }
  | { readonly status: "migration-required"; readonly fromLayoutId: string }
  | { readonly status: "unsupported-layout"; readonly layoutId: string }

class CpsFileError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "CpsFileError"
  }
}

async function createCpsFile(input: CreateCpsFileInput) {
  const profile = evaluateFirmwareSupport(
    TYT_UVL15W.id,
    input.sourceRadio.firmwareVersion
  )
  if (
    input.sourceRadio.model !== "UVL-15W" ||
    !profile.codeplugLayoutId ||
    input.baseline.layoutId !== profile.codeplugLayoutId ||
    input.working.layoutId !== profile.codeplugLayoutId
  ) {
    throw new CpsFileError(
      "The Source Radio does not match the selected Radio support profile"
    )
  }
  const baselineBytes = input.baseline.toBytes()
  const workingBytes = input.working.toBytes()
  const manifest: CpsFileManifest = Object.freeze({
    format: CPS_FILE_FORMAT,
    schemaVersion: CPS_FILE_SCHEMA_VERSION,
    createdAt: (input.createdAt ?? new Date()).toISOString(),
    radioModelId: TYT_UVL15W.id,
    supportProfileId: profile.id,
    layout: Object.freeze({
      id: profile.codeplugLayoutId,
      firmwareVersion: profile.version,
      byteLength: getCodeplugLayout(profile.codeplugLayoutId).byteLength,
    }),
    sourceRadio: Object.freeze({ ...input.sourceRadio }),
    baseline: Object.freeze({
      path: "baseline.bin",
      sha256: await digestBytes(baselineBytes),
      byteLength: baselineBytes.byteLength,
    }),
    working: Object.freeze({
      path: "working.bin",
      sha256: await digestBytes(workingBytes),
      byteLength: workingBytes.byteLength,
    }),
  })

  return zipSync(
    {
      "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
      "baseline.bin": baselineBytes,
      "working.bin": workingBytes,
    },
    { level: 6 }
  )
}

async function parseCpsFile(bytes: Uint8Array): Promise<ParsedCpsFile> {
  let members: Record<string, Uint8Array>
  try {
    members = unzipSync(bytes)
  } catch (cause) {
    throw new CpsFileError("The selected file is not a valid CPS File", {
      cause,
    })
  }

  const manifestBytes = members["manifest.json"]
  const baselineBytes = members["baseline.bin"]
  const workingBytes = members["working.bin"]
  if (!manifestBytes || !baselineBytes || !workingBytes) {
    throw new CpsFileError(
      "A CPS File must contain manifest.json, baseline.bin, and working.bin"
    )
  }

  let value: unknown
  try {
    value = JSON.parse(strFromU8(manifestBytes))
  } catch (cause) {
    throw new CpsFileError("The CPS File manifest is not valid JSON", { cause })
  }
  const manifest = validateManifest(value)
  await validateMember(manifest.baseline, baselineBytes)
  await validateMember(manifest.working, workingBytes)

  const compatibility = evaluateCpsFileCompatibility(manifest.layout.id)
  if (compatibility.status === "unsupported-layout") {
    throw new CpsFileError(
      `Codeplug layout ${compatibility.layoutId} is not available in this CPS`
    )
  }
  if (compatibility.status === "migration-required") {
    throw new CpsFileError(
      `Codeplug layout ${compatibility.fromLayoutId} requires a migration adapter`
    )
  }

  const baseline = createCodeplug(baselineBytes, compatibility.layoutId)
  const working = createCodeplug(workingBytes, compatibility.layoutId)
  return Object.freeze({
    manifest,
    baseline,
    working,
    edited: !baseline.equals(working),
    compatibility,
  })
}

function evaluateCpsFileCompatibility(layoutId: string): CpsFileCompatibility {
  if (layoutId === "uvl15w-3.07.23" || layoutId === "uvl15w-legacy-v1") {
    return Object.freeze({
      status: "same-layout",
      layoutId: layoutId as CodeplugLayoutId,
    })
  }
  // Future validated layouts belong in a registry with explicit pairwise
  // migration adapters. Equal byte lengths or firmware ordering are not proof.
  return Object.freeze({ status: "unsupported-layout", layoutId })
}

function validateManifest(value: unknown): CpsFileManifest {
  if (!isRecord(value))
    throw new CpsFileError("The CPS File manifest is invalid")
  if (value.format !== CPS_FILE_FORMAT) {
    throw new CpsFileError("The selected archive is not a 73Kit CPS File")
  }
  if (value.schemaVersion !== CPS_FILE_SCHEMA_VERSION) {
    throw new CpsFileError(
      `CPS File schema ${String(value.schemaVersion)} is not supported`
    )
  }
  if (
    typeof value.createdAt !== "string" ||
    value.radioModelId !== TYT_UVL15W.id ||
    typeof value.supportProfileId !== "string" ||
    !isRecord(value.layout) ||
    typeof value.layout.id !== "string" ||
    typeof value.layout.firmwareVersion !== "string" ||
    typeof value.layout.byteLength !== "number" ||
    !isSourceRadio(value.sourceRadio)
  ) {
    throw new CpsFileError("The CPS File manifest metadata is invalid")
  }
  const baseline = validateMemberManifest(value.baseline, "baseline.bin")
  const working = validateMemberManifest(value.working, "working.bin")
  const compatibility = evaluateCpsFileCompatibility(value.layout.id)
  if (compatibility.status !== "same-layout") {
    throw new CpsFileError("The CPS File Codeplug layout is not supported")
  }
  const profile = evaluateFirmwareSupport(
    TYT_UVL15W.id,
    (value.sourceRadio as SourceRadio).firmwareVersion
  )
  if (
    profile.id !== value.supportProfileId ||
    profile.codeplugLayoutId !== compatibility.layoutId ||
    value.layout.firmwareVersion !== profile.version ||
    value.layout.byteLength !==
      getCodeplugLayout(compatibility.layoutId).byteLength
  ) {
    throw new CpsFileError("The CPS File support profile is inconsistent")
  }
  return Object.freeze({
    format: CPS_FILE_FORMAT,
    schemaVersion: CPS_FILE_SCHEMA_VERSION,
    createdAt: value.createdAt,
    radioModelId: value.radioModelId,
    supportProfileId: value.supportProfileId,
    layout: Object.freeze({
      id: compatibility.layoutId,
      firmwareVersion: value.layout.firmwareVersion,
      byteLength: value.layout.byteLength,
    }),
    sourceRadio: Object.freeze({ ...(value.sourceRadio as SourceRadio) }),
    baseline,
    working,
  })
}

function validateMemberManifest(
  value: unknown,
  path: CpsFileMember["path"]
): CpsFileMember {
  if (
    !isRecord(value) ||
    value.path !== path ||
    typeof value.sha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(value.sha256) ||
    typeof value.byteLength !== "number"
  ) {
    throw new CpsFileError(`The ${path} manifest entry is invalid`)
  }
  return Object.freeze({
    path,
    sha256: value.sha256,
    byteLength: value.byteLength,
  })
}

async function validateMember(member: CpsFileMember, bytes: Uint8Array) {
  if (
    member.byteLength !== bytes.byteLength ||
    member.byteLength !== CODEPLUG_LAYOUT_3_07_23.byteLength
  ) {
    throw new CpsFileError(`${member.path} has an unexpected byte length`)
  }
  if ((await digestBytes(bytes)) !== member.sha256) {
    throw new CpsFileError(`${member.path} failed its SHA-256 integrity check`)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isSourceRadio(value: unknown) {
  if (!isRecord(value)) return false
  return (
    value.model === "UVL-15W" &&
    typeof value.subModel === "number" &&
    typeof value.firmwareVersion === "string" &&
    typeof value.imageResourceVersion === "string" &&
    typeof value.cpuId === "string" &&
    typeof value.bootloaderModel === "string" &&
    typeof value.hardwareVersion === "string" &&
    typeof value.serialNumber === "string" &&
    typeof value.readProtected === "boolean" &&
    typeof value.writeProtected === "boolean"
  )
}

async function digestBytes(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer)
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export {
  CPS_FILE_FORMAT,
  CPS_FILE_SCHEMA_VERSION,
  CpsFileError,
  createCpsFile,
  digestBytes,
  evaluateCpsFileCompatibility,
  parseCpsFile,
}
export type {
  CpsFileCompatibility,
  CpsFileManifest,
  CreateCpsFileInput,
  ParsedCpsFile,
}
