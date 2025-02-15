import {nip19} from "nostr-tools"
import {is, fromPairs, mergeLeft, last, identity, prop, flatten, uniq} from "ramda"
import {ensurePlural, mapVals, tryFunc, avg, first} from "hurdak"
import type {Filter, Event, DisplayEvent} from "src/engine/types"
import {tryJson} from "src/util/misc"

export const noteKinds = [1, 30023, 1063, 9802, 1808]
export const personKinds = [0, 2, 3, 10002]
export const userKinds = personKinds.concat([10000, 30001, 30078])

export const EPOCH = 1635724800

export const appDataKeys = {
  USER_SETTINGS: "nostr-engine/User/settings/v1",
  NIP04_LAST_CHECKED: "nostr-engine/Nip04/last_checked/v1",
  NIP24_LAST_CHECKED: "nostr-engine/Nip24/last_checked/v1",
  NIP28_LAST_CHECKED: "nostr-engine/Nip28/last_checked/v1",
  NIP28_ROOMS_JOINED: "nostr-engine/Nip28/rooms_joined/v1",
}

export class Tags {
  tags: any[]
  constructor(tags: any[]) {
    this.tags = tags.filter(identity)
  }
  static from(events: Event | Event[]) {
    return new Tags(ensurePlural(events).flatMap(prop("tags")))
  }
  static wrap(tags: any[]) {
    return new Tags(tags.filter(identity))
  }
  all() {
    return this.tags
  }
  count() {
    return this.tags.length
  }
  exists() {
    return this.tags.length > 0
  }
  first() {
    return first(this.tags)
  }
  nth(i: number) {
    return this.tags[i]
  }
  last() {
    return last(this.tags)
  }
  relays() {
    return uniq(flatten(this.tags).filter(isShareableRelay))
  }
  topics() {
    return this.type("t")
      .values()
      .all()
      .map(t => t.replace(/^#/, ""))
  }
  pubkeys() {
    return this.type("p").values().all()
  }
  urls() {
    return this.type("r").values().all()
  }
  asMeta() {
    return fromPairs(this.tags)
  }
  getMeta(k: string) {
    return this.type(k).values().first()
  }
  drop(n) {
    return new Tags(this.tags.map(t => t.slice(n)))
  }
  values() {
    return new Tags(this.tags.map(t => t[1]))
  }
  filter(f: (t: any) => boolean) {
    return new Tags(this.tags.filter(f))
  }
  reject(f: (t: any) => boolean) {
    return new Tags(this.tags.filter(t => !f(t)))
  }
  any(f: (t: any) => boolean) {
    return this.filter(f).exists()
  }
  type(type: string | string[]) {
    const types = ensurePlural(type)

    return new Tags(this.tags.filter(t => types.includes(t[0])))
  }
  equals(value: string) {
    return new Tags(this.tags.filter(t => t[1] === value))
  }
  mark(mark: string | string[]) {
    const marks = ensurePlural(mark)

    return new Tags(this.tags.filter(t => marks.includes(last(t))))
  }
}

export const findReplyAndRoot = (e: Event) => {
  const tags = Tags.from(e)
    .type("e")
    .filter(t => last(t) !== "mention")
  const legacy = tags.any(t => !["reply", "root"].includes(last(t)))

  // Support the deprecated version where tags are not marked as replies
  if (legacy) {
    const reply = tags.last()
    const root = tags.count() > 1 ? tags.first() : null

    return {reply, root}
  }

  const reply = tags.mark("reply").first()
  const root = tags.mark("root").first()

  return {reply: reply || root, root}
}

export const findReplyAndRootIds = (e: Event) => mapVals(t => t?.[1], findReplyAndRoot(e))

export const findReply = (e: Event) => prop("reply", findReplyAndRoot(e))

export const findReplyId = (e: Event) => findReply(e)?.[1]

export const findRoot = (e: Event) => prop("root", findReplyAndRoot(e))

export const findRootId = (e: Event) => findRoot(e)?.[1]

export const isLike = (content: string) => ["", "+", "🤙", "👍", "❤️", "😎", "🏅"].includes(content)

export const isShareableRelay = (url: string) =>
  // Is it actually a websocket url
  url.match(/^wss:\/\/.+/) &&
  // Sometimes bugs cause multiple relays to get concatenated
  url.match(/:\/\//g).length === 1 &&
  // It shouldn't have any whitespace
  !url.match(/\s/) &&
  // Don't match stuff with a port number
  !url.slice(6).match(/:\d+/) &&
  // Don't match raw ip addresses
  !url.slice(6).match(/\d+\.\d+\.\d+\.\d+/) &&
  // Skip nostr.wine's virtual relays
  !url.slice(6).match(/\/npub/)

export const normalizeRelayUrl = (url: string) => {
  // If it doesn't start with a compatible protocol, strip the proto and add wss
  if (!url.match(/^wss:\/\/.+/)) {
    url = "wss://" + url.replace(/.*:\/\//, "")
  }

  return (tryFunc(() => new URL(url).href.replace(/\/+$/, "").toLowerCase()) || "") as string
}

export const channelAttrs = ["name", "about", "picture"]

export const asDisplayEvent = (event: Event): DisplayEvent => ({
  replies: [],
  reactions: [],
  zaps: [],
  ...event,
})

export const toHex = (data: string): string | null => {
  if (data.match(/[a-zA-Z0-9]{64}/)) {
    return data
  }

  try {
    return nip19.decode(data).data as string
  } catch (e) {
    return null
  }
}

export const mergeFilter = (filter: Filter | Filter[], extra: Filter) =>
  is(Array, filter) ? filter.map(mergeLeft(extra)) : {...filter, ...extra}

export const fromNostrURI = (s: string) => s.replace(/^[\w\+]+:\/?\/?/, "")

export const toNostrURI = (s: string) => `nostr:${s}`

export const getLabelQuality = (label: string, event: Event) => {
  const json = tryJson(() => JSON.parse(last(Tags.from(event).type("l").equals(label).first())))

  return (json as {quality?: number})?.quality
}

export const getAvgQuality = (label: string, events: Event[]) =>
  avg(events.map(e => getLabelQuality(label, e)).filter(identity))

export const isHex = x => x.match(/^[a-f0-9]{64}$/)
