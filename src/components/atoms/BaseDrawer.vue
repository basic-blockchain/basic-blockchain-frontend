<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '@/components/atoms/BaseModal.vue'

type Anchor = 'right' | 'left'

interface Props {
  open: boolean
  title?: string
  width?: string | number
  dismissable?: boolean
  anchor?: Anchor
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  width: '720px',
  dismissable: true,
  anchor: 'right',
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  close: []
  opened: []
}>()

const variant = computed<'drawer-right' | 'drawer-left'>(() =>
  props.anchor === 'left' ? 'drawer-left' : 'drawer-right',
)
</script>

<template>
  <BaseModal
    :open="open"
    :title="title"
    :width="width"
    :dismissable="dismissable"
    :variant="variant"
    @update:open="emit('update:open', $event)"
    @close="emit('close')"
    @opened="emit('opened')"
  >
    <template
      v-if="$slots.header"
      #header
    >
      <slot name="header" />
    </template>
    <slot />
    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </BaseModal>
</template>
