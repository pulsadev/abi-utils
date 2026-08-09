import { describe, it, expect } from 'vitest'
import { keccak256, selector, eventTopic } from '../src/utils/keccak.js'

describe('keccak256', () => {
  it('should compute correct hash for ERC20 signatures', () => {
    expect(selector('totalSupply()')).toBe('18160ddd')
    expect(selector('balanceOf(address)')).toBe('70a08231')
    expect(selector('transfer(address,uint256)')).toBe('a9059cbb')
    expect(selector('approve(address,uint256)')).toBe('095ea7b3')
    expect(selector('transferFrom(address,address,uint256)')).toBe('23b872dd')
  })

  it('should compute correct event topic', () => {
    const topic = eventTopic('Transfer(address,address,uint256)')
    expect(topic).toBe('0x' + keccak256('Transfer(address,address,uint256)'))
    expect(topic).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('should compute correct hash for empty string', () => {
    const hash = keccak256('')
    expect(hash).toHaveLength(64)
    // Known keccak256 of empty string
    expect(hash).toBe('c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470')
  })
})
