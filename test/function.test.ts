import { describe, it, expect } from 'vitest'
import { encodeFunctionData, decodeFunctionResult, decodeFunctionData, getSelector } from '../src/codec/function.js'
import type { Abi } from '../src/types/abi.js'

const ERC20_ABI: Abi = [
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ type: 'uint256', name: '' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ type: 'address', name: 'account' }],
    outputs: [{ type: 'uint256', name: '' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'amount' },
    ],
    outputs: [{ type: 'bool', name: '' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { type: 'address', name: 'spender' },
      { type: 'uint256', name: 'amount' },
    ],
    outputs: [{ type: 'bool', name: '' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [{ type: 'string', name: '' }],
    stateMutability: 'view',
  },
] as const

describe('encodeFunctionData', () => {
  it('should encode totalSupply()', () => {
    const data = encodeFunctionData(ERC20_ABI, 'totalSupply')
    expect(data).toBe('0x18160ddd')
  })

  it('should encode balanceOf(address)', () => {
    const data = encodeFunctionData(ERC20_ABI, 'balanceOf', [
      '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    ])
    expect(data).toMatch(/^0x70a08231/)
    expect(data.length).toBe(2 + 8 + 64) // 0x + selector + address
  })

  it('should encode transfer(address,uint256)', () => {
    const data = encodeFunctionData(ERC20_ABI, 'transfer', [
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      1000000n,
    ])
    expect(data).toMatch(/^0xa9059cbb/)
    expect(data.length).toBe(2 + 8 + 64 + 64)
  })

  it('should throw for unknown function', () => {
    expect(() => encodeFunctionData(ERC20_ABI, 'nonExistent')).toThrow('not found')
  })
})

describe('getSelector', () => {
  it('should return correct selectors', () => {
    expect(getSelector(ERC20_ABI, 'totalSupply')).toBe('0x18160ddd')
    expect(getSelector(ERC20_ABI, 'balanceOf')).toBe('0x70a08231')
    expect(getSelector(ERC20_ABI, 'transfer')).toBe('0xa9059cbb')
    expect(getSelector(ERC20_ABI, 'approve')).toBe('0x095ea7b3')
  })
})

describe('decodeFunctionResult', () => {
  it('should decode uint256 result', () => {
    const hex = ('0x' + '00'.repeat(31) + '0a') as `0x${string}`
    const result = decodeFunctionResult(ERC20_ABI, 'totalSupply', hex)
    expect(result.values[0]).toBe(10n)
  })

  it('should decode bool result', () => {
    const hex = ('0x' + '00'.repeat(31) + '01') as `0x${string}`
    const result = decodeFunctionResult(ERC20_ABI, 'transfer', hex)
    expect(result.values[0]).toBe(true)
  })
})

describe('decodeFunctionData', () => {
  it('should decode calldata back to function + args', () => {
    const data = encodeFunctionData(ERC20_ABI, 'transfer', [
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      1000000n,
    ])
    const decoded = decodeFunctionData(ERC20_ABI, data)
    expect(decoded.functionName).toBe('transfer')
    expect((decoded.args[0] as string).toLowerCase()).toBe(
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    )
    expect(decoded.args[1]).toBe(1000000n)
  })

  it('should decode no-arg function', () => {
    const data = encodeFunctionData(ERC20_ABI, 'totalSupply')
    const decoded = decodeFunctionData(ERC20_ABI, data)
    expect(decoded.functionName).toBe('totalSupply')
    expect(decoded.args).toHaveLength(0)
  })
})
