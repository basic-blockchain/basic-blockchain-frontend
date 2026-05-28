import { useAppToast } from '@/composables/useAppToast'

export function useToast() {
  const app = useAppToast()

  function success(summary: string, detail?: string) {
    return app.add({ severity: 'success', summary, detail, life: 3000 })
  }

  function error(summary: string, detail?: string) {
    return app.add({ severity: 'error', summary, detail, life: 5000 })
  }

  function info(summary: string, detail?: string) {
    return app.add({ severity: 'info', summary, detail, life: 3000 })
  }

  function warn(summary: string, detail?: string) {
    return app.add({ severity: 'warn', summary, detail, life: 4000 })
  }

  return { success, error, info, warn, add: app.add }
}
