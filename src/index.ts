// Encoding / Decoding
export { encodeFunctionData, decodeFunctionResult, decodeFunctionData, getSelector } from './codec/function.js'
export { encodeEventTopics, decodeEventLog, getEventTopic } from './codec/event.js'
export { decodeError, getErrorSelector } from './codec/error.js'
export { encodeParameters } from './codec/encode.js'
export { decodeParameters } from './codec/decode.js'
export { encodePacked } from './codec/packed.js'

// Human-readable ABI
export { parseAbi, parseSignature, formatAbi } from './parse/human.js'

// Crypto
export { keccak256, keccak256Bytes, selector, eventTopic } from './utils/keccak.js'

// Types
export type {
  Hex,
  Abi,
  AbiItem,
  AbiFunction,
  AbiEvent,
  AbiError,
  AbiConstructor,
  AbiParameter,
  DecodedResult,
  DecodedEvent,
  DecodedError,
  EncodedCall,
} from './types/abi.js'

export type {
  SolidityToTs,
  ExtractFunctionNames,
  ExtractEventNames,
  ExtractErrorNames,
  InferFunctionInputs,
  InferFunctionOutputs,
} from './types/inference.js'
