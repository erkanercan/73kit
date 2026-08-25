const textDecoder = new TextDecoder()

function readUint32BigEndian(bytes: Uint8Array, offset: number) {
  return new DataView(
    bytes.buffer,
    bytes.byteOffset + offset,
    Uint32Array.BYTES_PER_ELEMENT
  ).getUint32(0, false)
}

function readBits(value: number, shift: number, width: number) {
  return (value >>> shift) & ((1 << width) - 1)
}

function decodeNullPaddedUtf8(bytes: Uint8Array) {
  const terminator = bytes.findIndex((byte) => byte === 0 || byte === 0xff)
  return textDecoder.decode(
    terminator === -1 ? bytes : bytes.subarray(0, terminator)
  )
}

export { decodeNullPaddedUtf8, readBits, readUint32BigEndian }
