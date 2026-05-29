<script setup lang="ts">
/**
 * Slide-to-confirm widget extracted from SendConfirmFlow.vue
 * (Phase 7.10.e.c). Behaviour mirrors the v2 design reference
 * docs/propuesta_rediseno_blockchain_2/flows.jsx:586-690:
 *   - Drag the thumb past 92% of the track and release -> emits
 *     `confirm` once, then snaps to 100%.
 *   - Release below 92% -> snaps back to 0.
 *   - Keyboard fallback: Enter / Space on the focused thumb
 *     triggers `confirm` immediately (basic accessibility; a full
 *     WCAG pass is its own phase per spec 7.10.e §5).
 *
 * Two reasons to extract this:
 *   1. NewSendFlow needs the same affordance for treasury sends
 *      without copy-pasting 80 lines of JS.
 *   2. The original SendConfirmFlow.vue is still used by P2P and
 *      mobile sheets; leaving the widget in place there would
 *      drift two implementations apart.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

interface Props {
  /** Label shown in the centre of the track. Defaults to the v2 copy. */
  label?: string
  /** When true the track is non-interactive and visually muted. */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Deslizá para confirmar →',
  disabled: false,
})

const emit = defineEmits<{
  confirm: []
}>()

const trackRef = ref<HTMLElement | null>(null)
const drag = ref(0)
const dragging = ref(false)

function clientX(e: MouseEvent | TouchEvent): number {
  if ('touches' in e) return e.touches[0].clientX
  return e.clientX
}

function onDown(e: MouseEvent | TouchEvent) {
  if (props.disabled) return
  dragging.value = true
  e.preventDefault()
}

function onMove(e: MouseEvent | TouchEvent) {
  if (!dragging.value || !trackRef.value) return
  const r = trackRef.value.getBoundingClientRect()
  // 24px = thumb radius (40px / 2 + 4px inset from the React reference).
  const pct = (clientX(e) - r.left - 24) / (r.width - 48)
  drag.value = Math.max(0, Math.min(1, pct))
}

function onUp() {
  if (!dragging.value) return
  dragging.value = false
  if (drag.value > 0.92) {
    drag.value = 1
    // Tiny delay so the visual snap to 100% lands before the
    // parent un-mounts us (mirrors flows.jsx:609).
    setTimeout(() => emit('confirm'), 200)
  } else {
    drag.value = 0
  }
}

function onKeydown(e: KeyboardEvent) {
  if (props.disabled) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    drag.value = 1
    setTimeout(() => emit('confirm'), 200)
  }
}

const thumbLeft = computed(() => {
  const w = trackRef.value?.clientWidth ?? 360
  return 4 + drag.value * (w - 48)
})

const fillPct = computed(() => drag.value * 100)
const labelColor = computed(() =>
  drag.value > 0.5 ? 'var(--success)' : 'var(--text-2)',
)

onMounted(() => {
  window.addEventListener('mousemove', onMove)
  window.addEventListener('touchmove', onMove, { passive: false })
  window.addEventListener('mouseup', onUp)
  window.addEventListener('touchend', onUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('touchmove', onMove)
  window.removeEventListener('mouseup', onUp)
  window.removeEventListener('touchend', onUp)
})

/** Public reset for parents that need to recycle the same instance
 *  across multiple confirmations (e.g. after a failed API call). */
defineExpose({
  reset() {
    drag.value = 0
    dragging.value = false
  },
})
</script>

<template>
  <div
    ref="trackRef"
    class="slide-track"
    :class="{ 'is-disabled': disabled }"
    role="slider"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="Math.round(fillPct)"
    :aria-disabled="disabled"
    @touchstart.prevent="onDown"
  >
    <div
      class="slide-track__fill"
      :style="{ width: fillPct + '%', opacity: drag > 0 ? 0.18 : 0 }"
    />
    <div class="slide-track__label" :style="{ color: labelColor }">
      {{ label }}
    </div>
    <button
      type="button"
      class="slide-track__thumb"
      :class="{ done: drag > 0.92 }"
      :style="{ left: thumbLeft + 'px' }"
      :aria-label="label"
      tabindex="0"
      @mousedown="onDown"
      @touchstart.prevent="onDown"
      @keydown="onKeydown"
    >
      <span class="pi pi-chevron-right" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.slide-track {
  position: relative;
  height: 48px;
  background: var(--surface-2);
  border-radius: 999px;
  overflow: hidden;
  cursor: pointer;
  user-select: none;
}
.slide-track.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.slide-track__fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--success), var(--success));
  transition: opacity 0.2s;
  pointer-events: none;
}

.slide-track__label {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 12.5px;
  font-weight: 600;
  pointer-events: none;
  transition: color 0.2s;
}

.slide-track__thumb {
  position: absolute;
  top: 4px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--text);
  color: #faf9f6;
  display: grid;
  place-items: center;
  cursor: grab;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: background 0.15s, left 0.05s;
  border: 0;
  padding: 0;
}
.slide-track__thumb.done {
  background: var(--success);
}
.slide-track__thumb:active {
  cursor: grabbing;
}
.slide-track__thumb:focus-visible {
  outline: 2px solid var(--accent, var(--success));
  outline-offset: 2px;
}
.slide-track__thumb .pi {
  font-size: 14px;
}
</style>
