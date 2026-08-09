import { describe, it, expect } from 'vitest'
import { decodeError } from '../src/codec/error.js'
import type { Abi, Hex } from '../src/types/abi.js'

describe('decodeError', () => {
  const abi: Abi = [
    {
      type: 'error',
      name: 'InsufficientBalance',
      inputs: [
        { type: 'address', name: 'account' },
        { type: 'uint256', name: 'balance' },
      ],
    },
  ]

  it('should decode Error(string)', () => {
    const selector = '08c379a0'
    const offset = '0000000000000000000000000000000000000000000000000000000000000020'
    const length = '0000000000000000000000000000000000000000000000000000000000000014'
    const strBytes = Array.from(new TextEncoder().encode('Insufficient balance'))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .padEnd(64, '0')
    const data = `0x${selector}${offset}${length}${strBytes}` as Hex

    const result = decodeError(abi, data)
    expect(result.errorName).toBe('Error')
    expect(result.args.reason).toBe('Insufficient balance')
  })

  it('should decode Panic(uint256) — overflow', () => {
    const data = ('0x4e487b71' + '0000000000000000000000000000000000000000000000000000000000000011') as Hex
    const result = decodeError(abi, data)
    expect(result.errorName).toBe('Panic')
    expect(result.args.reason).toBe('Arithmetic overflow/underflow')
  })

  it('should decode Panic(uint256) — division by zero', () => {
    const data = ('0x4e487b71' + '0000000000000000000000000000000000000000000000000000000000000012') as Hex
    const result = decodeError(abi, data)
    expect(result.errorName).toBe('Panic')
    expect(result.args.reason).toBe('Division by zero')
  })

  it('should handle unknown selector', () => {
    const data = '0xdeadbeef1234' as Hex
    const result = decodeError(abi, data)
    expect(result.errorName).toBe('UnknownError')
  })

  it('should handle empty data', () => {
    const result = decodeError(abi, '0x' as Hex)
    expect(result.errorName).toBe('UnknownError')
  })
})
