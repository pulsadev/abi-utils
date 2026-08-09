import { describe, it, expect, expectTypeOf } from 'vitest'
import {
  encodeFunctionData,
  decodeFunctionResult,
  decodeFunctionData,
  getSelector,
} from '../src/codec/function.js'
import type {
  ExtractFunctionNames,
  ExtractEventNames,
  InferFunctionOutputs,
  SolidityToTs,
} from '../src/types/inference.js'
import type { Hex } from '../src/types/abi.js'

const ERC20_ABI = [
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ type: 'uint256', name: 'supply' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ type: 'address', name: 'account' }],
    outputs: [{ type: 'uint256', name: 'balance' }],
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
    type: 'event',
    name: 'Transfer',
    inputs: [
      { type: 'address', name: 'from', indexed: true },
      { type: 'address', name: 'to', indexed: true },
      { type: 'uint256', name: 'value', indexed: false },
    ],
  },
] as const

describe('Type inference', () => {
  describe('SolidityToTs mapping', () => {
    it('should map address to 0x string', () => {
      type Result = SolidityToTs<'address'>
      expectTypeOf<Result>().toEqualTypeOf<`0x${string}`>()
    })

    it('should map bool to boolean', () => {
      type Result = SolidityToTs<'bool'>
      expectTypeOf<Result>().toEqualTypeOf<boolean>()
    })

    it('should map uint256 to bigint', () => {
      type Result = SolidityToTs<'uint256'>
      expectTypeOf<Result>().toEqualTypeOf<bigint>()
    })

    it('should map string to string', () => {
      type Result = SolidityToTs<'string'>
      expectTypeOf<Result>().toEqualTypeOf<string>()
    })

    it('should map bytes to hex string', () => {
      type Result = SolidityToTs<'bytes'>
      expectTypeOf<Result>().toEqualTypeOf<`0x${string}`>()
    })

    it('should map bytes32 to hex string', () => {
      type Result = SolidityToTs<'bytes32'>
      expectTypeOf<Result>().toEqualTypeOf<`0x${string}`>()
    })

    it('should map uint256[] to bigint[]', () => {
      type Result = SolidityToTs<'uint256[]'>
      expectTypeOf<Result>().toEqualTypeOf<bigint[]>()
    })
  })

  describe('ExtractFunctionNames', () => {
    it('should extract function names from ABI', () => {
      type Names = ExtractFunctionNames<typeof ERC20_ABI>
      expectTypeOf<Names>().toEqualTypeOf<'totalSupply' | 'balanceOf' | 'transfer'>()
    })
  })

  describe('ExtractEventNames', () => {
    it('should extract event names from ABI', () => {
      type Names = ExtractEventNames<typeof ERC20_ABI>
      expectTypeOf<Names>().toEqualTypeOf<'Transfer'>()
    })
  })

  describe('encodeFunctionData type safety', () => {
    it('should accept valid function name', () => {
      const data = encodeFunctionData(ERC20_ABI, 'totalSupply')
      expect(data).toBe('0x18160ddd')
    })

    it('should accept valid args for balanceOf', () => {
      const data = encodeFunctionData(ERC20_ABI, 'balanceOf', [
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      ])
      expect(data).toMatch(/^0x70a08231/)
    })

    it('should accept valid args for transfer', () => {
      const data = encodeFunctionData(ERC20_ABI, 'transfer', [
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        1000000n,
      ])
      expect(data).toMatch(/^0xa9059cbb/)
    })
  })

  describe('decodeFunctionResult type safety', () => {
    it('should decode totalSupply with inferred type', () => {
      const hex = ('0x' + '00'.repeat(31) + '0a') as Hex
      const result = decodeFunctionResult(ERC20_ABI, 'totalSupply', hex)
      expect(result.values[0]).toBe(10n)
    })

    it('should decode transfer result', () => {
      const hex = ('0x' + '00'.repeat(31) + '01') as Hex
      const result = decodeFunctionResult(ERC20_ABI, 'transfer', hex)
      expect(result.values[0]).toBe(true)
    })
  })

  describe('getSelector type safety', () => {
    it('should accept valid function names only', () => {
      expect(getSelector(ERC20_ABI, 'totalSupply')).toBe('0x18160ddd')
      expect(getSelector(ERC20_ABI, 'balanceOf')).toBe('0x70a08231')
      expect(getSelector(ERC20_ABI, 'transfer')).toBe('0xa9059cbb')
    })
  })

  describe('decodeFunctionData type safety', () => {
    it('should return function name from ABI', () => {
      const data = encodeFunctionData(ERC20_ABI, 'transfer', [
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        1000000n,
      ])
      const decoded = decodeFunctionData(ERC20_ABI, data)
      expect(decoded.functionName).toBe('transfer')
    })
  })
})
