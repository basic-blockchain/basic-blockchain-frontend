<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** Currency code: cUSD, USDT, USDC, BTC, etc. */
  code: string
  /** Optional size; defaults to sm to match table density. */
  size?: 'sm' | 'md'
  /** When true, prefixes the badge with a small colour dot. The dot
   * mirrors the v2 design reference where assets carry a swatch. */
  withDot?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
  withDot: true,
})

const ASSET_TONES: Record<string, string> = {
  cUSD: 'platform',
  NATIVE: 'platform',
  USDT: 'stable',
  USDC: 'stable',
  DAI: 'stable',
  BTC: 'btc',
  ETH: 'eth',
}

const tone = computed(() => ASSET_TONES[props.code.toUpperCase()] ?? 'neutral')
</script>

<template>
  <span class="asset-badge" :class="[`size-${size}`, `tone-${tone}`]">
    <span v-if="withDot" class="asset-badge__dot" aria-hidden="true" />
    <span class="asset-badge__code">{{ code }}</span>
  </span>
</template>

<style scoped>
.asset-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  border-radius: 5px;
  background: var(--accent-soft);
  color: var(--accent-text);
  font-family: var(--font-mono);
  font-weight: 700;
  white-space: nowrap;
}
.asset-badge.size-sm {
  font-size: 11px;
}
.asset-badge.size-md {
  font-size: 12px;
  padding: 3px 9px;
}

.asset-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.8;
  flex-shrink: 0;
}

/* Tone palette — keeps the colour decision in one place rather
 * than scattered across each consumer view. */
.tone-platform {
  background: rgba(0, 0, 0, 0.06);
  color: var(--text);
}
.tone-stable {
  background: rgba(34, 197, 94, 0.12);
  color: rgb(22, 101, 52);
}
.tone-btc {
  background: rgba(247, 147, 26, 0.15);
  color: rgb(154, 87, 0);
}
.tone-eth {
  background: rgba(98, 126, 234, 0.15);
  color: rgb(58, 73, 156);
}
.tone-neutral {
  background: var(--muted-soft);
  color: var(--muted);
}
</style>
