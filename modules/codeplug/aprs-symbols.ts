const APRS_SYMBOL_CODES = Object.freeze(
  Array.from({ length: 94 }, (_, index) => String.fromCharCode(0x21 + index))
)

type AprsSymbolTableName = "primary" | "secondary"

function assertAprsSymbolIndex(index: number) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= APRS_SYMBOL_CODES.length
  ) {
    throw new RangeError(`Invalid APRS symbol index: ${index}`)
  }
}

function aprsSymbolCode(table: AprsSymbolTableName, index: number) {
  assertAprsSymbolIndex(index)
  return `${table === "primary" ? "/" : "\\"}${APRS_SYMBOL_CODES[index]}`
}

function aprsSymbolSpritePosition(index: number) {
  assertAprsSymbolIndex(index)
  return {
    column: index % 16,
    row: Math.floor(index / 16),
  }
}

export { APRS_SYMBOL_CODES, aprsSymbolCode, aprsSymbolSpritePosition }
