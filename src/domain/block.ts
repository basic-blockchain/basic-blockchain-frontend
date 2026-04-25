export interface Block {
  index: number
  timestamp: string
  proof: number
  previousHash: string
}

export interface ApiBlock {
  index: number
  timestamp: string
  proof: number
  previous_hash: string
}

export function blockFromApi(raw: ApiBlock): Block {
  return {
    index: raw.index,
    timestamp: raw.timestamp,
    proof: raw.proof,
    previousHash: raw.previous_hash,
  }
}

export function formatHash(hash: string, length = 12): string {
  if (hash === '0') return 'Genesis'
  return hash.length > length ? `${hash.slice(0, length)}…` : hash
}
