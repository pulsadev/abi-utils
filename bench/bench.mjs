import {
  encodeFunctionData,
  decodeFunctionResult,
  encodeParameters,
  decodeParameters,
  encodePacked,
  keccak256,
  selector,
  parseAbi,
} from '../dist/index.js'

const ERC20_ABI = [
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
    name: 'balanceOf',
    inputs: [{ type: 'address', name: 'account' }],
    outputs: [{ type: 'uint256', name: '' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ type: 'uint256', name: '' }],
    stateMutability: 'view',
  },
]

const ADDR = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const RESULT_HEX = '0x' + '00'.repeat(31) + '0a'

function bench(name, fn, iterations = 10000) {
  // Warmup
  for (let i = 0; i < 100; i++) fn()

  const start = performance.now()
  for (let i = 0; i < iterations; i++) fn()
  const elapsed = performance.now() - start
  const opsPerSec = Math.round(iterations / (elapsed / 1000))
  console.log(`  ${name}: ${elapsed.toFixed(1)}ms (${opsPerSec.toLocaleString()} ops/sec)`)
  return { name, elapsed, opsPerSec }
}

console.log('='.repeat(60))
console.log('@pulsadev/abi-utils — Performance Benchmark')
console.log('='.repeat(60))
console.log('')

console.log('--- keccak256 ---')
bench('keccak256("transfer(address,uint256)")', () => {
  keccak256('transfer(address,uint256)')
})
bench('selector("balanceOf(address)")', () => {
  selector('balanceOf(address)')
})

console.log('')
console.log('--- encodeFunctionData ---')
bench('encode transfer(address,uint256)', () => {
  encodeFunctionData(ERC20_ABI, 'transfer', [ADDR, 1000000n])
})
bench('encode balanceOf(address)', () => {
  encodeFunctionData(ERC20_ABI, 'balanceOf', [ADDR])
})
bench('encode totalSupply()', () => {
  encodeFunctionData(ERC20_ABI, 'totalSupply')
})

console.log('')
console.log('--- decodeFunctionResult ---')
bench('decode uint256 result', () => {
  decodeFunctionResult(ERC20_ABI, 'totalSupply', RESULT_HEX)
})

console.log('')
console.log('--- encodeParameters (raw) ---')
bench('encode (address, uint256)', () => {
  encodeParameters(
    [{ type: 'address', name: 'to' }, { type: 'uint256', name: 'amount' }],
    [ADDR, 1000000n],
  )
})
bench('encode (string)', () => {
  encodeParameters([{ type: 'string', name: 's' }], ['hello world'])
})
bench('encode (uint256[5])', () => {
  encodeParameters(
    [{ type: 'uint256[]', name: 'values' }],
    [[10n, 20n, 30n, 40n, 50n]],
  )
})

console.log('')
console.log('--- encodePacked ---')
bench('encodePacked(address, uint256)', () => {
  encodePacked(['address', 'uint256'], [ADDR, 1n])
})

console.log('')
console.log('--- parseAbi ---')
bench('parseAbi (3 signatures)', () => {
  parseAbi([
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
  ])
})

console.log('')
console.log('--- Bundle size ---')
import { readFileSync } from 'fs'
const esm = readFileSync(new URL('../dist/index.js', import.meta.url))
const cjs = readFileSync(new URL('../dist/index.cjs', import.meta.url))
console.log(`  ESM: ${(esm.length / 1024).toFixed(1)} KB`)
console.log(`  CJS: ${(cjs.length / 1024).toFixed(1)} KB`)
console.log(`  Dependencies: 0`)
