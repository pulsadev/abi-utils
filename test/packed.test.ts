import { describe, it, expect } from 'vitest'
import { encodePacked } from '../src/codec/packed.js'

describe('encodePacked', () => {
  it('should pack address', () => {
    const result = encodePacked(['address'], ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'])
    expect(result).toBe('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')
  })

  it('should pack uint8', () => {
    const result = encodePacked(['uint8'], [255])
    expect(result).toBe('0xff')
  })

  it('should pack uint16', () => {
    const result = encodePacked(['uint16'], [256])
    expect(result).toBe('0x0100')
  })

  it('should pack uint256', () => {
    const result = encodePacked(['uint256'], [1n])
    expect(result).toBe('0x' + '00'.repeat(31) + '01')
  })

  it('should pack bool', () => {
    expect(encodePacked(['bool'], [true])).toBe('0x01')
    expect(encodePacked(['bool'], [false])).toBe('0x00')
  })

  it('should pack string', () => {
    const result = encodePacked(['string'], ['hello'])
    expect(result).toBe('0x68656c6c6f')
  })

  it('should pack bytes', () => {
    const result = encodePacked(['bytes'], ['0xdeadbeef'])
    expect(result).toBe('0xdeadbeef')
  })

  it('should pack bytes4', () => {
    const result = encodePacked(['bytes4'], ['0x12345678'])
    expect(result).toBe('0x12345678')
  })

  it('should pack multiple types', () => {
    const result = encodePacked(
      ['address', 'uint256'],
      ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 1n],
    )
    expect(result).toBe('0xd8da6bf26964af9d7eed9e03e53415d37aa96045' + '00'.repeat(31) + '01')
  })

  it('should pack address + string (for CREATE2 salt)', () => {
    const result = encodePacked(
      ['address', 'string'],
      ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 'test'],
    )
    expect(result).toBe('0xd8da6bf26964af9d7eed9e03e53415d37aa9604574657374')
  })

  it('should pack int8 negative', () => {
    const result = encodePacked(['int8'], [-1])
    expect(result).toBe('0xff')
  })

  it('should throw on param count mismatch', () => {
    expect(() => encodePacked(['uint8'], [1, 2])).toThrow('Expected 1')
  })
})
