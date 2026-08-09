import type { Hex, Abi, AbiError, DecodedError, AbiParameter } from '../types/abi.js'
import { decodeParameters } from './decode.js'
import { selector } from '../utils/keccak.js'

const ERROR_SELECTOR = '08c379a0'
const PANIC_SELECTOR = '4e487b71'

const PANIC_REASONS: Record<number, string> = {
  0x00: 'Generic compiler panic',
  0x01: 'Assert failed',
  0x11: 'Arithmetic overflow/underflow',
  0x12: 'Division by zero',
  0x21: 'Enum conversion out of bounds',
  0x22: 'Incorrectly encoded storage byte array',
  0x31: 'Pop on empty array',
  0x32: 'Array index out of bounds',
  0x41: 'Too much memory allocated',
  0x51: 'Called a zero-initialized variable of internal function type',
}

export function decodeError(abi: Abi, data: Hex): DecodedError {
  const hex = data.startsWith('0x') ? data.slice(2) : data

  if (hex.length < 8) {
    return { errorName: 'UnknownError', args: { data } }
  }

  const sel = hex.slice(0, 8)

  // Built-in Error(string)
  if (sel === ERROR_SELECTOR) {
    const params: AbiParameter[] = [{ type: 'string', name: 'reason' }]
    const decoded = decodeParameters(params, hex.slice(8))
    return { errorName: 'Error', args: { reason: decoded[0] as string } }
  }

  // Built-in Panic(uint256)
  if (sel === PANIC_SELECTOR) {
    const params: AbiParameter[] = [{ type: 'uint256', name: 'code' }]
    const decoded = decodeParameters(params, hex.slice(8))
    const code = Number(decoded[0] as bigint)
    const reason = PANIC_REASONS[code] ?? `Unknown panic (0x${code.toString(16)})`
    return { errorName: 'Panic', args: { code: decoded[0], reason } }
  }

  // Custom errors from ABI
  const error = findErrorBySelector(abi, sel)
  if (error) {
    const decoded = error.inputs.length > 0
      ? decodeParameters(error.inputs, hex.slice(8))
      : []
    const args: Record<string, unknown> = {}
    for (let i = 0; i < error.inputs.length; i++) {
      args[error.inputs[i]!.name || `_${i}`] = decoded[i]
    }
    return { errorName: error.name, args }
  }

  return { errorName: 'UnknownError', args: { selector: `0x${sel}`, data } }
}

export function getErrorSelector(abi: Abi, errorName: string): Hex {
  const error = findError(abi, errorName)
  return `0x${selector(toErrorSignature(error))}` as Hex
}

function findError(abi: Abi, name: string): AbiError {
  const error = abi.find(
    (item): item is AbiError => item.type === 'error' && item.name === name,
  )
  if (!error) throw new Error(`Error "${name}" not found in ABI`)
  return error
}

function findErrorBySelector(abi: Abi, sel: string): AbiError | undefined {
  for (const item of abi) {
    if (item.type !== 'error') continue
    const error = item as AbiError
    if (selector(toErrorSignature(error)) === sel) return error
  }
  return undefined
}

function toErrorSignature(error: AbiError): string {
  return `${error.name}(${error.inputs.map(p => p.type).join(',')})`
}
