<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { listAuditLog } from '@/api/admin'
import type { AuditEntry } from '@/api/admin'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
const STORAGE_KEY = 'healthLogs_state_v1'

const entries = ref<AuditEntry[]>([])
const loading = ref(false)
const search = ref('')
const severityFilter = ref<string | null>(null)
const showModal = ref(false)
const modalContent = ref('')
let timer: number | null = null
let searchTimer: number | null = null

async function fetchLogs() {
  loading.value = true
  try {
    // attempt server-side filters; fall back to client-side if API ignores params
    const params: any = { limit: 60 }
    if (search.value) params.q = search.value
    if (severityFilter.value) params.severity = severityFilter.value
    const res = await listAuditLog(params)
    // ensure entries is always an array
    entries.value = res.entries || res || []
  } catch (err) {
    // silent
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

// helper to open modal with full details
function openDetail(e: AuditEntry) {
  try {
    modalContent.value = JSON.stringify(e.details, null, 2)
  } catch {
    modalContent.value = String(e.details)
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function copyModal() {
  navigator.clipboard?.writeText(modalContent.value)
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

  <!-- Modal para detalle completo -->
  <div v-if="showModal" class="logs-modal" role="dialog" aria-modal="true">
    <div class="logs-modal__backdrop" @click="closeModal" />
    <div class="logs-modal__card">
      <div class="logs-modal__header">
        <h3>Detalle del evento</h3>
        <button class="icon-btn" @click="closeModal">✖</button>
      </div>
      <pre class="logs-modal__pre">{{ modalContent }}</pre>
      <div class="logs-modal__footer">
        <BaseButton @click="copyModal">Copiar</BaseButton>
        <BaseButton @click="closeModal">Cerrar</BaseButton>
      </div>
    </div>
  </div>
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

/* Modal styles */
.logs-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}
.logs-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
}
.logs-modal__card {
  position: relative;
  background: var(--surface);
  border-radius: 8px;
  padding: 16px;
  width: min(880px, 92vw);
  max-height: 80vh;
  overflow: auto;
  box-shadow: var(--shadow-lg);
}
.logs-modal__pre {
  background: var(--bg-muted);
  padding: 12px;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace;
  font-size: 13px;
  white-space: pre-wrap;
}
.logs-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.logs-modal__footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 12px;
}


.logs-empty {
  padding: 16px;
  color: var(--text-2);
}
</style>
