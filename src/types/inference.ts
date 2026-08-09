import type { AbiParameter } from './abi.js'

// ============================================================
// Solidity type → TypeScript type mapping
// ============================================================

export type SolidityToTs<T extends string> =
  T extends 'address' ? `0x${string}` :
  T extends 'bool' ? boolean :
  T extends 'string' ? string :
  T extends 'bytes' ? `0x${string}` :
  T extends `bytes${infer _}` ? `0x${string}` :
  T extends `uint${infer _}` ? bigint :
  T extends `int${infer _}` ? bigint :
  T extends `${infer Base}[]` ? SolidityToTs<Base>[] :
  T extends `${infer Base}[${infer _}]` ? SolidityToTs<Base>[] :
  T extends 'tuple' ? Record<string, unknown> :
  unknown

// ============================================================
// Extract function names from ABI
// ============================================================

export type ExtractFunctionNames<TAbi extends readonly unknown[]> =
  TAbi[number] extends infer Item
    ? Item extends { type: 'function'; name: infer Name }
      ? Name extends string ? Name : never
      : never
    : never

// ============================================================
// Extract event names from ABI
// ============================================================

export type ExtractEventNames<TAbi extends readonly unknown[]> =
  TAbi[number] extends infer Item
    ? Item extends { type: 'event'; name: infer Name }
      ? Name extends string ? Name : never
      : never
    : never

// ============================================================
// Extract error names from ABI
// ============================================================

export type ExtractErrorNames<TAbi extends readonly unknown[]> =
  TAbi[number] extends infer Item
    ? Item extends { type: 'error'; name: infer Name }
      ? Name extends string ? Name : never
      : never
    : never

// ============================================================
// Find function by name in ABI
// ============================================================

export type FindFunction<
  TAbi extends readonly unknown[],
  TName extends string,
> = TAbi[number] extends infer Item
  ? Item extends { type: 'function'; name: TName; inputs: infer I; outputs: infer O }
    ? { inputs: I; outputs: O }
    : never
  : never

// ============================================================
// Map ABI parameters to TypeScript types
// ============================================================

export type AbiParamsToTs<T extends readonly AbiParameter[]> = {
  [K in keyof T]: T[K] extends AbiParameter ? SolidityToTs<T[K]['type']> : unknown
}

// ============================================================
// Infer input types for a function
// ============================================================

export type InferFunctionInputs<
  TAbi extends readonly unknown[],
  TName extends string,
> = TAbi[number] extends infer Item
  ? Item extends { type: 'function'; name: TName; inputs: infer I extends readonly AbiParameter[] }
    ? AbiParamsToTs<I>
    : never
  : never

// ============================================================
// Infer output types for a function
// ============================================================

export type InferFunctionOutputs<
  TAbi extends readonly unknown[],
  TName extends string,
> = TAbi[number] extends infer Item
  ? Item extends { type: 'function'; name: TName; outputs: infer O extends readonly AbiParameter[] }
    ? AbiParamsToTs<O>
    : never
  : never
