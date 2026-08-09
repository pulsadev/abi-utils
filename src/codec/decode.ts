import type { Hex, AbiParameter } from '../types/abi.js'
import { isDynamic } from './encode.js'

const WORD = 64

export function decodeParameters(types: AbiParameter[], data: string): readonly unknown[] {
  const hex = data.startsWith('0x') ? data.slice(2) : data
  const results: unknown[] = []

  for (let i = 0; i < types.length; i++) {
    const type = types[i]!.type
    const offset = i * WORD

    if (isDynamic(type)) {
      const dataOffset = hexToInt(hex, offset) * 2
      results.push(decodeDynamic(type, hex, dataOffset, types[i]!))
    } else {
      results.push(decodeStatic(type, hex, offset, types[i]!))
    }
  }

  return results
}

export function decodeStatic(type: string, hex: string, offset: number, param?: AbiParameter): unknown {
  // Fixed-size array must be checked first
  const arrayMatch = type.match(/^(.+)\[(\d+)\]$/)
  if (arrayMatch) {
    return decodeFixedArray(arrayMatch[1]!, parseInt(arrayMatch[2]!), hex, offset, param)
  }

  const word = hex.slice(offset, offset + WORD)

  if (type === 'address') {
    return ('0x' + word.slice(24)) as Hex
  }
  if (type === 'bool') {
    return word[WORD - 1] === '1'
  }
  if (type.startsWith('uint')) {
    return BigInt('0x' + word)
  }
  if (type.startsWith('int') && !type.startsWith('internal')) {
    return decodeInt(word, type)
  }
  if (type.startsWith('bytes') && type !== 'bytes') {
    const size = parseInt(type.slice(5))
    return ('0x' + word.slice(0, size * 2)) as Hex
  }
  if (type === 'tuple' && param?.components) {
    return decodeTuple(param.components, hex, offset)
  }

  return ('0x' + word) as Hex
}

function decodeDynamic(type: string, hex: string, offset: number, param: AbiParameter): unknown {
  if (type === 'bytes') {
    return decodeDynamicBytes(hex, offset)
  }
  if (type === 'string') {
    return decodeString(hex, offset)
  }
  if (type.endsWith('[]')) {
    return decodeDynamicArray(type.slice(0, -2), hex, offset, param)
  }
  if (type === 'tuple' && param.components) {
    return decodeTuple(param.components, hex, offset)
  }

  throw new Error(`Unsupported dynamic type: ${type}`)
}

function decodeInt(word: string, type: string): bigint {
  const bits = parseInt(type.slice(3)) || 256
  const value = BigInt('0x' + word)
  const max = 1n << BigInt(bits)
  const half = max >> 1n
  return value >= half ? value - max : value
}

function decodeDynamicBytes(hex: string, offset: number): Hex {
  const length = hexToInt(hex, offset)
  return ('0x' + hex.slice(offset + WORD, offset + WORD + length * 2)) as Hex
}

function decodeString(hex: string, offset: number): string {
  const length = hexToInt(hex, offset)
  const strHex = hex.slice(offset + WORD, offset + WORD + length * 2)
  const bytes = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(strHex.slice(i * 2, i * 2 + 2), 16)
  }
  return new TextDecoder().decode(bytes)
}

function decodeTuple(components: AbiParameter[], hex: string, offset: number): Record<string, unknown> {
  const tupleHex = hex.slice(offset)
  const values = decodeParameters(components, tupleHex)
  const result: Record<string, unknown> = {}
  for (let i = 0; i < components.length; i++) {
    const name = components[i]!.name || `_${i}`
    result[name] = values[i]
  }
  return result
}

function decodeFixedArray(
  baseType: string,
  length: number,
  hex: string,
  offset: number,
  param?: AbiParameter,
): readonly unknown[] {
  const results: unknown[] = []
  for (let i = 0; i < length; i++) {
    results.push(decodeStatic(baseType, hex, offset + i * WORD, param))
  }
  return results
}

function decodeDynamicArray(
  baseType: string,
  hex: string,
  offset: number,
  param: AbiParameter,
): readonly unknown[] {
  const length = hexToInt(hex, offset)
  const arrayHex = hex.slice(offset + WORD)
  const params = Array.from({ length }, () => ({
    type: baseType,
    components: param.components,
  } as AbiParameter))
  return decodeParameters(params, arrayHex)
}

function hexToInt(hex: string, offset: number): number {
  return parseInt(hex.slice(offset + 48, offset + WORD), 16)
}
