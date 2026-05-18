<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

type Variant = 'centered' | 'drawer-right' | 'drawer-left'

interface Props {
  open: boolean
  title?: string
  width?: string | number
  dismissable?: boolean
  /**
   * Internal contract — consumers SHOULD use `BaseDrawer` for the
   * drawer shapes rather than passing `drawer-*` here directly.
   */
  variant?: Variant
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  width: '480px',
  dismissable: true,
  variant: 'centered',
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  close: []
  opened: []
}>()

const panelRef = ref<HTMLElement | null>(null)
const scrimRef = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

const widthStyle = computed(() => {
  const w = typeof props.width === 'number' ? `${props.width}px` : props.width
  const maxW = props.variant === 'centered' ? '92vw' : '96vw'
  return { width: w, maxWidth: maxW }
})

const variantClass = computed(() => `base-modal--${props.variant}`)
const scrimVariantClass = computed(() => `base-modal__scrim--${props.variant}`)

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

function dismiss() {
  if (!props.dismissable) return
  emit('update:open', false)
  emit('close')
}

function onScrimMouseDown(event: MouseEvent) {
  if (event.target !== scrimRef.value) return
  dismiss()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    dismiss()
    return
  }
  if (event.key !== 'Tab' || !panelRef.value) return
  const focusables = Array.from(
    panelRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  )
  if (focusables.length === 0) {
    event.preventDefault()
    panelRef.value.focus()
    return
  }
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

function focusFirst() {
  if (!panelRef.value) return
  const focusable = panelRef.value.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
  if (focusable) focusable.focus()
  else panelRef.value.focus()
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      previouslyFocused = document.activeElement as HTMLElement | null
      acquireScrollLock()
      await nextTick()
      focusFirst()
      emit('opened')
    } else {
      releaseScrollLock()
      if (previouslyFocused && document.body.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
      previouslyFocused = null
    }
  },
)

onBeforeUnmount(() => {
  if (props.open) releaseScrollLock()
})
</script>

<script lang="ts">
// Module-scoped body-scroll lock counter — shared across every BaseModal
// instance so sequential or nested opens don't release the lock early.
let lockCount = 0
let savedOverflow: string | null = null

function acquireScrollLock() {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount += 1
}

function releaseScrollLock() {
  if (lockCount === 0) return
  lockCount -= 1
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow ?? ''
    savedOverflow = null
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition :name="`base-modal-${variant}`">
      <div
        v-if="open"
        ref="scrimRef"
        class="base-modal__scrim"
        :class="scrimVariantClass"
        aria-hidden="true"
        @mousedown="onScrimMouseDown"
      >
        <div
          ref="panelRef"
          class="base-modal"
          :class="variantClass"
          role="dialog"
          aria-modal="true"
          :aria-label="($attrs['aria-label'] as string | undefined) ?? title"
          :style="widthStyle"
          tabindex="-1"
          @keydown="onKeydown"
        >
          <header
            v-if="$slots.header || title"
            class="base-modal__header"
          >
            <slot name="header">
              <h2
                v-if="title"
                class="base-modal__title"
              >{{ title }}</h2>
              <button
                v-if="dismissable"
                type="button"
                class="base-modal__close"
                aria-label="Cerrar"
                @click="dismiss"
              >×</button>
            </slot>
          </header>
          <div class="base-modal__body">
            <slot />
          </div>
          <footer
            v-if="$slots.footer"
            class="base-modal__footer"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.base-modal__scrim {
  position: fixed;
  inset: 0;
  z-index: 200;
}

.base-modal__scrim--centered {
  background: rgba(20, 18, 12, 0.42);
  display: grid;
  place-items: center;
  padding: var(--space-lg);
}

.base-modal__scrim--drawer-right,
.base-modal__scrim--drawer-left {
  background: rgba(20, 18, 12, 0.32);
}

.base-modal {
  background: var(--surface);
  outline: none;
  display: flex;
  flex-direction: column;
}

.base-modal--centered {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  max-height: 86vh;
  overflow: hidden;
}

.base-modal--drawer-right,
.base-modal--drawer-left {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--bg);
  height: 100vh;
}
.base-modal--drawer-right {
  right: 0;
  box-shadow: -16px 0 64px rgba(0, 0, 0, 0.16);
}
.base-modal--drawer-left {
  left: 0;
  box-shadow: 16px 0 64px rgba(0, 0, 0, 0.16);
}

.base-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.base-modal__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text);
}

.base-modal__close {
  appearance: none;
  background: transparent;
  border: 0;
  width: 28px;
  height: 28px;
  border-radius: var(--radius);
  display: grid;
  place-items: center;
  font-size: 22px;
  line-height: 1;
  color: var(--text-3);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}
.base-modal__close:hover {
  background: var(--hover);
  color: var(--text);
}
.base-modal__close:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.base-modal__body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1 1 auto;
}

.base-modal__footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
}

/* Centered scale-in transition */
.base-modal-centered-enter-active,
.base-modal-centered-leave-active {
  transition: opacity var(--duration-base) var(--ease-out);
}
.base-modal-centered-leave-active {
  transition: opacity var(--duration-fast) var(--ease-in);
}
.base-modal-centered-enter-from,
.base-modal-centered-leave-to {
  opacity: 0;
}
.base-modal-centered-enter-active .base-modal,
.base-modal-centered-leave-active .base-modal {
  transition:
    transform var(--duration-base) var(--ease-out),
    opacity var(--duration-base) var(--ease-out);
}
.base-modal-centered-leave-active .base-modal {
  transition:
    transform var(--duration-fast) var(--ease-in),
    opacity var(--duration-fast) var(--ease-in);
}
.base-modal-centered-enter-from .base-modal,
.base-modal-centered-leave-to .base-modal {
  transform: scale(0.98);
  opacity: 0;
}

/* Drawer slide-in transitions */
.base-modal-drawer-right-enter-active,
.base-modal-drawer-left-enter-active {
  transition: opacity var(--duration-base) var(--ease-out);
}
.base-modal-drawer-right-leave-active,
.base-modal-drawer-left-leave-active {
  transition: opacity var(--duration-fast) var(--ease-in);
}
.base-modal-drawer-right-enter-from,
.base-modal-drawer-left-enter-from,
.base-modal-drawer-right-leave-to,
.base-modal-drawer-left-leave-to {
  opacity: 0;
}
.base-modal-drawer-right-enter-active .base-modal,
.base-modal-drawer-left-enter-active .base-modal {
  transition: transform var(--duration-base) var(--ease-out);
}
.base-modal-drawer-right-leave-active .base-modal,
.base-modal-drawer-left-leave-active .base-modal {
  transition: transform var(--duration-fast) var(--ease-in);
}
.base-modal-drawer-right-enter-from .base-modal,
.base-modal-drawer-right-leave-to .base-modal {
  transform: translateX(100%);
}
.base-modal-drawer-left-enter-from .base-modal,
.base-modal-drawer-left-leave-to .base-modal {
  transform: translateX(-100%);
}
</style>
