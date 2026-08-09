import type { Hex, Abi, AbiEvent, DecodedEvent, AbiParameter } from '../types/abi.js'
import { encodeParameters } from './encode.js'
import { decodeParameters } from './decode.js'
import { eventTopic } from '../utils/keccak.js'

const topicCache = new Map<string, string>()

function cachedTopic(sig: string): string {
  let topic = topicCache.get(sig)
  if (topic === undefined) {
    topic = eventTopic(sig)
    topicCache.set(sig, topic)
  }
  return topic
}

export function encodeEventTopics(
  abi: Abi,
  eventName: string,
  args?: Record<string, unknown>,
): Hex[] {
  const event = findEvent(abi, eventName)
  const sig = toEventSignature(event)
  const topics: Hex[] = [(`0x${cachedTopic(sig).slice(2)}`) as Hex]

  if (!args) return topics

  for (const input of event.inputs) {
    if (!input.indexed) continue
    const value = args[input.name!]
    if (value === undefined || value === null) {
      topics.push(null as unknown as Hex)
      continue
    }
    if (isDynamicIndexed(input.type)) {
      // Dynamic indexed parameters are hashed
      const encoded = encodeParameters([{ ...input, indexed: false }], [value])
      topics.push((`0x${eventTopic(encoded)}`) as Hex)
    } else {
      const encoded = encodeParameters([{ ...input, indexed: false }], [value])
      topics.push((`0x${encoded}`) as Hex)
    }
  }

  return topics
}

export function decodeEventLog(
  abi: Abi,
  topics: readonly Hex[],
  data: Hex,
): DecodedEvent {
  const topicHash = topics[0]!
  const event = findEventByTopic(abi, topicHash)
  const args: Record<string, unknown> = {}

  const indexedInputs = event.inputs.filter(i => i.indexed)
  const nonIndexedInputs = event.inputs.filter(i => !i.indexed)

  // Decode indexed parameters from topics
  let topicIndex = 1
  for (const input of indexedInputs) {
    const topic = topics[topicIndex]
    if (topic) {
      if (isDynamicIndexed(input.type)) {
        args[input.name!] = topic
      } else {
        const decoded = decodeParameters([{ ...input, indexed: false }], topic.slice(2))
        args[input.name!] = decoded[0]
      }
    }
    topicIndex++
  }

  // Decode non-indexed parameters from data
  if (nonIndexedInputs.length > 0) {
    const hex = data.startsWith('0x') ? data.slice(2) : data
    if (hex.length > 0) {
      const decoded = decodeParameters(nonIndexedInputs, hex)
      for (let i = 0; i < nonIndexedInputs.length; i++) {
        args[nonIndexedInputs[i]!.name!] = decoded[i]
      }
    }
  }

  return { eventName: event.name, args }
}

export function getEventTopic(abi: Abi, eventName: string): Hex {
  const event = findEvent(abi, eventName)
  const sig = toEventSignature(event)
  return cachedTopic(sig) as Hex
}

function findEvent(abi: Abi, name: string): AbiEvent {
  const event = abi.find(
    (item): item is AbiEvent => item.type === 'event' && item.name === name,
  )
  if (!event) throw new Error(`Event "${name}" not found in ABI`)
  return event
}

function findEventByTopic(abi: Abi, topicHash: Hex): AbiEvent {
  const hash = topicHash.startsWith('0x') ? topicHash.slice(2) : topicHash
  for (const item of abi) {
    if (item.type !== 'event') continue
    const event = item as AbiEvent
    const sig = toEventSignature(event)
    if (cachedTopic(sig).slice(2) === hash) return event
  }
  throw new Error(`Event with topic ${topicHash} not found in ABI`)
}

function toEventSignature(event: AbiEvent): string {
  return `${event.name}(${event.inputs.map(p => paramToType(p)).join(',')})`
}

function paramToType(param: AbiParameter): string {
  if (param.type === 'tuple' && param.components) {
    return `(${param.components.map(c => paramToType(c)).join(',')})`
  }
  return param.type
}

function isDynamicIndexed(type: string): boolean {
  return type === 'string' || type === 'bytes' || type.endsWith('[]') || type === 'tuple'
}
