<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '@/components/atoms/BaseModal.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import HashChip from '@/components/atoms/HashChip.vue'
import type { AuditEntry } from '@/api/admin'

const props = defineProps<{ entry: AuditEntry }>()
const emit = defineEmits<{ close: [] }>()

function severityTone(s?: string): 'danger' | 'warning' | 'neutral' {
  if (s === 'critical') return 'danger'
  if (s === 'warning') return 'warning'
  return 'neutral'
}

function severityLabel(s?: string) {
  if (s === 'critical') return 'Crítico'
  if (s === 'warning') return 'Advertencia'
  return 'Info'
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'medium' })
}

const subtitle = computed(() =>
  props.entry.created_at ? `Evento · ${fmtDate(props.entry.created_at)}` : 'Evento de auditoría',
)

const isHash = (v: string) => /^[a-f0-9]{40,}$/i.test(v)

interface DetailRow {
  key: string
  raw: string
  isHashVal: boolean
}
const detailRows = computed<DetailRow[]>(() => {
  const d = props.entry.details
  if (!d || typeof d !== 'object') return []
  return Object.entries(d).map(([k, v]) => {
    const raw = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '—')
    return { key: k, raw, isHashVal: typeof v === 'string' && isHash(v) }
  })
})

const jsonPayload = computed(() => JSON.stringify(props.entry.details, null, 2))

function copyJson() {
  navigator.clipboard?.writeText(jsonPayload.value)
}
</script>

<template>
  <BaseModal :open="true" width="540px" @close="emit('close')">
    <template #header>
      <div class="ah-header">
        <div>
          <h2 class="ah-title">Detalle del evento</h2>
          <p class="ah-sub">{{ subtitle }}</p>
        </div>
        <button type="button" class="ah-close" aria-label="Cerrar" @click="emit('close')">
          <span class="pi pi-times" aria-hidden="true" />
        </button>
      </div>
    </template>

    <div class="ah-body">
      <!-- Hero -->
      <div class="ah-hero">
        <div class="ah-action mono">{{ entry.action }}</div>
        <BaseBadge :tone="severityTone(entry.severity)">
          {{ severityLabel(entry.severity) }}
        </BaseBadge>
      </div>

      <!-- Evento section -->
      <section class="ah-section">
        <h3 class="ah-section-h">Evento</h3>
        <dl class="ah-grid">
          <div class="ah-row">
            <dt>Severidad</dt>
            <dd>
              <BaseBadge :tone="severityTone(entry.severity)">
                {{ severityLabel(entry.severity) }}
              </BaseBadge>
            </dd>
          </div>
          <div class="ah-row">
            <dt>Actor</dt>
            <dd>
              <HashChip
                v-if="isHash(entry.actor_id)"
                :hash="entry.actor_id"
                :length="14"
                label="actor id"
              />
              <span v-else class="mono">{{ entry.actor_id || '—' }}</span>
            </dd>
          </div>
          <div class="ah-row">
            <dt>Objetivo</dt>
            <dd>
              <HashChip
                v-if="entry.target_id && isHash(entry.target_id)"
                :hash="entry.target_id"
                :length="14"
                label="target id"
              />
              <span v-else class="mono">{{ entry.target_id || '—' }}</span>
            </dd>
          </div>
          <div class="ah-row">
            <dt>Tiempo</dt>
            <dd class="mono dim">{{ fmtDate(entry.created_at) }}</dd>
          </div>
          <div v-if="entry.id" class="ah-row ah-row--wide">
            <dt>ID</dt>
            <dd>
              <HashChip :hash="entry.id" :length="18" label="audit entry id" />
            </dd>
          </div>
        </dl>
      </section>

      <!-- Detalles section -->
      <section v-if="detailRows.length" class="ah-section">
        <h3 class="ah-section-h">Detalles</h3>
        <dl class="ah-details-grid">
          <div v-for="row in detailRows" :key="row.key" class="ah-detail-row">
            <dt class="ah-detail-key">{{ row.key }}</dt>
            <dd class="ah-detail-val">
              <HashChip
                v-if="row.isHashVal"
                :hash="row.raw"
                :length="16"
                :label="row.key"
              />
              <span v-else class="mono">{{ row.raw }}</span>
            </dd>
          </div>
        </dl>
      </section>

      <!-- Empty details fallback -->
      <p v-else class="ah-empty dim">Sin datos de detalle para este evento.</p>
    </div>

    <template #footer>
      <BaseButton variant="ghost" size="sm" @click="copyJson">
        <template #leading>
          <span class="pi pi-copy" aria-hidden="true" />
        </template>
        Copiar JSON
      </BaseButton>
      <BaseButton variant="ghost" size="sm" @click="emit('close')">Cerrar</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.ah-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}
.ah-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text);
}
.ah-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-3);
}
.ah-close {
  appearance: none;
  background: transparent;
  border: 0;
  width: 28px;
  height: 28px;
  border-radius: var(--radius);
  display: grid;
  place-items: center;
  font-size: 12px;
  color: var(--text-3);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
  flex-shrink: 0;
}
.ah-close:hover {
  background: var(--hover);
  color: var(--text);
}

.ah-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Hero */
.ah-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px 18px;
  border-bottom: 1px solid var(--border);
}
.ah-action {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text);
  text-align: center;
  word-break: break-all;
}

/* Sections */
.ah-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ah-section-h {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
}

/* Evento grid (same pattern as tx-grid) */
.ah-grid {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
}
.ah-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.ah-row--wide {
  grid-column: 1 / -1;
}
.ah-row dt {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
}
.ah-row dd {
  margin: 0;
  font-size: 13px;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}

/* Details grid */
.ah-details-grid {
  margin: 0;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.ah-detail-row {
  display: grid;
  grid-template-columns: minmax(110px, 160px) 1fr;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border);
  align-items: start;
  font-size: 12.5px;
}
.ah-detail-row:last-child {
  border-bottom: none;
}
.ah-detail-key {
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  font-size: 10.5px;
  letter-spacing: 0.04em;
  padding-top: 1px;
}
.ah-detail-val {
  margin: 0;
  color: var(--text);
  word-break: break-all;
  min-width: 0;
}

.ah-empty {
  margin: 0;
  font-size: 12.5px;
  padding: 10px 0;
}
.mono {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
.dim {
  color: var(--text-3);
}

@media (max-width: 480px) {
  .ah-grid {
    grid-template-columns: 1fr;
  }
  .ah-row--wide {
    grid-column: 1;
  }
}
</style>
