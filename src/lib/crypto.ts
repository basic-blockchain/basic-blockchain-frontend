/**
 * Client-side BIP-39 + secp256k1 helpers.
 *
 * The mnemonic NEVER leaves the browser during a transfer — only the hex
 * signature is sent to the backend. Wallet creation is the sole exception:
 * the server generates and returns the mnemonic once (Phase I.3 MVP trade-off,
 * deferred to Phase J+).
 */

import { validateMnemonic, mnemonicToSeedSync } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { secp256k1 } from '@noble/curves/secp256k1.js'

// ── Mnemonic helpers ─────────────────────────────────────────────────────────

export function isValidMnemonic(phrase: string): boolean {
  return validateMnemonic(phrase.trim(), wordlist)
}

// ── Key derivation ───────────────────────────────────────────────────────────

/**
 * Derive a secp256k1 private key from a BIP-39 mnemonic.
 * Uses the first 32 bytes of the 64-byte BIP-39 seed as the private scalar —
 * matching the server's coincurve `derive_keypair(seed[:32])`.
 */
function derivePrivateKey(mnemonic: string): Uint8Array {
  const seed = mnemonicToSeedSync(mnemonic.trim())
  return seed.slice(0, 32)
}

// ── Canonical message ────────────────────────────────────────────────────────

/**
 * Build the canonical transfer message bytes that both client and server
 * sign / verify.
 *
 * Format: `{sender_wallet_id}:{receiver_wallet_id}:{amount}:{nonce}`
 * Amount is serialised as a plain decimal string (no exponent, no trailing
 * zeros) to match Python's `str(Decimal(str(amount)))`.
 */
function canonicalTransferMessage(
  senderWalletId: string,
  receiverWalletId: string,
  amount: number | string,
  nonce: number,
): Uint8Array {
  const amountStr = formatAmount(amount)
  return new TextEncoder().encode(`${senderWalletId}:${receiverWalletId}:${amountStr}:${nonce}`)
}

function formatAmount(amount: number | string): string {
  const s = String(amount)
  if (s.includes('.')) {
    return s.replace(/0+$/, '').replace(/\.$/, '') || '0'
  }
  return s
}

// ── Sign ─────────────────────────────────────────────────────────────────────

/**
 * Sign a transfer and return the DER-encoded hex signature.
 *
 * Internally: secp256k1.sign(message, privKey) applies sha256 to `message`
 * then signs — matching coincurve's default `hasher=sha256` behaviour.
 * `format: 'der'` produces ASN.1 DER output matching coincurve's
 * `secp256k1_ecdsa_signature_serialize_der`.
 *
 * Throws if the mnemonic is invalid.
 */
export function signTransfer(
  mnemonic: string,
  senderWalletId: string,
  receiverWalletId: string,
  amount: number | string,
  nonce: number,
): string {
  if (!isValidMnemonic(mnemonic)) {
    throw new Error('Invalid BIP-39 mnemonic')
  }
  const privKey = derivePrivateKey(mnemonic)
  const msg = canonicalTransferMessage(senderWalletId, receiverWalletId, amount, nonce)
  const sigBytes = secp256k1.sign(msg, privKey, { format: 'der' }) as Uint8Array
  return Array.from(sigBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
