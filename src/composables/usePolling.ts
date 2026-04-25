import { ref, onUnmounted } from 'vue'

export function usePolling(fn: () => Promise<void>, intervalMs = 5000) {
  const active = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  function start() {
    if (active.value) return
    active.value = true
    void fn()
    timer = setInterval(fn, intervalMs)
  }

  function stop() {
    if (timer) clearInterval(timer)
    active.value = false
  }

  onUnmounted(stop)

  return { active, start, stop }
}
