import type { Hex, Abi, AbiFunction, DecodedResult } from '../types/abi.js'
import type { ExtractFunctionNames, InferFunctionInputs, InferFunctionOutputs } from '../types/inference.js'
import { encodeParameters } from './encode.js'
import { decodeParameters } from './decode.js'
import { selector } from '../utils/keccak.js'

const selectorCache = new Map<string, string>()

function cachedSelector(sig: string): string {
  let sel = selectorCache.get(sig)
  if (sel === undefined) {
    sel = selector(sig)
    selectorCache.set(sig, sel)
  }
  return sel
}

export function encodeFunctionData<
  TAbi extends Abi,
  TName extends ExtractFunctionNames<TAbi> & string,
>(
  abi: TAbi,
  functionName: TName,
  args?: InferFunctionInputs<TAbi, TName> extends infer I
    ? I extends readonly unknown[]
      ? I['length'] extends 0 ? [] | undefined : I
      : readonly unknown[]
    : readonly unknown[],
): Hex {
  const fn = findFunction(abi as Abi, functionName)
  const sig = toSignature(fn)
  const sel = cachedSelector(sig)
  if (fn.inputs.length === 0) return `0x${sel}` as Hex
  const encoded = encodeParameters(fn.inputs, args as readonly unknown[] ?? [])
  return `0x${sel}${encoded}` as Hex
}

export function decodeFunctionResult<
  TAbi extends Abi,
  TName extends ExtractFunctionNames<TAbi> & string,
>(
  abi: TAbi,
  functionName: TName,
  data: Hex,
): DecodedResult & { values: InferFunctionOutputs<TAbi, TName> extends readonly unknown[] ? InferFunctionOutputs<TAbi, TName> : readonly unknown[] } {
  const fn = findFunction(abi as Abi, functionName)
  const hex = data.startsWith('0x') ? data.slice(2) : data
  const values = decodeParameters(fn.outputs, hex)
  const named: Record<string, unknown> = {}
  for (let i = 0; i < fn.outputs.length; i++) {
    const name = fn.outputs[i]!.name || `_${i}`
    named[name] = values[i]
  }
  return { values, named } as any
}

export function decodeFunctionData<TAbi extends Abi>(
  abi: TAbi,
  data: Hex,
): { functionName: ExtractFunctionNames<TAbi>; args: readonly unknown[] } {
  const hex = data.startsWith('0x') ? data.slice(2) : data
  const sel = hex.slice(0, 8)
  const fn = findFunctionBySelector(abi as Abi, sel)
  const args = fn.inputs.length > 0
    ? decodeParameters(fn.inputs, hex.slice(8))
    : []
  return { functionName: fn.name as ExtractFunctionNames<TAbi>, args }
}

export function getSelector<
  TAbi extends Abi,
  TName extends ExtractFunctionNames<TAbi> & string,
>(abi: TAbi, functionName: TName): Hex {
  const fn = findFunction(abi as Abi, functionName)
  return `0x${cachedSelector(toSignature(fn))}` as Hex
}

function findFunction(abi: Abi, name: string): AbiFunction {
  const fn = abi.find(
    (item): item is AbiFunction => item.type === 'function' && item.name === name,
  )
  if (!fn) throw new Error(`Function "${name}" not found in ABI`)
  return fn
}

function findFunctionBySelector(abi: Abi, sel: string): AbiFunction {
  for (const item of abi) {
    if (item.type !== 'function') continue
    const fn = item as AbiFunction
    if (cachedSelector(toSignature(fn)) === sel) return fn
  }
  throw new Error(`Function with selector 0x${sel} not found in ABI`)
}

function toSignature(fn: AbiFunction): string {
  return `${fn.name}(${fn.inputs.map(p => paramToType(p)).join(',')})`
}

function paramToType(param: { type: string; components?: { type: string; components?: any[] }[] }): string {
  if (param.type === 'tuple' && param.components) {
    return `(${param.components.map(c => paramToType(c)).join(',')})`
  }
  if (param.type.startsWith('tuple[') && param.components) {
    const suffix = param.type.slice(5)
    return `(${param.components.map(c => paramToType(c)).join(',')})${suffix}`
  }
  return param.type
}
