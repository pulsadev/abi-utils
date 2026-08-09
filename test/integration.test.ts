import { describe, it, expect } from 'vitest'
import {
  encodeFunctionData,
  decodeFunctionResult,
  decodeFunctionData,
  decodeError,
  getSelector,
  parseAbi,
  encodeParameters,
  decodeParameters,
  keccak256,
  selector,
} from '../src/index.js'
import type { Abi, Hex, AbiParameter } from '../src/types/abi.js'

const RPC_URL = 'https://ethereum-rpc.publicnode.com'

async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to, data }, 'latest'],
    }),
  })
  const json = (await res.json()) as { result?: string; error?: { message: string } }
  if (json.error) throw new Error(json.error.message)
  return json.result!
}

const ERC20_ABI: Abi = [
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
    name: 'name',
    inputs: [],
    outputs: [{ type: 'string', name: '' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ type: 'string', name: '' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ type: 'uint8', name: '' }],
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
] as const

const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
const VITALIK = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

describe('Integration tests (Ethereum mainnet)', { timeout: 30000 }, () => {

  describe('selectors match known values', () => {
    it('ERC20 selectors are correct', () => {
      expect(getSelector(ERC20_ABI, 'totalSupply')).toBe('0x18160ddd')
      expect(getSelector(ERC20_ABI, 'balanceOf')).toBe('0x70a08231')
      expect(getSelector(ERC20_ABI, 'transfer')).toBe('0xa9059cbb')
      expect(getSelector(ERC20_ABI, 'approve')).toBe('0x095ea7b3')
      expect(getSelector(ERC20_ABI, 'name')).toBe('0x06fdde03')
      expect(getSelector(ERC20_ABI, 'symbol')).toBe('0x95d89b41')
      expect(getSelector(ERC20_ABI, 'decimals')).toBe('0x313ce567')
    })
  })

  describe('USDC totalSupply', () => {
    it('should encode, call, and decode totalSupply', async () => {
      const data = encodeFunctionData(ERC20_ABI, 'totalSupply')
      expect(data).toBe('0x18160ddd')

      const result = await ethCall(USDC, data)
      const decoded = decodeFunctionResult(ERC20_ABI, 'totalSupply', result as Hex)

      const supply = decoded.values[0] as bigint
      expect(supply).toBeGreaterThan(0n)
      // USDC supply should be > 1 billion (6 decimals)
      expect(supply).toBeGreaterThan(1_000_000_000n * 1_000_000n)
    })
  })

  describe('USDC name', () => {
    it('should decode string return value', async () => {
      const data = encodeFunctionData(ERC20_ABI, 'name')
      const result = await ethCall(USDC, data)
      const decoded = decodeFunctionResult(ERC20_ABI, 'name', result as Hex)

      expect(decoded.values[0]).toBe('USD Coin')
    })
  })

  describe('USDC symbol', () => {
    it('should decode symbol', async () => {
      const data = encodeFunctionData(ERC20_ABI, 'symbol')
      const result = await ethCall(USDC, data)
      const decoded = decodeFunctionResult(ERC20_ABI, 'symbol', result as Hex)

      expect(decoded.values[0]).toBe('USDC')
    })
  })

  describe('USDC decimals', () => {
    it('should decode uint8', async () => {
      const data = encodeFunctionData(ERC20_ABI, 'decimals')
      const result = await ethCall(USDC, data)
      const decoded = decodeFunctionResult(ERC20_ABI, 'decimals', result as Hex)

      expect(decoded.values[0]).toBe(6n)
    })
  })

  describe('DAI name', () => {
    it('should decode DAI name', async () => {
      const data = encodeFunctionData(ERC20_ABI, 'name')
      const result = await ethCall(DAI, data)
      const decoded = decodeFunctionResult(ERC20_ABI, 'name', result as Hex)

      expect(decoded.values[0]).toBe('Dai Stablecoin')
    })
  })

  describe('balanceOf with address arg', () => {
    it('should encode address arg and decode uint256 result', async () => {
      const data = encodeFunctionData(ERC20_ABI, 'balanceOf', [VITALIK])
      expect(data).toMatch(/^0x70a08231/)
      expect(data.length).toBe(2 + 8 + 64)

      const result = await ethCall(USDC, data)
      const decoded = decodeFunctionResult(ERC20_ABI, 'balanceOf', result as Hex)

      // Balance is a valid uint256 (could be 0)
      expect(typeof decoded.values[0]).toBe('bigint')
    })
  })

  describe('decodeFunctionData roundtrip', () => {
    it('should encode then decode transfer calldata', () => {
      const encoded = encodeFunctionData(ERC20_ABI, 'transfer', [
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        1_000_000n,
      ])

      const decoded = decodeFunctionData(ERC20_ABI, encoded)
      expect(decoded.functionName).toBe('transfer')
      expect((decoded.args[0] as string).toLowerCase()).toBe(
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      )
      expect(decoded.args[1]).toBe(1_000_000n)
    })

    it('should encode then decode approve calldata', () => {
      const encoded = encodeFunctionData(ERC20_ABI, 'approve', [
        VITALIK,
        2n ** 256n - 1n,
      ])

      const decoded = decodeFunctionData(ERC20_ABI, encoded)
      expect(decoded.functionName).toBe('approve')
      expect(decoded.args[1]).toBe(2n ** 256n - 1n)
    })
  })

  describe('parseAbi then use', () => {
    it('should parse human-readable ABI and encode/decode', async () => {
      const abi = parseAbi([
        'function totalSupply() view returns (uint256)',
        'function name() view returns (string)',
      ]) as Abi

      const data = encodeFunctionData(abi, 'totalSupply')
      expect(data).toBe('0x18160ddd')

      const result = await ethCall(USDC, data)
      const decoded = decodeFunctionResult(abi, 'totalSupply', result as Hex)
      expect(decoded.values[0]).toBeGreaterThan(0n)
    })
  })

  describe('encode/decode all Solidity types', () => {
    it('uint8 to uint256', () => {
      for (const bits of [8, 16, 32, 64, 128, 256]) {
        const types: AbiParameter[] = [{ type: `uint${bits}`, name: 'x' }]
        const val = BigInt(bits)
        const encoded = encodeParameters(types, [val])
        const decoded = decodeParameters(types, encoded)
        expect(decoded[0]).toBe(val)
      }
    })

    it('int8 negative', () => {
      const types: AbiParameter[] = [{ type: 'int8', name: 'x' }]
      const encoded = encodeParameters(types, [-1n])
      const decoded = decodeParameters(types, encoded)
      expect(decoded[0]).toBe(-1n)
    })

    it('int256 large negative', () => {
      const types: AbiParameter[] = [{ type: 'int256', name: 'x' }]
      const val = -(2n ** 128n)
      const encoded = encodeParameters(types, [val])
      const decoded = decodeParameters(types, encoded)
      expect(decoded[0]).toBe(val)
    })

    it('bytes1 to bytes32', () => {
      for (const size of [1, 4, 16, 20, 32]) {
        const types: AbiParameter[] = [{ type: `bytes${size}`, name: 'x' }]
        const val = '0x' + 'ab'.repeat(size)
        const encoded = encodeParameters(types, [val])
        const decoded = decodeParameters(types, encoded)
        expect(decoded[0]).toBe(val)
      }
    })

    it('address zero', () => {
      const types: AbiParameter[] = [{ type: 'address', name: 'x' }]
      const encoded = encodeParameters(types, ['0x0000000000000000000000000000000000000000'])
      const decoded = decodeParameters(types, encoded)
      expect(decoded[0]).toBe('0x0000000000000000000000000000000000000000')
    })

    it('max uint256', () => {
      const types: AbiParameter[] = [{ type: 'uint256', name: 'x' }]
      const max = 2n ** 256n - 1n
      const encoded = encodeParameters(types, [max])
      const decoded = decodeParameters(types, encoded)
      expect(decoded[0]).toBe(max)
    })
  })

  describe('keccak256 known vectors', () => {
    it('empty string', () => {
      expect(keccak256('')).toBe('c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470')
    })

    it('ERC20 Transfer event', () => {
      const hash = keccak256('Transfer(address,address,uint256)')
      expect(hash).toBe('ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef')
    })

    it('ERC20 Approval event', () => {
      const hash = keccak256('Approval(address,address,uint256)')
      expect(hash).toBe('8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925')
    })
  })
})
