<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { listAuditLog } from '@/api/admin'
import type { AuditEntry, AuditSeverity } from '@/api/admin'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import AuditEntryDetailModal from '@/components/organisms/AuditEntryDetailModal.vue'
const STORAGE_KEY = 'healthLogs_state_v1'

const entries = ref<AuditEntry[]>([])
const loading = ref(false)
const search = ref('')
const severityFilter = ref<string | null>(null)
const selectedEntry = ref<AuditEntry | null>(null)
let timer: number | null = null
let searchTimer: number | null = null

async function fetchLogs() {
  loading.value = true
  try {
    const res = await listAuditLog({
      limit: 60,
      ...(search.value ? { q: search.value } : {}),
      ...(severityFilter.value ? { severity: severityFilter.value as AuditSeverity } : {}),
    })
    entries.value = res.entries ?? []
  } catch {
    // silent — client-side filter still works on stale data
  } finally {
    loading.value = false
  }
}

// computed fallback filtering so search works even if server doesn't support q param
const filteredEntries = computed(() => {
  const q = (search.value || '').trim().toLowerCase()
  const sev = (severityFilter.value || '').toLowerCase()
  let list = entries.value || []
  if (sev) list = list.filter((e) => ((e.severity || '') as string).toLowerCase() === sev)
  if (!q) return list
  return list.filter((e) => {
    const action = (e.action || '').toString().toLowerCase()
    const actor = (e.actor_id || '').toString().toLowerCase()
    let details = ''
    try {
      details = JSON.stringify(e.details).toLowerCase()
    } catch {
      details = String(e.details || '').toLowerCase()
    }
    return action.includes(q) || actor.includes(q) || details.includes(q)
  })
})

onMounted(() => {
  // restore persisted state
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const st = JSON.parse(raw)
      search.value = st.search || ''
      severityFilter.value = st.severity || null
    }
  } catch {}

  fetchLogs()
  timer = window.setInterval(() => {
    fetchLogs()
  }, 3000)

  // compute sticky top var
  updateStickyTop()
  window.addEventListener('resize', updateStickyTop)
  window.addEventListener('scroll', updateStickyTop)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
  window.removeEventListener('resize', updateStickyTop)
  window.removeEventListener('scroll', updateStickyTop)
})

watch([search, severityFilter], () => {
  // persist small state
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ search: search.value, severity: severityFilter.value })
  )
})

function debouncedSearch() {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    fetchLogs()
  }, 450)
}

watch(search, () => debouncedSearch())

function openDetail(e: AuditEntry) {
  selectedEntry.value = e
}

function closeModal() {
  selectedEntry.value = null
}

function updateStickyTop() {
  // try find page header height; fallback to 16px
  const header = document.querySelector('.page-header') || document.querySelector('header')
  const h = header ? Math.round((header as Element).getBoundingClientRect().height) : 16
  document.documentElement.style.setProperty('--health-logs-top', `${h + 12}px`)
}

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
          <input
            class="logs-search"
            type="search"
            placeholder="Buscar..."
            v-model="search"
            aria-label="Buscar logs"
          />
          <select v-model="severityFilter" class="severity-select">
            <option value="">Todas</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <span class="live-pill" title="En vivo">
            <span class="dot live"></span>
            <span>En vivo</span>
          </span>
        </div>
      </div>
    </template>

    <div class="logs-body">
      <div v-if="entries.length === 0" class="logs-empty">No hay eventos recientes</div>
      <div class="logs-list">
        <div v-for="e in filteredEntries" :key="e.id" class="log-row">
          <div class="col-sev">
            <BaseBadge :tone="toneForSeverity(e.severity)">{{
              (e.severity ?? 'info').toUpperCase()
            }}</BaseBadge>
          </div>

          <div class="col-main">
            <div class="action">{{ e.action }}</div>
            <div class="sub">{{ e.actor_id }} · {{ shortTime(e.created_at) }}</div>
          </div>

          <div class="col-details">
            <span class="detail-text">{{ JSON.stringify(e.details) }}</span>
            <button class="detail-btn" @click.stop="openDetail(e)">View</button>
          </div>
        </div>
      </div>
    </div>
  </BaseCard>

  <AuditEntryDetailModal
    v-if="selectedEntry"
    :entry="selectedEntry"
    @close="closeModal"
  />
</template>

<style scoped>
.logs-h {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--border);
}
.logs-h .live-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.logs-h > span {
  font-weight: 600;
  font-size: 13px;
  color: var(--text);
  display: inline-block;
  line-height: 1;
}
.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--text-2);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.dot.live {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 4px var(--success-soft);
  flex: 0 0 auto;
}
.logs-body {
  padding: 0 10px 10px 10px;
}
.logs-list {
  max-height: 520px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 6px;
}
.log-row {
  display: grid;
  grid-template-columns: auto 1fr minmax(140px, 220px); /* responsive details column */
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
}
.col-sev {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.col-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.log-row .action {
  font-weight: 650;
  font-size: 12.5px;
  color: var(--text);
}
.log-row .sub {
  font-size: 11.5px;
  color: var(--text-2);
}
.col-details {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  min-width: 0;
  justify-self: end;
}
.detail-text {
  font-size: 11.5px;
  color: var(--text-3);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', 'Courier New', monospace;
  white-space: normal;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-align: right;
  width: 100%;
}

.severity-select {
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font-size: 12px;
}
.logs-search {
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: var(--surface);
  color: var(--text-2);
  min-width: 138px;
  font-size: 12px;
}
.logs-search::placeholder {
  color: var(--text-3);
}
.detail-btn {
  margin-top: 4px;
  font-size: 11.5px;
  background: var(--bg-muted);
  border: 1px solid var(--border);
  padding: 3px 8px;
  border-radius: 6px;
  color: var(--text);
  cursor: pointer;
}


.logs-empty {
  padding: 16px;
  color: var(--text-2);
}
</style>
