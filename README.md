# @pulsadev/abi-utils

Standalone ABI encoding, decoding, and TypeScript inference for EVM — zero dependencies.

Encode function calls, decode results, parse events, decode errors, and compute selectors without importing ethers, viem, or web3. One package, 24 KB, works everywhere.

## Features

- **Full ABI codec** — encodeFunctionData, decodeFunctionResult, decodeFunctionData
- **Event support** — encodeEventTopics, decodeEventLog with indexed parameter handling
- **Error decoding** — Error(string), Panic(uint256), and custom errors
- **encodePacked** — Solidity `abi.encodePacked` equivalent
- **Human-readable ABI** — parseAbi / formatAbi
- **TypeScript inference** — function names, input/output types inferred from ABI
- **Selector caching** — keccak256 computed once per signature, cached for subsequent calls
- **keccak256 built-in** — pure implementation, no crypto dependencies
- **Zero dependencies** — ~24 KB bundled, ESM + CJS
- **Works everywhere** — Node.js, Deno, Bun, browsers

## Install

```bash
npm install @pulsadev/abi-utils
# or
pnpm add @pulsadev/abi-utils
# or
yarn add @pulsadev/abi-utils
```

## Quick Start

```typescript
import {
  encodeFunctionData,
  decodeFunctionResult,
  parseAbi,
} from '@pulsadev/abi-utils'

// Define ABI (JSON or human-readable)
const abi = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
])

// Encode calldata
const data = encodeFunctionData(abi, 'balanceOf', [
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
])
// '0x70a08231000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045'

// Decode result
const result = decodeFunctionResult(abi, 'balanceOf', returnData)
console.log(result.values[0]) // bigint
```

## API

### Function Encoding / Decoding

```typescript
import {
  encodeFunctionData,
  decodeFunctionResult,
  decodeFunctionData,
  getSelector,
} from '@pulsadev/abi-utils'

// Encode a function call
const calldata = encodeFunctionData(abi, 'transfer', [to, amount])

// Decode a return value
const result = decodeFunctionResult(abi, 'transfer', returnData)
console.log(result.values[0]) // bool
console.log(result.named)     // { '': true }

// Decode calldata back to function name + args
const { functionName, args } = decodeFunctionData(abi, calldata)

// Get function selector
const selector = getSelector(abi, 'transfer') // '0xa9059cbb'
```

### Event Encoding / Decoding

```typescript
import {
  encodeEventTopics,
  decodeEventLog,
  getEventTopic,
} from '@pulsadev/abi-utils'

// Get event topic hash
const topic = getEventTopic(abi, 'Transfer')
// '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

// Encode topics for filtering
const topics = encodeEventTopics(abi, 'Transfer')

// Decode a log entry
const { eventName, args } = decodeEventLog(abi, log.topics, log.data)
console.log(args.from)  // '0x...'
console.log(args.to)    // '0x...'
console.log(args.value) // bigint
```

### Error Decoding

```typescript
import { decodeError } from '@pulsadev/abi-utils'

// Decode revert data
const { errorName, args } = decodeError(abi, revertData)

// Built-in Error(string)
// → { errorName: 'Error', args: { reason: 'Insufficient balance' } }

// Built-in Panic(uint256)
// → { errorName: 'Panic', args: { code: 0x11n, reason: 'Arithmetic overflow/underflow' } }

// Custom errors
// → { errorName: 'InsufficientBalance', args: { account: '0x...', balance: 0n } }
```

### encodePacked

```typescript
import { encodePacked } from '@pulsadev/abi-utils'

// Equivalent to Solidity's abi.encodePacked
const packed = encodePacked(
  ['address', 'uint256'],
  ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 1000000n],
)
```

### Raw Parameter Encoding

```typescript
import { encodeParameters, decodeParameters } from '@pulsadev/abi-utils'

// Encode raw parameters
const encoded = encodeParameters(
  [{ type: 'address', name: 'to' }, { type: 'uint256', name: 'amount' }],
  ['0xd8dA...6045', 1000000n],
)

// Decode raw parameters
const values = decodeParameters(
  [{ type: 'address', name: 'to' }, { type: 'uint256', name: 'amount' }],
  encoded,
)
```

