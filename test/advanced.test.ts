import { describe, it, expect } from 'vitest'
import { encodeParameters } from '../src/codec/encode.js'
import { decodeParameters } from '../src/codec/decode.js'
import type { AbiParameter } from '../src/types/abi.js'

describe('tuple (struct) encoding/decoding', () => {
  it('should encode and decode simple tuple', () => {
    const types: AbiParameter[] = [{
      type: 'tuple',
      name: 'order',
      components: [
        { type: 'address', name: 'maker' },
        { type: 'uint256', name: 'amount' },
        { type: 'bool', name: 'active' },
      ],
    }]
    const values = [['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 1000n, true]]
    const encoded = encodeParameters(types, values)
    const decoded = decodeParameters(types, encoded) as any[]
    const tuple = decoded[0] as Record<string, unknown>
    expect((tuple.maker as string).toLowerCase()).toBe('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')
    expect(tuple.amount).toBe(1000n)
    expect(tuple.active).toBe(true)
  })

  it('should encode and decode nested tuple', () => {
    const types: AbiParameter[] = [{
      type: 'tuple',
      name: 'data',
      components: [
        { type: 'address', name: 'token' },
        {
          type: 'tuple',
          name: 'config',
          components: [
            { type: 'uint256', name: 'fee' },
            { type: 'bool', name: 'enabled' },
          ],
        },
      ],
    }]
    const values = [['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', [500n, true]]]
    const encoded = encodeParameters(types, values)
    const decoded = decodeParameters(types, encoded) as any[]
    const tuple = decoded[0] as Record<string, any>
    expect((tuple.token as string).toLowerCase()).toBe('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')
    expect(tuple.config.fee).toBe(500n)
    expect(tuple.config.enabled).toBe(true)
  })
})

describe('dynamic array encoding/decoding', () => {
  it('should encode and decode uint256[]', () => {
    const types: AbiParameter[] = [{ type: 'uint256[]', name: 'values' }]
    const values = [[10n, 20n, 30n, 40n, 50n]]
    const encoded = encodeParameters(types, values)
    const decoded = decodeParameters(types, encoded) as any[]
    const arr = decoded[0] as bigint[]
    expect(arr).toHaveLength(5)
    expect(arr[0]).toBe(10n)
    expect(arr[4]).toBe(50n)
  })

  it('should encode and decode address[]', () => {
    const types: AbiParameter[] = [{ type: 'address[]', name: 'addrs' }]
    const addrs = [
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    ]
    const encoded = encodeParameters(types, [addrs])
    const decoded = decodeParameters(types, encoded) as any[]
    const result = decoded[0] as string[]
    expect(result).toHaveLength(3)
    expect(result[0]!.toLowerCase()).toBe(addrs[0]!.toLowerCase())
    expect(result[2]!.toLowerCase()).toBe(addrs[2]!.toLowerCase())
  })

  it('should encode and decode bool[]', () => {
    const types: AbiParameter[] = [{ type: 'bool[]', name: 'flags' }]
    const encoded = encodeParameters(types, [[true, false, true, true]])
    const decoded = decodeParameters(types, encoded) as any[]
    const arr = decoded[0] as boolean[]
    expect(arr).toEqual([true, false, true, true])
  })

  it('should encode and decode empty array', () => {
    const types: AbiParameter[] = [{ type: 'uint256[]', name: 'values' }]
    const encoded = encodeParameters(types, [[]])
    const decoded = decodeParameters(types, encoded) as any[]
    const arr = decoded[0] as bigint[]
    expect(arr).toHaveLength(0)
  })

  it('should encode and decode string[]', () => {
    const types: AbiParameter[] = [{ type: 'string[]', name: 'names' }]
    const encoded = encodeParameters(types, [['hello', 'world', 'test']])
    const decoded = decodeParameters(types, encoded) as any[]
    const arr = decoded[0] as string[]
    expect(arr).toHaveLength(3)
    expect(arr[0]).toBe('hello')
    expect(arr[1]).toBe('world')
    expect(arr[2]).toBe('test')
  })
})

describe('fixed-size array encoding/decoding', () => {
  it('should encode and decode uint256[3]', () => {
    const types: AbiParameter[] = [{ type: 'uint256[3]', name: 'values' }]
    const encoded = encodeParameters(types, [[100n, 200n, 300n]])
    const decoded = decodeParameters(types, encoded) as any[]
    const arr = decoded[0] as bigint[]
    expect(arr).toHaveLength(3)
    expect(arr[0]).toBe(100n)
    expect(arr[2]).toBe(300n)
  })

  it('should throw on wrong array length', () => {
    const types: AbiParameter[] = [{ type: 'uint256[3]', name: 'values' }]
    expect(() => encodeParameters(types, [[100n, 200n]])).toThrow('Expected 3')
  })
})

describe('mixed static + dynamic params', () => {
  it('should encode address + uint256[] + bool', () => {
    const types: AbiParameter[] = [
      { type: 'address', name: 'to' },
      { type: 'uint256[]', name: 'amounts' },
      { type: 'bool', name: 'flag' },
    ]
    const addr = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
    const encoded = encodeParameters(types, [addr, [100n, 200n], true])
    const decoded = decodeParameters(types, encoded) as any[]
    expect((decoded[0] as string).toLowerCase()).toBe(addr.toLowerCase())
    expect((decoded[1] as bigint[])[0]).toBe(100n)
    expect((decoded[1] as bigint[])[1]).toBe(200n)
    expect(decoded[2]).toBe(true)
  })

  it('should encode string + uint256 + bytes', () => {
    const types: AbiParameter[] = [
      { type: 'string', name: 'name' },
      { type: 'uint256', name: 'value' },
      { type: 'bytes', name: 'data' },
    ]
    const encoded = encodeParameters(types, ['hello', 42n, '0xdeadbeef'])
    const decoded = decodeParameters(types, encoded) as any[]
    expect(decoded[0]).toBe('hello')
    expect(decoded[1]).toBe(42n)
    expect(decoded[2]).toBe('0xdeadbeef')
  })

  it('should encode multiple strings', () => {
    const types: AbiParameter[] = [
      { type: 'string', name: 'a' },
      { type: 'string', name: 'b' },
      { type: 'string', name: 'c' },
    ]
    const encoded = encodeParameters(types, ['hello', 'world', 'test'])
    const decoded = decodeParameters(types, encoded) as any[]
    expect(decoded[0]).toBe('hello')
    expect(decoded[1]).toBe('world')
    expect(decoded[2]).toBe('test')
  })
})

describe('edge cases', () => {
  it('should handle zero uint256', () => {
    const types: AbiParameter[] = [{ type: 'uint256', name: 'x' }]
    const encoded = encodeParameters(types, [0n])
    const decoded = decodeParameters(types, encoded)
    expect(decoded[0]).toBe(0n)
  })

  it('should handle negative int128', () => {
    const types: AbiParameter[] = [{ type: 'int128', name: 'x' }]
    const val = -(2n ** 64n)
    const encoded = encodeParameters(types, [val])
    const decoded = decodeParameters(types, encoded)
    expect(decoded[0]).toBe(val)
  })

  it('should handle single byte bytes1', () => {
    const types: AbiParameter[] = [{ type: 'bytes1', name: 'x' }]
    const encoded = encodeParameters(types, ['0xff'])
    const decoded = decodeParameters(types, encoded)
    expect(decoded[0]).toBe('0xff')
  })

  it('should handle long string (> 32 bytes)', () => {
    const types: AbiParameter[] = [{ type: 'string', name: 's' }]
    const longStr = 'a'.repeat(100)
    const encoded = encodeParameters(types, [longStr])
    const decoded = decodeParameters(types, encoded)
    expect(decoded[0]).toBe(longStr)
  })

  it('should handle large bytes (> 32 bytes)', () => {
    const types: AbiParameter[] = [{ type: 'bytes', name: 'data' }]
    const bigData = '0x' + 'ab'.repeat(100)
    const encoded = encodeParameters(types, [bigData])
    const decoded = decodeParameters(types, encoded)
    expect(decoded[0]).toBe(bigData)
  })
})
