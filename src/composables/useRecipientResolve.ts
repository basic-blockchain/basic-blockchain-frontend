import { ref, watch, type Ref } from 'vue'
import { resolveRecipient, type ResolveSuccess, type ResolveError } from '@/api/wallets'

export type RecipientType = 'user' | 'email' | 'wallet' | 'onchain'

export type ResolveState =
  | { status: 'idle' }
  | { status: 'resolving' }
  | { status: 'resolved'; result: ResolveSuccess }
  | { status: 'currency_mismatch'; result: ResolveError & { fallback_wallet_id: string } }
  | { status: 'error'; code: string; message: string }

const DEBOUNCE_MS = 350

export function useRecipientResolve(
  recipientType: Ref<RecipientType>,
  recipientValue: Ref<string>,
  currency: Ref<string>,
) {
  const state = ref<ResolveState>({ status: 'idle' })
  let timer: ReturnType<typeof setTimeout> | null = null

  async function resolve() {
    const type = recipientType.value
    const value = recipientValue.value.trim()
    const cur = currency.value

    if (!value) {
      state.value = { status: 'idle' }
      return
    }

    // on-chain addresses are not validated by this API
    if (type === 'onchain') {
      state.value = {
        status: 'resolved',
        result: {
          wallet_id: value,
          owner_username: '',
          owner_display_name: 'Dirección on-chain',
          currency: cur,
          match_type: 'exact',
          frozen: false,
        },
      }
      return
    }

    state.value = { status: 'resolving' }

    const params: Record<string, string> = { currency: cur }
    if (type === 'wallet')  params.wallet_id = value
    else if (type === 'user')  params.username = value.replace(/^@/, '')
    else if (type === 'email') params.email = value

    try {
      const result = await resolveRecipient(params)
      state.value = { status: 'resolved', result }
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: ResolveError } })?.response?.data
      if (apiErr?.error === 'NO_WALLET_FOR_CURRENCY' && apiErr.fallback_wallet_id) {
        state.value = {
          status: 'currency_mismatch',
          result: apiErr as ResolveError & { fallback_wallet_id: string },
        }
      } else {
        state.value = {
          status: 'error',
          code: apiErr?.error ?? 'UNKNOWN',
          message: apiErr?.message ?? 'No se pudo resolver el destinatario.',
        }
      }
    }
  }

  function schedule() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(resolve, DEBOUNCE_MS)
  }

  watch([recipientType, recipientValue, currency], () => {
    state.value = { status: 'idle' }
    schedule()
  })

  // Expose the resolved wallet_id (used as receiver_wallet_id in the transfer)
  function resolvedWalletId(): string | null {
    if (state.value.status === 'resolved') return state.value.result.wallet_id
    if (state.value.status === 'currency_mismatch') return state.value.result.fallback_wallet_id
    return null
  }

  function resolvedDisplayName(): string {
    if (state.value.status === 'resolved') {
      const r = state.value.result
      return r.owner_display_name || r.owner_username || r.wallet_id
    }
    if (state.value.status === 'currency_mismatch') {
      const r = state.value.result
      return r.owner_display_name || r.owner_username || ''
    }
    return ''
  }

  return { state, resolvedWalletId, resolvedDisplayName }
}
