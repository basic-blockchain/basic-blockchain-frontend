import { createApp, defineComponent } from 'vue'

/**
 * Mounts a composable inside a real Vue app so lifecycle hooks
 * (onMounted, onUnmounted, etc.) fire correctly.
 * Returns [composable result, app instance] — call app.unmount() to trigger cleanup.
 */
export function withSetup<T>(setup: () => T): [T, ReturnType<typeof createApp>] {
  let result!: T
  const app = createApp(
    defineComponent({
      setup() {
        result = setup()
        return () => null
      },
    }),
  )
  app.mount(document.createElement('div'))
  return [result, app]
}
