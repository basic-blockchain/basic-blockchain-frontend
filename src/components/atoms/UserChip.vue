<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** Display name (e.g. username or "Lucía González"). */
  name: string
  /** Optional secondary label (e.g. "ADMIN", role, currency). */
  role?: string
  /** Visual size of the avatar. */
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  role: undefined,
  size: 'sm',
})

const initial = computed(() => props.name.charAt(0).toUpperCase() || '?')

const AVATAR_TONES = ['t1', 't2', 't3', 't4', 't5', 't6'] as const
const tone = computed(() => {
  let hash = 0
  for (let i = 0; i < props.name.length; i++) {
    hash = (hash * 31 + props.name.charCodeAt(i)) | 0
  }
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length]
})
</script>

<template>
  <span
    class="user-chip"
    :class="`size-${size}`"
  >
    <span
      class="user-chip__avatar"
      :class="`tone-${tone}`"
      aria-hidden="true"
    >
      {{ initial }}
    </span>
    <span class="user-chip__text">
      <span class="user-chip__name">{{ name }}</span>
      <span
        v-if="role"
        class="user-chip__role"
      >{{ role }}</span>
    </span>
  </span>
</template>

<style scoped>
.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.user-chip__avatar {
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 600;
  flex-shrink: 0;
  border-radius: 50%;
  letter-spacing: 0;
}
.size-sm .user-chip__avatar {
  width: 22px;
  height: 22px;
  font-size: 10.5px;
}
.size-md .user-chip__avatar {
  width: 28px;
  height: 28px;
  font-size: 12px;
}

.user-chip__avatar.tone-t1 { background: linear-gradient(135deg, #c9a87a, #8a6a3e); }
.user-chip__avatar.tone-t2 { background: linear-gradient(135deg, #4263eb, #364fc7); }
.user-chip__avatar.tone-t3 { background: linear-gradient(135deg, #2f9e44, #1f7a32); }
.user-chip__avatar.tone-t4 { background: linear-gradient(135deg, #e8590c, #c2410c); }
.user-chip__avatar.tone-t5 { background: linear-gradient(135deg, #7048e8, #5f3dc4); }
.user-chip__avatar.tone-t6 { background: linear-gradient(135deg, #1098ad, #0c7f8f); }

.user-chip__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
}
.user-chip__name {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}
.user-chip__role {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
}
.size-md .user-chip__name {
  font-size: 13.5px;
}
</style>
