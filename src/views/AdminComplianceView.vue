<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { listUsers, type UserAdminRecord } from '@/api/admin'
import { useToast } from 'primevue/usetoast'
import KYCReviewFlow from '@/components/flows/KYCReviewFlow.vue'
import type { KYCData } from '@/components/flows/KYCReviewFlow.vue'
import DisputeResolutionFlow from '@/components/flows/DisputeResolutionFlow.vue'
import type { DisputeData } from '@/components/flows/DisputeResolutionFlow.vue'

const toast = useToast()
const users = ref<UserAdminRecord[]>([])
const loading = ref(false)
const activeTab = ref<'all' | 'kyc' | 'aml' | 'sanctions' | 'disputes' | 'resolved'>('all')

interface QueueItem {
  priority: 'high' | 'med' | 'low'
  kind: string
  user: string
  detail: string
  risk: 'Crítico' | 'Alto' | 'Medio' | 'Bajo'
  age: string
  status: 'new' | 'review' | 'resolved'
  category: 'kyc' | 'aml' | 'sanctions' | 'disputes' | 'resolved'
}

const mockQueue: QueueItem[] = [
  { priority: 'high', kind: 'KYC L2', user: 'Lucía González', detail: 'Selfie + comprobante de domicilio', risk: 'Bajo', age: '12 min', status: 'new', category: 'kyc' },
  { priority: 'high', kind: 'AML alert', user: 'Mateo Fernández', detail: 'Patrón sospechoso · 12 retiros < umbral', risk: 'Alto', age: '38 min', status: 'review', category: 'aml' },
  { priority: 'high', kind: 'Sanciones OFAC', user: 'Diego López', detail: 'Coincidencia 87% en lista', risk: 'Crítico', age: '1 h', status: 'review', category: 'sanctions' },
  { priority: 'med', kind: 'KYC L3', user: 'Sofía Pérez', detail: 'Fuente de fondos · empleado en relación de dependencia', risk: 'Bajo', age: '2 h', status: 'new', category: 'kyc' },
  { priority: 'med', kind: 'Disputa P2P', user: 'Valentina Sosa', detail: 'Operación #4821 · USD 1,820', risk: 'Medio', age: '3 h', status: 'review', category: 'disputes' },
  { priority: 'med', kind: 'KYC L2', user: 'Tomás Acosta', detail: 'Documento ilegible · solicitar reenvío', risk: 'Bajo', age: '4 h', status: 'new', category: 'kyc' },
  { priority: 'low', kind: 'Re-KYC anual', user: 'Camila Romero', detail: 'Vencimiento de verificación', risk: 'Bajo', age: '8 h', status: 'new', category: 'kyc' },
  { priority: 'low', kind: 'KYC L1', user: 'Joaquín Silva', detail: 'DNI · primer onboarding', risk: 'Bajo', age: '11 h', status: 'new', category: 'kyc' },
]

const tabDefs = [
  { key: 'all', label: 'Todas' },
  { key: 'kyc', label: 'KYC' },
  { key: 'aml', label: 'AML', danger: true },
  { key: 'sanctions', label: 'Sanciones' },
  { key: 'disputes', label: 'Disputas P2P' },
  { key: 'resolved', label: 'Resueltas hoy' },
] as const

const tabCounts: Record<string, number> = {
  all: mockQueue.length,
  kyc: mockQueue.filter((q) => q.category === 'kyc').length,
  aml: mockQueue.filter((q) => q.category === 'aml').length,
  sanctions: mockQueue.filter((q) => q.category === 'sanctions').length,
  disputes: mockQueue.filter((q) => q.category === 'disputes').length,
  resolved: 0,
}

const filteredQueue = computed(() => {
  if (activeTab.value === 'all') return mockQueue
  if (activeTab.value === 'resolved') return []
  return mockQueue.filter((q) => q.category === activeTab.value)
})

const kycFlowData = ref<KYCData | null>(null)
const disputeFlowData = ref<DisputeData | null>(null)

function openReview(item: QueueItem) {
  if (item.category === 'disputes') {
    disputeFlowData.value = {
      opId: '4821',
      buyer: 'Valentina Sosa',
      seller: 'GauchoCripto',
      amount: '1,820.00',
      asset: 'USDT',
    }
  } else {
    kycFlowData.value = {
      user: item.user,
      country: '🇦🇷',
      kind: item.kind,
      age: item.age,
      risk: item.risk,
    }
  }
}

