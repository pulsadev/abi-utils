import type { AbiItem, AbiFunction, AbiEvent, AbiError, AbiParameter } from '../types/abi.js'

export function parseAbi(signatures: readonly string[]): AbiItem[] {
  return signatures.map(parseSignature)
}

export function parseSignature(sig: string): AbiItem {
  const trimmed = sig.trim()

  if (trimmed.startsWith('function ')) {
    return parseFunction(trimmed)
  }
  if (trimmed.startsWith('event ')) {
    return parseEvent(trimmed)
  }
  if (trimmed.startsWith('error ')) {
    return parseError(trimmed)
  }

  throw new Error(`Unsupported signature: ${trimmed}`)
}

function parseFunction(sig: string): AbiFunction {
  // function name(type1 name1, type2 name2) view returns (type3 name3)
  const match = sig.match(
    /^function\s+(\w+)\s*\(([^)]*)\)\s*(pure|view|payable|nonpayable)?\s*(?:returns\s*\(([^)]*)\))?$/,
  )
  if (!match) throw new Error(`Invalid function signature: ${sig}`)

  const [, name, inputStr, mutability, outputStr] = match

  return {
    type: 'function',
    name: name!,
    inputs: parseParams(inputStr || ''),
    outputs: parseParams(outputStr || ''),
    stateMutability: (mutability as AbiFunction['stateMutability']) || 'nonpayable',
  }
}

function parseEvent(sig: string): AbiEvent {
  // event Name(type1 indexed name1, type2 name2)
  const match = sig.match(/^event\s+(\w+)\s*\(([^)]*)\)$/)
  if (!match) throw new Error(`Invalid event signature: ${sig}`)

  const [, name, paramStr] = match
  const inputs = parseEventParams(paramStr || '')

  return {
    type: 'event',
    name: name!,
    inputs,
  }
}

function parseError(sig: string): AbiError {
  // error Name(type1 name1, type2 name2)
  const match = sig.match(/^error\s+(\w+)\s*\(([^)]*)\)$/)
  if (!match) throw new Error(`Invalid error signature: ${sig}`)

  const [, name, paramStr] = match

  return {
    type: 'error',
    name: name!,
    inputs: parseParams(paramStr || ''),
  }
}

function parseParams(str: string): AbiParameter[] {
  if (!str.trim()) return []
  return str.split(',').map(s => {
    const parts = s.trim().split(/\s+/)
    if (parts.length === 1) {
      return { type: parts[0]!, name: '' }
    }
    return { type: parts[0]!, name: parts[parts.length - 1]! }
  })
}

function parseEventParams(str: string): (AbiParameter & { indexed?: boolean })[] {
  if (!str.trim()) return []
  return str.split(',').map(s => {
    const parts = s.trim().split(/\s+/)
    const indexed = parts.includes('indexed')
    const type = parts[0]!
    const name = parts[parts.length - 1]!
    return { type, name: name === 'indexed' ? '' : name, indexed }
  })
}

export function formatAbi(abi: readonly AbiItem[]): string[] {
  return abi.map(item => {
    if (item.type === 'function') {
      const fn = item as AbiFunction
      const inputs = fn.inputs.map(p => `${p.type}${p.name ? ' ' + p.name : ''}`).join(', ')
      const outputs = fn.outputs.length > 0
        ? ` returns (${fn.outputs.map(p => `${p.type}${p.name ? ' ' + p.name : ''}`).join(', ')})`
        : ''
      const mut = fn.stateMutability !== 'nonpayable' ? ` ${fn.stateMutability}` : ''
      return `function ${fn.name}(${inputs})${mut}${outputs}`
    }
    if (item.type === 'event') {
      const ev = item as AbiEvent
      const inputs = ev.inputs
        .map(p => `${p.type}${p.indexed ? ' indexed' : ''}${p.name ? ' ' + p.name : ''}`)
        .join(', ')
      return `event ${ev.name}(${inputs})`
    }
    if (item.type === 'error') {
      const err = item as AbiError
      const inputs = err.inputs.map(p => `${p.type}${p.name ? ' ' + p.name : ''}`).join(', ')
      return `error ${err.name}(${inputs})`
    }
    return `${item.type}()`
  })
}
