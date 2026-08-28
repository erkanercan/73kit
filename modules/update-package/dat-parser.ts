import type { CatalogResourceFormat } from "../update-catalog/index.ts"

class DatPackageError extends Error {
  readonly code: "dat-encoding" | "dat-record" | "dat-address"

  constructor(
    code: "dat-encoding" | "dat-record" | "dat-address",
    message: string
  ) {
    super(message)
    this.name = "DatPackageError"
    this.code = code
  }
}

function parseDat(bytes: Uint8Array, format: CatalogResourceFormat) {
  let text: string
  try {
    text = new TextDecoder("ascii", { fatal: true }).decode(bytes)
  } catch {
    throw new DatPackageError(
      "dat-encoding",
      "The Flash Data package is not valid ASCII"
    )
  }

  const lines = text.split(/\r?\n/)
  if (lines.at(-1) === "") lines.pop()

  if (lines.length !== format.recordCount) {
    throw new DatPackageError(
      "dat-record",
      "The Flash Data package has an unexpected record count"
    )
  }

  const output = new Uint8Array(lines.length * 32)
  let expectedAddress = format.startAddress

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!/^[0-9A-F]{8}0020[0-9A-F]{64}$/.test(line)) {
      throw new DatPackageError(
        "dat-record",
        `Flash Data record ${index + 1} is malformed`
      )
    }

    const address = Number.parseInt(line.slice(0, 8), 16)
    if (address !== expectedAddress) {
      throw new DatPackageError(
        "dat-address",
        `Flash Data record ${index + 1} is outside the validated address sequence`
      )
    }

    for (let byteIndex = 0; byteIndex < 32; byteIndex += 1) {
      output[index * 32 + byteIndex] = Number.parseInt(
        line.slice(12 + byteIndex * 2, 14 + byteIndex * 2),
        16
      )
    }
    expectedAddress += 32
  }

  if (expectedAddress !== format.endAddress) {
    throw new DatPackageError(
      "dat-address",
      "The Flash Data package ends outside the validated address range"
    )
  }

  return output
}

export { DatPackageError, parseDat }
