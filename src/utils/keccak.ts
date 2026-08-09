const KECCAK_ROUNDS = 24
const RC: bigint[] = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an,
  0x8000000080008000n, 0x000000000000808bn, 0x0000000080000001n,
  0x8000000080008081n, 0x8000000000008009n, 0x000000000000008an,
  0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n,
  0x8000000000008003n, 0x8000000000008002n, 0x8000000000000080n,
  0x000000000000800an, 0x800000008000000an, 0x8000000080008081n,
  0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
]

const ROTC = [
  1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 2, 14,
  27, 41, 56, 8, 25, 43, 62, 18, 39, 61, 20, 44,
]

const PI = [
  10, 7, 11, 17, 18, 3, 5, 16, 8, 21, 24, 4,
  15, 23, 19, 13, 12, 2, 20, 14, 22, 9, 6, 1,
]

const MASK64 = (1n << 64n) - 1n

function rot64(x: bigint, n: number): bigint {
  const bn = BigInt(n)
  return ((x << bn) | (x >> (64n - bn))) & MASK64
}

function keccakF(state: bigint[]): void {
  for (let round = 0; round < KECCAK_ROUNDS; round++) {
    const c: bigint[] = []
    for (let x = 0; x < 5; x++) {
      c[x] = state[x]! ^ state[x + 5]! ^ state[x + 10]! ^ state[x + 15]! ^ state[x + 20]!
    }
    for (let x = 0; x < 5; x++) {
      const d = c[(x + 4) % 5]! ^ rot64(c[(x + 1) % 5]!, 1)
      for (let y = 0; y < 25; y += 5) {
        state[y + x] = (state[y + x]! ^ d) & MASK64
      }
    }

    let current = state[1]!
    for (let i = 0; i < 24; i++) {
      const j = PI[i]!
      const temp = state[j]!
      state[j] = rot64(current, ROTC[i]!)
      current = temp
    }

    for (let y = 0; y < 25; y += 5) {
      const t0 = state[y]!
      const t1 = state[y + 1]!
      const t2 = state[y + 2]!
      const t3 = state[y + 3]!
      const t4 = state[y + 4]!
      state[y] = (t0 ^ (~t1 & t2)) & MASK64
      state[y + 1] = (t1 ^ (~t2 & t3)) & MASK64
      state[y + 2] = (t2 ^ (~t3 & t4)) & MASK64
      state[y + 3] = (t3 ^ (~t4 & t0)) & MASK64
      state[y + 4] = (t4 ^ (~t0 & t1)) & MASK64
    }

    state[0] = (state[0]! ^ RC[round]!) & MASK64
  }
}

function keccak256Raw(data: Uint8Array): string {
  const rate = 136
  const outputLen = 32

  const q = rate - (data.length % rate)
  const padded = new Uint8Array(data.length + q)
  padded.set(data)
  if (q === 1) {
    padded[data.length] = 0x81
  } else {
    padded[data.length] = 0x01
    padded[padded.length - 1] = 0x80
  }

  const state = new Array<bigint>(25).fill(0n)

  for (let i = 0; i < padded.length; i += rate) {
    for (let j = 0; j < rate && j + 7 < rate; j += 8) {
      const idx = j >> 3
      if (idx < 25) {
        let lane = 0n
        for (let b = 0; b < 8; b++) {
          lane |= BigInt(padded[i + j + b]!) << BigInt(b * 8)
        }
        state[idx] = state[idx]! ^ lane
      }
    }
    keccakF(state)
  }

  const out = new Uint8Array(outputLen)
  for (let i = 0; i < outputLen; i += 8) {
    const idx = i >> 3
    const val = state[idx]!
    for (let b = 0; b < 8 && i + b < outputLen; b++) {
      out[i + b] = Number((val >> BigInt(b * 8)) & 0xffn)
    }
  }

  return Array.from(out)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function keccak256(input: string): string {
  return keccak256Raw(new TextEncoder().encode(input))
}

export function keccak256Bytes(input: Uint8Array): string {
  return keccak256Raw(input)
}

export function selector(signature: string): string {
  return keccak256(signature).slice(0, 8)
}

export function eventTopic(signature: string): string {
  return '0x' + keccak256(signature)
}
