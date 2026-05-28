import { reactive, readonly } from 'vue'

export type ToastSeverity = 'success' | 'info' | 'warn' | 'error'

export type ToastMessage = {
  id: number
  severity: ToastSeverity
  summary: string
  detail?: string
  life?: number
}

const state = reactive({ toasts: [] as ToastMessage[] })
let idCounter = 1

function add(msg: Omit<ToastMessage, 'id'>) {
  const id = idCounter++
  const toast: ToastMessage = { id, ...msg }
  state.toasts.push(toast)
  // Debug logging to help trace toast creation in runtime
  try {
    console.debug('[useAppToast] add', toast)
  } catch (e) {
    /* ignore */
  }
  if (toast.life && toast.life > 0) {
    setTimeout(() => remove(id), toast.life)
  }
  return id
}

function remove(id: number) {
  const idx = state.toasts.findIndex((t) => t.id === id)
  if (idx >= 0) state.toasts.splice(idx, 1)
  try {
    console.debug('[useAppToast] remove', id)
  } catch (e) {
    /* ignore */
  }
}

function success(summary: string, detail?: string, life = 3000) {
  return add({ severity: 'success', summary, detail, life })
}

function info(summary: string, detail?: string, life = 3000) {
  return add({ severity: 'info', summary, detail, life })
}

function warn(summary: string, detail?: string, life = 4000) {
  return add({ severity: 'warn', summary, detail, life })
}

function error(summary: string, detail?: string, life = 5000) {
  return add({ severity: 'error', summary, detail, life })
}

export function useAppToast() {
  return {
    toasts: readonly(state.toasts) as ToastMessage[],
    add,
    remove,
    success,
    info,
    warn,
    error,
  }
}

export default useAppToast
