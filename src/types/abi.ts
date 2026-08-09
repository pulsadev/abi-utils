export type Hex = `0x${string}`

export interface AbiParameter {
  name?: string
  type: string
  indexed?: boolean
  components?: AbiParameter[]
  internalType?: string
}

export interface AbiFunction {
  type: 'function'
  name: string
  inputs: AbiParameter[]
  outputs: AbiParameter[]
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable'
}

export interface AbiEvent {
  type: 'event'
  name: string
  inputs: (AbiParameter & { indexed?: boolean })[]
  anonymous?: boolean
}

export interface AbiError {
  type: 'error'
  name: string
  inputs: AbiParameter[]
}

export interface AbiConstructor {
  type: 'constructor'
  inputs: AbiParameter[]
  stateMutability: 'nonpayable' | 'payable'
}

export interface AbiFallback {
  type: 'fallback'
  stateMutability: 'nonpayable' | 'payable'
}

export interface AbiReceive {
  type: 'receive'
  stateMutability: 'payable'
}

export type AbiItem = AbiFunction | AbiEvent | AbiError | AbiConstructor | AbiFallback | AbiReceive

export type Abi = readonly AbiItem[]

export interface EncodedCall {
  to?: Hex
  data: Hex
}

export interface DecodedResult {
  values: readonly unknown[]
  named: Record<string, unknown>
}

export interface DecodedEvent {
  eventName: string
  args: Record<string, unknown>
}

export interface DecodedError {
  errorName: string
  args: Record<string, unknown>
}
