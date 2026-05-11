import client from './client'

export interface CreatedWallet {
  wallet_id: string
  public_key: string
  currency: string
  mnemonic: string
  message: string
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
