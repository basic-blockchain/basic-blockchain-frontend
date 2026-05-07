import client from './client'

export interface CreatedWallet {
  wallet_id: string
  public_key: string
  mnemonic: string
  message: string
}

export interface Wallet {
  wallet_id: string
  public_key: string
  balance: number
  frozen: boolean
  created_at: string
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

export async function createWallet(): Promise<CreatedWallet> {
  const { data } = await client.post<CreatedWallet>('/wallets')
  return data
}

export async function myWallets(): Promise<MyWalletsResponse> {
  const { data } = await client.get<MyWalletsResponse>('/wallets/me')
  return data
}

export async function signedTransfer(payload: SignedTransferRequest): Promise<SignedTransferResponse> {
  const { data } = await client.post<SignedTransferResponse>('/transactions/signed', payload)
  return data
}

export async function mint(payload: MintRequest): Promise<MintResponse> {
  const { data } = await client.post<MintResponse>('/admin/mint', payload)
  return data
}
