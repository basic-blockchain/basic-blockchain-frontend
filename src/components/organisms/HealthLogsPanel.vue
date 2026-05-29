<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { listAuditLog } from '@/api/admin'
import type { AuditEntry } from '@/api/admin'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'

const STORAGE_KEY = 'healthLogs_state_v1'

const entries = ref<AuditEntry[]>([])
const loading = ref(false)
const paused = ref(false)
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
    entries.value = res.entries || []
  } catch (err) {
    // silent
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // restore persisted state
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const st = JSON.parse(raw)
      paused.value = !!st.paused
      search.value = st.search || ''
      severityFilter.value = st.severity || null
    }
  } catch {}

  fetchLogs()
  timer = window.setInterval(() => {
    if (!paused.value) fetchLogs()
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

watch([paused, search, severityFilter], () => {
  // persist small state
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ paused: paused.value, search: search.value, severity: severityFilter.value })
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
          <BaseButton size="sm" @click="paused = !paused">{{
            paused ? 'Reanudar' : 'Pausar'
          }}</BaseButton>
          <button class="icon-btn" title="Opciones">⚙️</button>
          <span class="dot live" title="En vivo"></span>
        </div>
      </div>
    </template>

    <div class="logs-body">
      <div v-if="entries.length === 0" class="logs-empty">No hay eventos recientes</div>
      <div class="logs-list">
        <div v-for="e in entries" :key="e.id" class="log-row">
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
            <div class="detail-text">{{ JSON.stringify(e.details) }}</div>
            <button class="detail-btn" @click.prevent="openDetail(e)">Ver</button>
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
  gap: 12px;
  padding: 12px 14px; /* ensure header has spacing and visual separation */
  border-bottom: 1px solid var(--border); /* restore header separation */
}
.logs-h .live-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.logs-h > span {
  font-weight: 600;
  font-size: 15px;
  color: var(--text);
  display: inline-block;
  line-height: 1;
}
.icon-btn {
  background: transparent;
  border: none;
  padding: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-2);
}
.icon-btn:hover {
  color: var(--text);
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
  max-height: 520px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
}
.log-row {
  display: grid;
  grid-template-columns: auto 1fr minmax(140px, 220px); /* responsive details column */
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
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
  gap: 4px;
}
.log-row .action {
  font-weight: 700;
  font-size: 13px;
  color: var(--text);
}
.log-row .sub {
  font-size: 12px;
  color: var(--text-2);
}
.col-details {
  font-size: 12px;
  color: var(--text-3);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', 'Courier New', monospace;
  /* allow wrapping and clamp to 2 lines to avoid layout overflow */
  white-space: normal;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 1; /* compact: 1 line clamp as requested */
  -webkit-box-orient: vertical;
  overflow: hidden;
  justify-self: end;
  text-align: right;
}

.severity-select {
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
}
.logs-search {
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  min-width: 160px;
}
.detail-btn {
  margin-top: 6px;
  font-size: 12px;
  background: transparent;
  border: none;
  color: var(--primary);
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

/* make the right column sticky */
.logs-list {
  position: relative;
}
.base-card > .base-card__body {
  display: flex;
  gap: 12px;
}
.base-card .logs-body {
  flex: 1 1 auto;
}
.base-card .logs-list {
  flex: 1 1 auto;
}
.base-card {
}
.base-card .logs-list {
  /* nothing */
}

.logs-right {
  position: sticky;
  top: var(--health-logs-top, 20px);
}
.logs-empty {
  padding: 16px;
  color: var(--text-2);
}
</style>
