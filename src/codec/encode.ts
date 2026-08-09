import type { AbiParameter } from '../types/abi.js'

const WORD = 64 // 32 bytes = 64 hex chars
const ZERO_WORD = '0'.repeat(WORD)

export function encodeParameters(types: AbiParameter[], values: readonly unknown[]): string {
  if (types.length !== values.length) {
    throw new Error(`Expected ${types.length} values, got ${values.length}`)
  }

  const heads: string[] = []
  const tails: string[] = []
  let tailOffset = types.length * 32

  for (let i = 0; i < types.length; i++) {
    const type = types[i]!.type
    const value = values[i]

    if (isDynamic(type)) {
      heads.push(padLeft((tailOffset).toString(16), WORD))
      const encoded = encodeDynamic(type, value, types[i]!)
      tails.push(encoded)
      tailOffset += encoded.length / 2
    } else {
      heads.push(encodeStatic(type, value, types[i]!))
    }
  }

  return heads.join('') + tails.join('')
}

export function encodeStatic(type: string, value: unknown, param?: AbiParameter): string {
  // Fixed-size array must be checked first (before uint/int/bytes match)
  const arrayMatch = type.match(/^(.+)\[(\d+)\]$/)
  if (arrayMatch) {
    return encodeFixedArray(arrayMatch[1]!, parseInt(arrayMatch[2]!), value as readonly unknown[], param)
  }
  if (type === 'address') {
    return encodeAddress(value as string)
  }
  if (type === 'bool') {
    return encodeBool(value as boolean)
  }
  if (type.startsWith('uint')) {
    return encodeUint(value as bigint | number)
  }
  if (type.startsWith('int') && !type.startsWith('internal')) {
    return encodeInt(value as bigint | number, type)
  }
  if (type.startsWith('bytes') && type !== 'bytes') {
    const size = parseInt(type.slice(5))
    return encodeFixedBytes(value as string, size)
  }
  if (type === 'tuple' && param?.components) {
    return encodeTuple(param.components, value as readonly unknown[])
  }

  throw new Error(`Unsupported static type: ${type}`)
}

function encodeDynamic(type: string, value: unknown, param: AbiParameter): string {
  if (type === 'bytes') {
    return encodeDynamicBytes(value as string)
  }
  if (type === 'string') {
    return encodeString(value as string)
  }
  if (type.endsWith('[]')) {
    return encodeDynamicArray(type.slice(0, -2), value as readonly unknown[], param)
  }
  if (type === 'tuple' && param.components) {
    return encodeTuple(param.components, value as readonly unknown[])
  }

  throw new Error(`Unsupported dynamic type: ${type}`)
}

function encodeAddress(value: string): string {
  const addr = value.startsWith('0x') ? value.slice(2) : value
  return padLeft(addr.toLowerCase(), WORD)
}

function encodeBool(value: boolean): string {
  return value ? padLeft('1', WORD) : ZERO_WORD
}

function encodeUint(value: bigint | number): string {
  const n = typeof value === 'number' ? BigInt(value) : value
  if (n < 0n) throw new Error('uint cannot be negative')
  return padLeft(n.toString(16), WORD)
}

function encodeInt(value: bigint | number, type: string): string {
  const n = typeof value === 'number' ? BigInt(value) : value
  const bits = parseInt(type.slice(3)) || 256
  if (n >= 0n) {
    return padLeft(n.toString(16), WORD)
  }
  // Two's complement for negative
  const max = 1n << BigInt(bits)
  const encoded = max + n
  return padLeft(encoded.toString(16), WORD)
}

function encodeFixedBytes(value: string, size: number): string {
  const hex = value.startsWith('0x') ? value.slice(2) : value
  if (hex.length > size * 2) throw new Error(`bytes${size} value too long`)
  return hex.padEnd(WORD, '0')
}

function encodeDynamicBytes(value: string): string {
  const hex = value.startsWith('0x') ? value.slice(2) : value
  const byteLen = hex.length / 2
  const paddedLen = Math.ceil(hex.length / WORD) * WORD
  return padLeft(byteLen.toString(16), WORD) + hex.padEnd(paddedLen, '0')
}

function encodeString(value: string): string {
  const bytes = new TextEncoder().encode(value)
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  const paddedLen = Math.ceil(hex.length / WORD) * WORD
  return padLeft(bytes.length.toString(16), WORD) + hex.padEnd(paddedLen, '0')
}

function encodeTuple(components: AbiParameter[], value: readonly unknown[]): string {
  const vals = Array.isArray(value) ? value : Object.values(value as unknown as Record<string, unknown>)
  return encodeParameters(components, vals)
}

function encodeFixedArray(
  baseType: string,
  length: number,
  value: readonly unknown[],
  param?: AbiParameter,
): string {
  if (value.length !== length) throw new Error(`Expected ${length} elements, got ${value.length}`)
  const params = Array.from({ length }, () => ({ type: baseType, components: param?.components } as AbiParameter))
  return encodeParameters(params, value)
}

function encodeDynamicArray(
  baseType: string,
  value: readonly unknown[],
  param: AbiParameter,
): string {
  const lengthHex = padLeft(value.length.toString(16), WORD)
  const params = Array.from({ length: value.length }, () => ({
    type: baseType,
    components: param.components,
  } as AbiParameter))
  return lengthHex + encodeParameters(params, value)
}

export function isDynamic(type: string): boolean {
  if (type === 'bytes' || type === 'string') return true
  if (type.endsWith('[]')) return true
  // Fixed-size arrays of dynamic types
  const arrayMatch = type.match(/^(.+)\[\d+\]$/)
  if (arrayMatch && isDynamic(arrayMatch[1]!)) return true
  // Tuples can be dynamic if any component is dynamic
  if (type === 'tuple') return true
  return false
}

function padLeft(hex: string, length: number): string {
  return hex.padStart(length, '0')
}
