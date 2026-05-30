import client from './client'

export interface CreatedWallet {
  wallet_id: string
  public_key: string
  currency: string
  mnemonic: string
  message: string
}

export interface WalletDraft {
  draft_id: string
  currency: string
  public_key: string
  mnemonic: string
  warning: string
}

export type WalletType = 'USER' | 'TREASURY' | 'FEE'

export interface Wallet {
  wallet_id: string
  public_key: string
  balance: number
  frozen: boolean
  created_at: string
  currency: string
  wallet_type: WalletType
  next_nonce?: number
}

export interface MyWalletsResponse {
  wallets: Wallet[]
}

export interface SignedTransferRequest {
  sender_wallet_id: string
  receiver_wallet_id: string
  amount: number
  nonce: number
  signature: string
}

export interface SignedTransferResponse {
  transaction_id: string
  message: string
}

export interface MintRequest {
  wallet_id: string
  amount: number
}

export interface MintResponse {
  message: string
}

export async function createWallet(currency?: string): Promise<CreatedWallet> {
  const payload = currency ? { currency } : undefined
  const { data } = await client.post<CreatedWallet>('/wallets', payload)
  return data
}

export async function previewWallet(currency?: string): Promise<WalletDraft> {
  const payload = currency ? { currency } : undefined
  const { data } = await client.post<WalletDraft>('/wallets/preview', payload)
  return data
}

export async function confirmWallet(draftId: string): Promise<CreatedWallet> {
  const { data } = await client.post<CreatedWallet>('/wallets/confirm', { draft_id: draftId })
  return data
}

export async function myWallets(): Promise<MyWalletsResponse> {
  const { data } = await client.get<MyWalletsResponse>('/wallets/me')
  return data
}

export async function signedTransfer(
  payload: SignedTransferRequest
): Promise<SignedTransferResponse> {
  const { data } = await client.post<SignedTransferResponse>('/transactions/signed', payload)
  return data
}

export async function mint(payload: MintRequest): Promise<MintResponse> {
  const { data } = await client.post<MintResponse>('/admin/mint', payload)
  return data
}

export interface CurrencyRecord {
  code: string
  name: string
  decimals: number
  active: boolean
}

export async function listCurrencies(
  activeOnly = true
): Promise<{ currencies: CurrencyRecord[]; count: number }> {
  const { data } = await client.get('/currencies', {
    params: activeOnly ? { active: 'true' } : undefined,
  })
  return data
}

export interface ExchangeRate {
  from_currency: string
  to_currency: string
  rate: string
  updated_at: string
}

export async function listExchangeRates(params?: {
  from?: string
  to?: string
  limit?: number
}): Promise<{ rates: ExchangeRate[]; count: number }> {
  const { data } = await client.get('/exchange-rates', { params })
  return data
}

// ── Recipient resolution ──────────────────────────────────────────────────────

export type ResolveMatchType = 'exact' | 'exchange'

export interface ResolveSuccess {
  wallet_id: string
  owner_username: string
  owner_display_name: string
  currency: string
  match_type: ResolveMatchType
  frozen: boolean
  // present only when match_type === 'exchange'
  rate?: string
  rate_from?: string
  rate_to?: string
}

export type ResolveErrorCode =
  | 'USER_NOT_FOUND'
  | 'WALLET_NOT_FOUND'
  | 'NO_WALLET'
  | 'NO_COMPATIBLE_WALLET'
  | 'MISSING_IDENTIFIER'

export interface ResolveError {
  error: ResolveErrorCode
  message: string
  available_currencies?: string[]
  owner_username?: string
  owner_display_name?: string
}

export async function resolveRecipient(params: {
  username?: string
  email?: string
  wallet_id?: string
  currency?: string
}): Promise<ResolveSuccess> {
  const { data } = await client.get<ResolveSuccess>('/wallets/resolve', { params })
  return data
}