const stats = [
  { label: 'En cola', value: '23', detail: '4 prioritarias', detailColor: 'var(--danger)' },
  { label: 'SLA cumplido (7d)', value: '96.4%', valueColor: 'var(--success)', detail: 'Objetivo: 95%' },
  { label: 'Tiempo medio resolución', value: '2.4h', detail: '↓ 18 min vs. mes anterior' },
  { label: 'Alertas AML 24h', value: '14', valueColor: 'var(--warning)', detail: '3 escaladas' },
]

function riskColor(risk: string): string {
  if (risk === 'Crítico') return 'var(--danger)'
  if (risk === 'Alto') return 'var(--warning)'
  if (risk === 'Medio') return 'var(--info)'
  return 'var(--success)'
}

function kindColor(kind: string): { bg: string; color: string } {
  if (kind.includes('AML') || kind.includes('Sanciones')) return { bg: 'var(--danger-soft)', color: 'var(--danger)' }
  if (kind.includes('Disputa')) return { bg: 'var(--warning-soft)', color: 'var(--warning)' }
  return { bg: 'var(--accent-soft)', color: 'var(--accent-text)' }
}

async function load() {
  loading.value = true
  try {
    const res = await listUsers()
    users.value = res.users
  } catch (e: unknown) {
    toast.add({ severity: 'error', summary: 'Error al cargar', detail: String(e), life: 4000 })
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="compliance-view">
    <div class="page-h">
      <div>
        <h1>Compliance · cola de trabajo</h1>
        <p>KYC, AML, sanciones y disputas P2P pendientes de revisión.</p>
      </div>
      <div class="page-h-actions">
        <button class="btn-ghost">
          <span class="pi pi-download" aria-hidden="true" />
          Reporte regulatorio
        </button>
        <button class="btn-ghost">
          <span class="pi pi-cog" aria-hidden="true" />
          Reglas AML
        </button>
      </div>
    </div>

    <!-- Big stats -->
    <div class="bigstat-row">
      <div v-for="s in stats" :key="s.label" class="bigstat">
        <div class="bigstat-lb">{{ s.label }}</div>
        <div class="bigstat-vl" :style="s.valueColor ? { color: s.valueColor } : {}">{{ s.value }}</div>
        <div class="bigstat-ds" :style="s.detailColor ? { color: s.detailColor } : {}">{{ s.detail }}</div>
      </div>
    </div>

    <!-- Tab strip -->
    <div class="tabstrip" role="tablist">
      <button
        v-for="t in tabDefs"
        :key="t.key"
        role="tab"
        class="tab-item"
        :class="{ active: activeTab === t.key, danger: 'danger' in t && t.danger }"
        :aria-selected="activeTab === t.key"
        @click="activeTab = t.key"
      >
        {{ t.label }}
        <span
          class="tab-count"
          :class="{
            'tab-count-danger': 'danger' in t && t.danger,
            'tab-count-success': t.key === 'resolved',
          }"
        >{{ tabCounts[t.key] ?? 0 }}</span>
      </button>
    </div>

    <!-- Queue -->
    <div class="panel queue-panel">
      <div v-if="loading" class="loading-row">
        <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
      </div>
      <template v-else>
        <div v-if="filteredQueue.length === 0" class="empty-row">Sin elementos en esta categoría.</div>
        <div v-for="(item, i) in filteredQueue" :key="i" class="queue-item">
          <div class="queue-left">
            <div class="queue-priority" :class="`qp-${item.priority}`" />
            <div class="queue-avatar" aria-hidden="true">{{ item.user.charAt(0) }}</div>
            <div class="queue-info">
              <div class="queue-name-row">
                <span class="queue-name">{{ item.user }}</span>
                <span
                  class="kind-badge"
                  :style="{ background: kindColor(item.kind).bg, color: kindColor(item.kind).color }"
                >{{ item.kind }}</span>
              </div>
              <div class="queue-detail">{{ item.detail }}</div>
            </div>
          </div>
          <div class="queue-meta">
            <div class="meta-label">Riesgo</div>
            <div class="meta-value" :style="{ color: riskColor(item.risk) }">{{ item.risk }}</div>
            <div class="meta-age">hace {{ item.age }}</div>
          </div>
          <div class="queue-actions">
            <button class="btn-sm btn-outline" @click="openReview(item)">Revisar</button>
          </div>
        </div>
      </template>
    </div>
  </div>

  <KYCReviewFlow
    v-if="kycFlowData"
    :data="kycFlowData"
    @close="kycFlowData = null"
    @complete="kycFlowData = null"
  />
  <DisputeResolutionFlow
    v-if="disputeFlowData"
    :data="disputeFlowData"
    @close="disputeFlowData = null"
    @complete="disputeFlowData = null"
  />
</template>

<style scoped>
.compliance-view { display: flex; flex-direction: column; gap: 14px; }

.page-h { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.page-h h1 { font-size: 22px; font-weight: 600; letter-spacing: -0.015em; margin: 0 0 2px; color: var(--text); }
.page-h p  { margin: 0; font-size: 13px; color: var(--text-2); }
.page-h-actions { display: flex; gap: 8px; }

.btn-ghost {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 13px; border-radius: var(--radius); border: 1px solid var(--border);
  background: var(--surface); color: var(--text-2); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: background 0.12s, color 0.12s; font-family: var(--font-sans);
}
.btn-ghost:hover { background: var(--hover); color: var(--text); }

/* ── Big stats ───────────────────────────────────────────────────────────── */
.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.bigstat {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px 18px;
}

.bigstat-lb {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}

.bigstat-vl {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text);
  line-height: 1;
}

.bigstat-ds {
  font-size: 11.5px;
  color: var(--text-2);
  margin-top: 6px;
}

/* ── Tab strip ───────────────────────────────────────────────────────────── */
.tabstrip {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  font-family: var(--font-sans);
  transition: color 0.12s;
  margin-bottom: -1px;
}

.tab-item:hover { color: var(--text); }
.tab-item.active { color: var(--text); border-bottom-color: var(--text); }
.tab-item.danger { color: var(--danger); }
.tab-item.danger.active { border-bottom-color: var(--danger); }

.tab-count {
  padding: 1px 5px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  background: var(--muted-soft);
  color: var(--muted);
}
.tab-count-danger { background: var(--danger-soft); color: var(--danger); }
.tab-count-success { background: var(--success-soft); color: var(--success); }

/* ── Queue panel ─────────────────────────────────────────────────────────── */
.panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
.queue-panel { }
.loading-row { display: flex; align-items: center; gap: 8px; color: var(--text-2); font-size: 13px; padding: 16px; }
.empty-row { padding: 24px; text-align: center; color: var(--text-3); font-size: 13px; }

.queue-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.queue-item:last-child { border-bottom: none; }

.queue-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.queue-priority {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.qp-high { background: var(--danger); box-shadow: 0 0 0 3px var(--danger-soft); }
.qp-med  { background: var(--warning); box-shadow: 0 0 0 3px var(--warning-soft); }
.qp-low  { background: var(--border-strong); }

.queue-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c9a87a, #8a6a3e);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.queue-info { min-width: 0; }

.queue-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.queue-name { font-weight: 500; font-size: 13px; color: var(--text); }

.kind-badge {
  padding: 1px 7px;
  border-radius: 20px;
  font-size: 10.5px;
  font-weight: 600;
}

.queue-detail {
  font-size: 12px;
  color: var(--text-2);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-meta {
  text-align: right;
  flex-shrink: 0;
  min-width: 80px;
}

.meta-label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
}

.meta-value {
  font-weight: 600;
  font-size: 13px;
}

.meta-age {
  font-size: 11px;
  color: var(--text-3);
  margin-top: 2px;
}

.queue-actions { display: flex; gap: 6px; flex-shrink: 0; }

.btn-sm {
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: var(--font-sans);
  transition: background 0.12s;
}

.btn-outline {
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-2);
}
.btn-outline:hover { background: var(--hover); color: var(--text); }

@media (max-width: 900px) {
  .bigstat-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .bigstat-row { grid-template-columns: 1fr; }
  .page-h { flex-direction: column; align-items: flex-start; }
}
</style>
