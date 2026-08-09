import { describe, it, expect } from 'vitest'
import { encodeParameters } from '../src/codec/encode.js'
import { decodeParameters } from '../src/codec/decode.js'
import type { AbiParameter } from '../src/types/abi.js'

describe('encodeParameters + decodeParameters', () => {
  it('should encode and decode uint256', () => {
    const types: AbiParameter[] = [{ type: 'uint256', name: 'x' }]
    const encoded = encodeParameters(types, [42n])
    const decoded = decodeParameters(types, encoded)
    expect(decoded[0]).toBe(42n)
  })

  it('should encode and decode address', () => {
    const types: AbiParameter[] = [{ type: 'address', name: 'addr' }]
    const addr = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
    const encoded = encodeParameters(types, [addr])
    const decoded = decodeParameters(types, encoded)
    expect((decoded[0] as string).toLowerCase()).toBe(addr.toLowerCase())
  })

  it('should encode and decode bool', () => {
    const types: AbiParameter[] = [{ type: 'bool', name: 'flag' }]
    const encoded = encodeParameters(types, [true])
    const decoded = decodeParameters(types, encoded)
    expect(decoded[0]).toBe(true)

    const encoded2 = encodeParameters(types, [false])
    const decoded2 = decodeParameters(types, encoded2)
    expect(decoded2[0]).toBe(false)
  })

  it('should encode and decode int256 (positive)', () => {
    const types: AbiParameter[] = [{ type: 'int256', name: 'x' }]
    const encoded = encodeParameters(types, [100n])
    const decoded = decodeParameters(types, encoded)
    expect(decoded[0]).toBe(100n)
  })

  it('should encode and decode int256 (negative)', () => {
    const types: AbiParameter[] = [{ type: 'int256', name: 'x' }]
    const encoded = encodeParameters(types, [-100n])
    const decoded = decodeParameters(types, encoded)
    expect(decoded[0]).toBe(-100n)
  })

  it('should encode and decode bytes32', () => {
    const types: AbiParameter[] = [{ type: 'bytes32', name: 'hash' }]
    const val = '0x' + 'ab'.repeat(32)
    const encoded = encodeParameters(types, [val])
    const decoded = decodeParameters(types, encoded)
    expect(decoded[0]).toBe(val)
  })

  it('should encode and decode string', () => {
    const types: AbiParameter[] = [{ type: 'string', name: 'str' }]
    const encoded = encodeParameters(types, ['hello world'])
    const decoded = decodeParameters(types, encoded)
    expect(decoded[0]).toBe('hello world')
  })

  it('should encode and decode bytes', () => {
    const types: AbiParameter[] = [{ type: 'bytes', name: 'data' }]
    const val = '0xdeadbeef'
    const encoded = encodeParameters(types, [val])
    const decoded = decodeParameters(types, encoded)
    expect(decoded[0]).toBe(val)
  })

  it('should encode and decode multiple params', () => {
    const types: AbiParameter[] = [
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'amount' },
      { type: 'bool', name: 'flag' },
    ]
    const addr = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    const encoded = encodeParameters(types, [addr, 1000n, true])
    const decoded = decodeParameters(types, encoded)
    expect((decoded[0] as string).toLowerCase()).toBe(addr.toLowerCase())
    expect(decoded[1]).toBe(1000n)
    expect(decoded[2]).toBe(true)
  })

  it('should encode and decode uint8', () => {
    const types: AbiParameter[] = [{ type: 'uint8', name: 'x' }]
    const encoded = encodeParameters(types, [255])
    const decoded = decodeParameters(types, encoded)
    expect(decoded[0]).toBe(255n)
  })

  it('should encode and decode empty string', () => {
    const types: AbiParameter[] = [{ type: 'string', name: 's' }]
    const encoded = encodeParameters(types, [''])
    const decoded = decodeParameters(types, encoded)
    expect(decoded[0]).toBe('')
  })

  it('should encode and decode unicode string', () => {
    const types: AbiParameter[] = [{ type: 'string', name: 's' }]
    const encoded = encodeParameters(types, ['hello 🔥'])
    const decoded = decodeParameters(types, encoded)
    expect(decoded[0]).toBe('hello 🔥')
  })

  it('should throw on param count mismatch', () => {
    const types: AbiParameter[] = [{ type: 'uint256', name: 'x' }]
    expect(() => encodeParameters(types, [1n, 2n])).toThrow('Expected 1')
  })
})
