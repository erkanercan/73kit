const PACKAGE_KEY = Uint8Array.from(
  "178B09AA043DFF60370D542FCA9C30AA".match(/../g) ?? [],
  (value) => Number.parseInt(value, 16)
)

function validateFirmwareIntegrity(bytes: Uint8Array) {
  if (bytes.byteLength < 24 || (bytes.byteLength - 16) % 4 !== 0) return false

  const bodyHex = toHex(bytes.slice(16)).toUpperCase()
  const digest = md5(new TextEncoder().encode(bodyHex))
  const expectedTag = xxteaEncrypt(digest, PACKAGE_KEY)
  return equalBytes(expectedTag, bytes.slice(0, 16))
}

function xxteaEncrypt(data: Uint8Array, key: Uint8Array) {
  if (data.byteLength < 8 || data.byteLength % 4 !== 0) {
    throw new RangeError("XXTEA input length must be a multiple of four")
  }
  if (key.byteLength !== 16) {
    throw new RangeError("XXTEA key must be 16 bytes")
  }

  const values = toUint32Words(data)
  const keyWords = toUint32Words(key)
  const count = values.length
  const rounds = 32 + Math.floor(52 / count)
  const delta = 0x645a75c5
  let total = 0
  let z = values[count - 1]

  for (let round = 0; round < rounds; round += 1) {
    total = (total + delta) >>> 0
    const e = (total >>> 2) & 3

    for (let position = 0; position < count - 1; position += 1) {
      const y = values[position + 1]
      const mix = xxteaMix(z, y, total, keyWords[(position & 3) ^ e])
      values[position] = (values[position] + mix) >>> 0
      z = values[position]
    }

    const position = count - 1
    const y = values[0]
    const mix = xxteaMix(z, y, total, keyWords[(position & 3) ^ e])
    values[position] = (values[position] + mix) >>> 0
    z = values[position]
  }

  return fromUint32Words(values)
}

function xxteaMix(z: number, y: number, total: number, key: number) {
  return (
    ((((z >>> 5) ^ (y << 2)) + ((y >>> 3) ^ (z << 4))) ^
      ((total ^ y) + (key ^ z))) >>>
    0
  )
}

function toUint32Words(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const words = new Uint32Array(bytes.byteLength / 4)
  for (let index = 0; index < words.length; index += 1) {
    words[index] = view.getUint32(index * 4, true)
  }
  return words
}

function fromUint32Words(words: Uint32Array) {
  const output = new Uint8Array(words.length * 4)
  const view = new DataView(output.buffer)
  for (let index = 0; index < words.length; index += 1) {
    view.setUint32(index * 4, words[index], true)
  }
  return output
}

function md5(input: Uint8Array) {
  const bitLength = input.byteLength * 8
  const paddedLength = Math.ceil((input.byteLength + 9) / 64) * 64
  const bytes = new Uint8Array(paddedLength)
  bytes.set(input)
  bytes[input.byteLength] = 0x80
  const view = new DataView(bytes.buffer)
  view.setUint32(paddedLength - 8, bitLength >>> 0, true)
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 0x1_0000_0000), true)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476
  const shifts = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
  const constants = Uint32Array.from(
    { length: 64 },
    (_, index) =>
      Math.floor(Math.abs(Math.sin(index + 1)) * 0x1_0000_0000) >>> 0
  )

  for (let offset = 0; offset < bytes.byteLength; offset += 64) {
    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let index = 0; index < 64; index += 1) {
      let f: number
      let g: number
      if (index < 16) {
        f = (b & c) | (~b & d)
        g = index
      } else if (index < 32) {
        f = (d & b) | (~d & c)
        g = (5 * index + 1) % 16
      } else if (index < 48) {
        f = b ^ c ^ d
        g = (3 * index + 5) % 16
      } else {
        f = c ^ (b | ~d)
        g = (7 * index) % 16
      }

      const sum =
        (a + f + constants[index] + view.getUint32(offset + g * 4, true)) >>> 0
      const shift = shifts[Math.floor(index / 16) * 4 + (index % 4)]
      const rotated = ((sum << shift) | (sum >>> (32 - shift))) >>> 0
      ;[a, b, c, d] = [d, (b + rotated) >>> 0, b, c]
    }

    a0 = (a0 + a) >>> 0
    b0 = (b0 + b) >>> 0
    c0 = (c0 + c) >>> 0
    d0 = (d0 + d) >>> 0
  }

  return fromUint32Words(Uint32Array.of(a0, b0, c0, d0))
}

function toHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  return (
    left.byteLength === right.byteLength &&
    left.every((byte, index) => byte === right[index])
  )
}

export { md5, validateFirmwareIntegrity, xxteaEncrypt }
