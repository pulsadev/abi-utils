import { describe, it, expect } from 'vitest'
import { parseAbi, formatAbi } from '../src/parse/human.js'

describe('parseAbi', () => {
  it('should parse function with no args', () => {
    const abi = parseAbi(['function totalSupply() view returns (uint256)'])
    expect(abi).toHaveLength(1)
    expect(abi[0]!.type).toBe('function')
    const fn = abi[0] as any
    expect(fn.name).toBe('totalSupply')
    expect(fn.inputs).toHaveLength(0)
    expect(fn.outputs).toHaveLength(1)
    expect(fn.outputs[0].type).toBe('uint256')
    expect(fn.stateMutability).toBe('view')
  })

  it('should parse function with args', () => {
    const abi = parseAbi(['function transfer(address to, uint256 amount) returns (bool)'])
    const fn = abi[0] as any
    expect(fn.name).toBe('transfer')
    expect(fn.inputs).toHaveLength(2)
    expect(fn.inputs[0].type).toBe('address')
    expect(fn.inputs[0].name).toBe('to')
    expect(fn.inputs[1].type).toBe('uint256')
    expect(fn.outputs[0].type).toBe('bool')
  })

  it('should parse event', () => {
    const abi = parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)'])
    expect(abi[0]!.type).toBe('event')
    const ev = abi[0] as any
    expect(ev.name).toBe('Transfer')
    expect(ev.inputs).toHaveLength(3)
    expect(ev.inputs[0].indexed).toBe(true)
    expect(ev.inputs[1].indexed).toBe(true)
    expect(ev.inputs[2].indexed).toBe(false)
  })

  it('should parse error', () => {
    const abi = parseAbi(['error InsufficientBalance(address account, uint256 balance)'])
    expect(abi[0]!.type).toBe('error')
    const err = abi[0] as any
    expect(err.name).toBe('InsufficientBalance')
    expect(err.inputs).toHaveLength(2)
  })

  it('should parse multiple signatures', () => {
    const abi = parseAbi([
      'function totalSupply() view returns (uint256)',
      'function balanceOf(address account) view returns (uint256)',
      'event Transfer(address indexed from, address indexed to, uint256 value)',
      'error InsufficientBalance(address account, uint256 balance)',
    ])
    expect(abi).toHaveLength(4)
  })

  it('should throw on invalid signature', () => {
    expect(() => parseAbi(['invalid'])).toThrow('Unsupported')
  })
})

describe('formatAbi', () => {
  it('should round-trip parse → format', () => {
    const sigs = [
      'function totalSupply() view returns (uint256)',
      'function transfer(address to, uint256 amount) returns (bool)',
    ]
    const abi = parseAbi(sigs)
    const formatted = formatAbi(abi)
    expect(formatted[0]).toBe('function totalSupply() view returns (uint256)')
    expect(formatted[1]).toContain('function transfer')
  })
})
