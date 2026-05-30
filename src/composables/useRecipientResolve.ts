import { ref, watch, type Ref } from 'vue'
import { resolveRecipient, type ResolveSuccess, type ResolveError } from '@/api/wallets'

export type RecipientType = 'user' | 'email' | 'wallet' | 'onchain'

export type ResolveState =
  | { status: 'idle' }
  | { status: 'resolving' }
  | { status: 'resolved'; result: ResolveSuccess }
  | { status: 'error'; code: string; message: string; availableCurrencies?: string[] }

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

    // On-chain addresses pass through without an API call
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

    const typeMap: Record<RecipientType, string> = {
      user: 'username', email: 'email', wallet: 'wallet_id', onchain: 'onchain',
    }
    const resolveParams = {
      type: typeMap[type],
      q: type === 'user' ? value.replace(/^@/, '') : value,
      ...(cur ? { currency: cur } : {}),
    }

    try {
      const result = await resolveRecipient(resolveParams)
      state.value = { status: 'resolved', result }
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: ResolveError } })?.response?.data
      state.value = {
        status: 'error',
        code: apiErr?.error ?? 'UNKNOWN',
        message: apiErr?.message ?? 'No se pudo resolver el destinatario.',
        availableCurrencies: apiErr?.available_currencies,
      }
    }
  }

  function schedule() {
    if (timer) clearTimeout(timer)
    state.value = { status: 'idle' }
    timer = setTimeout(resolve, DEBOUNCE_MS)
  }

  watch([recipientType, recipientValue, currency], schedule)

  function resolvedWalletId(): string | null {
    return state.value.status === 'resolved' ? state.value.result.wallet_id : null
  }

  function resolvedDisplayName(): string {
    if (state.value.status !== 'resolved') return ''
    const r = state.value.result
    return r.owner_display_name || r.owner_username || r.wallet_id
  }

  return { state, resolvedWalletId, resolvedDisplayName }
}