### Human-Readable ABI

```typescript
import { parseAbi, formatAbi } from '@pulsadev/abi-utils'

// Parse human-readable signatures
const abi = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'error InsufficientBalance(address account, uint256 balance)',
])

// Format JSON ABI back to human-readable
const signatures = formatAbi(abi)
```

### Crypto Utilities

```typescript
import { keccak256, selector, eventTopic } from '@pulsadev/abi-utils'

// Keccak-256 hash
const hash = keccak256('transfer(address,uint256)')

// Function selector (first 4 bytes)
const sel = selector('transfer(address,uint256)') // '0xa9059cbb'

// Event topic (full 32-byte hash)
const topic = eventTopic('Transfer(address,address,uint256)')
```

## TypeScript Inference

Function names are autocompleted and validated at compile time when using `as const` ABI:

```typescript
const abi = [
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
] as const

// Function name is autocompleted — 'transfer' is the only valid option
encodeFunctionData(abi, 'transfer', [to, amount])

// Type error: 'foo' is not a valid function name
encodeFunctionData(abi, 'foo', []) // TS error

// Type utilities
type Names = ExtractFunctionNames<typeof abi>  // 'transfer'
type Mapped = SolidityToTs<'uint256'>           // bigint
```

## Supported Types

| Solidity Type | TypeScript Type | Encode | Decode | Packed |
|--------------|----------------|:------:|:------:|:------:|
| `address` | `` `0x${string}` `` | ✅ | ✅ | ✅ |
| `bool` | `boolean` | ✅ | ✅ | ✅ |
| `uint8`—`uint256` | `bigint` | ✅ | ✅ | ✅ |
| `int8`—`int256` | `bigint` | ✅ | ✅ | ✅ |
| `bytes1`—`bytes32` | `` `0x${string}` `` | ✅ | ✅ | ✅ |
| `bytes` | `` `0x${string}` `` | ✅ | ✅ | ✅ |
| `string` | `string` | ✅ | ✅ | ✅ |
| `T[]` | `T[]` | ✅ | ✅ | — |
| `T[N]` | `T[]` | ✅ | ✅ | — |
| `tuple` | `Record` | ✅ | ✅ | — |

## Performance

Benchmarked on a dedicated VPS (Dallas, 4 vCPU, 8 GB RAM). 10,000 iterations.

| Operation | ops/sec |
|-----------|--------:|
| `encodeFunctionData(transfer)` | 507,803 |
| `encodeFunctionData(balanceOf)` | 1,011,704 |
| `encodeFunctionData(totalSupply)` | 2,834,397 |
| `decodeFunctionResult` | 1,073,016 |
| `encodeParameters(address, uint256)` | 1,036,642 |
| `encodePacked(address, uint256)` | 1,560,759 |
| `parseAbi(3 signatures)` | 315,376 |

Selectors are cached after first computation — subsequent calls skip keccak256 entirely.

## Why @pulsadev/abi-utils

| | @pulsadev/abi-utils | ox (wevm) | abitype | ethers |
|--|:--:|:--:|:--:|:--:|
| Runtime encode/decode | ✅ | ✅ | ❌ | ✅ |
| Standalone install | ✅ | ❌ 10 deps | ✅ | ❌ |
| ESM + CJS | ✅ | ❌ ESM only | ✅ | ✅ |
| Bundle size | 24 KB | large | 15 KB | large |
| encodePacked | ✅ | ✅ | ❌ | ✅ |
| Event decode | ✅ | ✅ | ❌ | ✅ |
| Error decode | ✅ | ✅ | ❌ | ✅ |
| TypeScript inference | ✅ | ✅ | ✅ | ❌ |
| Selector caching | ✅ | ❌ | — | ❌ |
| keccak256 built-in | ✅ | ❌ | ❌ | ❌ |

## License

MIT © [Yuto Nakamura](https://github.com/yutonakamura-dev)
