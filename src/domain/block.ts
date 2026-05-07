export interface BlockTransaction {
  sender: string
  receiver: string
  amount: number
}

export interface Block {
  index: number
  timestamp: string
  proof: number
  previousHash: string
  // Phase H+ (v0.6.0): every block now carries its Merkle root and the
  // transactions it confirmed. The chain hash on the backend covers
  // `merkleRoot`, so consumers can rely on the chain itself as the source
  // of truth for confirmed history.
  merkleRoot: string
  transactions: BlockTransaction[]
}

export interface ApiBlock {
  index: number
  timestamp: string
  proof: number
  previous_hash: string
  merkle_root: string
  transactions: BlockTransaction[]
}

export function blockFromApi(raw: ApiBlock): Block {
  return {
    index: raw.index,
    timestamp: raw.timestamp,
    proof: raw.proof,
    previousHash: raw.previous_hash,
    merkleRoot: raw.merkle_root,
    transactions: raw.transactions ?? [],
  }
}

export function formatHash(hash: string, length = 12): string {
  if (hash === '0') return 'Genesis'
  return hash.length > length ? `${hash.slice(0, length)}…` : hash
}
