import type { Hex } from '../types/abi.js'

export function encodePacked(types: string[], values: readonly unknown[]): Hex {
  if (types.length !== values.length) {
    throw new Error(`Expected ${types.length} values, got ${values.length}`)
  }

  let result = ''

  for (let i = 0; i < types.length; i++) {
    const type = types[i]!
    const value = values[i]
    result += encodePackedValue(type, value)
  }

  return `0x${result}` as Hex
}

function encodePackedValue(type: string, value: unknown): string {
  if (type === 'address') {
    const addr = (value as string).startsWith('0x')
      ? (value as string).slice(2)
      : (value as string)
    return addr.toLowerCase().padStart(40, '0')
  }

  if (type === 'bool') {
    return (value as boolean) ? '01' : '00'
  }

  if (type === 'string') {
    const bytes = new TextEncoder().encode(value as string)
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  if (type === 'bytes') {
    const hex = (value as string).startsWith('0x')
      ? (value as string).slice(2)
      : (value as string)
    return hex
  }

  if (type.startsWith('uint')) {
    const bits = parseInt(type.slice(4)) || 256
    const byteLen = bits / 8
    const n = typeof value === 'number' ? BigInt(value) : value as bigint
    return n.toString(16).padStart(byteLen * 2, '0')
  }

  if (type.startsWith('int') && !type.startsWith('internal')) {
    const bits = parseInt(type.slice(3)) || 256
    const byteLen = bits / 8
    let n = typeof value === 'number' ? BigInt(value) : value as bigint
    if (n < 0n) {
      n = (1n << BigInt(bits)) + n
    }
    return n.toString(16).padStart(byteLen * 2, '0')
  }

  if (type.startsWith('bytes')) {
    const size = parseInt(type.slice(5))
    const hex = (value as string).startsWith('0x')
      ? (value as string).slice(2)
      : (value as string)
    return hex.padEnd(size * 2, '0').slice(0, size * 2)
  }

  throw new Error(`Unsupported packed type: ${type}`)
}
