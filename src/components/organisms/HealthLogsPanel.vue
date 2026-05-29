<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { listAuditLog } from '@/api/admin'
import type { AuditEntry } from '@/api/admin'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'

const entries = ref<AuditEntry[]>([])
const loading = ref(false)
let timer: number | null = null

async function fetchLogs() {
  loading.value = true
  try {
    const res = await listAuditLog({ limit: 60 })
    entries.value = res.entries
  } catch (err) {
    // silent
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchLogs()
  timer = window.setInterval(fetchLogs, 3000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})

function toneForSeverity(s?: string) {
  if (s === 'critical') return 'danger'
  if (s === 'warning') return 'warning'
  return 'neutral'
}

function shortTime(iso?: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString()
  } catch {
    return iso
  }
}
</script>

<template>
  <BaseCard variant="default" padding="none">
    <template #header>
      <div class="logs-h">
        <span>Logs · últimos eventos</span>
        <div class="live-controls">
          <span class="dot live" title="En vivo"></span>
        </div>
      </div>
    </template>

    <div class="logs-body">
      <div v-if="entries.length === 0" class="logs-empty">No hay eventos recientes</div>
      <div class="logs-list">
        <div v-for="e in entries" :key="e.id" class="log-row">
          <div class="left">
            <BaseBadge :tone="toneForSeverity(e.severity)">{{ e.severity ?? 'info' }}</BaseBadge>
            <div class="meta">
              <div class="action">{{ e.action }}</div>
              <div class="sub">{{ e.actor_id }} · {{ shortTime(e.created_at) }}</div>
            </div>
          </div>
          <div class="details">{{ JSON.stringify(e.details) }}</div>
        </div>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.logs-h {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.logs-h .live-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dot.live {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 6px var(--success-soft);
}
.logs-body {
  padding: 0 12px 12px 12px;
}
.logs-list {
  max-height: 420px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
}
.log-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 10px;
  border-bottom: 1px solid var(--border);
}
.log-row .left {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 220px;
}
.log-row .meta {
  display: flex;
  flex-direction: column;
}
.log-row .action {
  font-weight: 600;
  font-size: 13px;
}
.log-row .sub {
  font-size: 12px;
  color: var(--text-2);
}
.log-row .details {
  flex: 1;
  font-size: 13px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.logs-empty {
  padding: 16px;
  color: var(--text-2);
}
</style>
