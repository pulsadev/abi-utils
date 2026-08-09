import { describe, it, expect } from 'vitest'
import { decodeEventLog, getEventTopic, encodeEventTopics } from '../src/codec/event.js'
import { keccak256 } from '../src/utils/keccak.js'
import type { Abi, Hex } from '../src/types/abi.js'

const RPC_URL = 'https://ethereum-rpc.publicnode.com'

const ERC20_ABI: Abi = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { type: 'address', name: 'from', indexed: true },
      { type: 'address', name: 'to', indexed: true },
      { type: 'uint256', name: 'value', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Approval',
    inputs: [
      { type: 'address', name: 'owner', indexed: true },
      { type: 'address', name: 'spender', indexed: true },
      { type: 'uint256', name: 'value', indexed: false },
    ],
  },
] as const

const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

async function rpc(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const json = (await res.json()) as { result?: unknown; error?: { message: string } }
  if (json.error) throw new Error(json.error.message)
  return json.result
}

describe('Event integration tests (Ethereum mainnet)', { timeout: 30000 }, () => {

  describe('getEventTopic', () => {
    it('should match known Transfer topic', () => {
      const topic = getEventTopic(ERC20_ABI, 'Transfer')
      const expected = '0x' + keccak256('Transfer(address,address,uint256)')
      expect(topic).toBe(expected)
      expect(topic).toBe('0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef')
    })

    it('should match known Approval topic', () => {
      const topic = getEventTopic(ERC20_ABI, 'Approval')
      const expected = '0x' + keccak256('Approval(address,address,uint256)')
      expect(topic).toBe(expected)
      expect(topic).toBe('0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925')
    })
  })

  describe('encodeEventTopics', () => {
    it('should encode Transfer topic without filters', () => {
      const topics = encodeEventTopics(ERC20_ABI, 'Transfer')
      expect(topics).toHaveLength(1)
      expect(topics[0]).toBe('0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef')
    })
  })

  describe('decodeEventLog — real USDC Transfer logs', () => {
    it('should fetch and decode real Transfer events', async () => {
      const transferTopic = getEventTopic(ERC20_ABI, 'Transfer')

      // Get latest block
      const latestBlock = await rpc('eth_blockNumber', []) as string

      // Search last 100 blocks for USDC Transfer events
      const fromBlock = '0x' + (parseInt(latestBlock, 16) - 100).toString(16)

      const logs = await rpc('eth_getLogs', [{
        address: USDC,
        topics: [transferTopic],
        fromBlock,
        toBlock: 'latest',
      }]) as Array<{
        topics: string[]
        data: string
        address: string
        blockNumber: string
        transactionHash: string
      }>

      expect(logs.length).toBeGreaterThan(0)

      // Decode first log
      const log = logs[0]!
      const decoded = decodeEventLog(
        ERC20_ABI,
        log.topics as Hex[],
        log.data as Hex,
      )

      expect(decoded.eventName).toBe('Transfer')
      expect(decoded.args.from).toBeDefined()
      expect(decoded.args.to).toBeDefined()
      expect(decoded.args.value).toBeDefined()

      // from and to should be addresses
      const from = decoded.args.from as string
      const to = decoded.args.to as string
      expect(from).toMatch(/^0x[0-9a-f]{40}$/)
      expect(to).toMatch(/^0x[0-9a-f]{40}$/)

      // value should be a bigint >= 0
      const value = decoded.args.value as bigint
      expect(typeof value).toBe('bigint')
      expect(value).toBeGreaterThanOrEqual(0n)

      // Decode multiple logs to verify consistency
      let decoded_count = 0
      for (const l of logs.slice(0, 10)) {
        const d = decodeEventLog(ERC20_ABI, l.topics as Hex[], l.data as Hex)
        expect(d.eventName).toBe('Transfer')
        expect(d.args.from).toMatch(/^0x[0-9a-f]{40}$/)
        expect(d.args.to).toMatch(/^0x[0-9a-f]{40}$/)
        expect(typeof d.args.value).toBe('bigint')
        decoded_count++
      }
      expect(decoded_count).toBeGreaterThan(0)
    })

    it('should fetch and decode real Approval events', async () => {
      const approvalTopic = getEventTopic(ERC20_ABI, 'Approval')
      const latestBlock = await rpc('eth_blockNumber', []) as string
      const fromBlock = '0x' + (parseInt(latestBlock, 16) - 50).toString(16)

      const logs = await rpc('eth_getLogs', [{
        address: USDC,
        topics: [approvalTopic],
        fromBlock,
        toBlock: 'latest',
      }]) as Array<{
        topics: string[]
        data: string
      }>

      if (logs.length > 0) {
        const log = logs[0]!
        const decoded = decodeEventLog(
          ERC20_ABI,
          log.topics as Hex[],
          log.data as Hex,
        )
        expect(decoded.eventName).toBe('Approval')
        expect(decoded.args.owner).toMatch(/^0x[0-9a-f]{40}$/)
        expect(decoded.args.spender).toMatch(/^0x[0-9a-f]{40}$/)
        expect(typeof decoded.args.value).toBe('bigint')
      }
    })
  })

  describe('decodeEventLog — verify against known data', () => {
    it('should decode a manually constructed Transfer log', () => {
      const topics: Hex[] = [
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
        ('0x' + '00'.repeat(12) + 'd8da6bf26964af9d7eed9e03e53415d37aa96045') as Hex,
        ('0x' + '00'.repeat(12) + 'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48') as Hex,
      ]
      const data = ('0x' + '00'.repeat(31) + '64') as Hex // value = 100

      const decoded = decodeEventLog(ERC20_ABI, topics, data)
      expect(decoded.eventName).toBe('Transfer')
      expect((decoded.args.from as string).toLowerCase()).toBe('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')
      expect((decoded.args.to as string).toLowerCase()).toBe('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')
      expect(decoded.args.value).toBe(100n)
    })
  })
})
