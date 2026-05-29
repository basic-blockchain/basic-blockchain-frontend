<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { listUsers, type UserAdminRecord } from '@/api/admin'
import { useToast } from '@/composables/useToast'
import KYCReviewFlow from '@/components/flows/KYCReviewFlow.vue'
import type { KYCData } from '@/components/flows/KYCReviewFlow.vue'
import DisputeResolutionFlow from '@/components/flows/DisputeResolutionFlow.vue'
import type { DisputeData } from '@/components/flows/DisputeResolutionFlow.vue'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import PaginatedTable from '@/components/organisms/PaginatedTable.vue'

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
  {
    priority: 'high',
    kind: 'KYC L2',
    user: 'Lucía González',
    detail: 'Selfie + comprobante de domicilio',
    risk: 'Bajo',
    age: '12 min',
    status: 'new',
    category: 'kyc',
  },
  {
    priority: 'high',
    kind: 'AML alert',
    user: 'Mateo Fernández',
    detail: 'Patrón sospechoso · 12 retiros < umbral',
    risk: 'Alto',
    age: '38 min',
    status: 'review',
    category: 'aml',
  },
  {
    priority: 'high',
    kind: 'Sanciones OFAC',
    user: 'Diego López',
    detail: 'Coincidencia 87% en lista',
    risk: 'Crítico',
    age: '1 h',
    status: 'review',
    category: 'sanctions',
  },
  {
    priority: 'med',
    kind: 'KYC L3',
    user: 'Sofía Pérez',
    detail: 'Fuente de fondos · empleado en relación de dependencia',
    risk: 'Bajo',
    age: '2 h',
    status: 'new',
    category: 'kyc',
  },
  {
    priority: 'med',
    kind: 'Disputa P2P',
    user: 'Valentina Sosa',
    detail: 'Operación #4821 · USD 1,820',
    risk: 'Medio',
    age: '3 h',
    status: 'review',
    category: 'disputes',
  },
  {
    priority: 'med',
    kind: 'KYC L2',
    user: 'Tomás Acosta',
    detail: 'Documento ilegible · solicitar reenvío',
    risk: 'Bajo',
    age: '4 h',
    status: 'new',
    category: 'kyc',
  },
  {
    priority: 'low',
    kind: 'Re-KYC anual',
    user: 'Camila Romero',
    detail: 'Vencimiento de verificación',
    risk: 'Bajo',
    age: '8 h',
    status: 'new',
    category: 'kyc',
  },
  {
    priority: 'low',
    kind: 'KYC L1',
    user: 'Joaquín Silva',
    detail: 'DNI · primer onboarding',
    risk: 'Bajo',
    age: '11 h',
    status: 'new',
    category: 'kyc',
  },
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
  {
    label: 'SLA cumplido (7d)',
    value: '96.4%',
    valueColor: 'var(--success)',
    detail: 'Objetivo: 95%',
  },
  { label: 'Tiempo medio resolución', value: '2.4h', detail: '↓ 18 min vs. mes anterior' },
  { label: 'Alertas AML 24h', value: '14', valueColor: 'var(--warning)', detail: '3 escaladas' },
]

type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

function riskTone(risk: string): BadgeTone {
  if (risk === 'Crítico') return 'danger'
  if (risk === 'Alto') return 'warning'
  if (risk === 'Medio') return 'info'
  return 'success'
}

function kindTone(kind: string): BadgeTone {
  if (kind.includes('AML') || kind.includes('Sanciones')) return 'danger'
  if (kind.includes('Disputa')) return 'warning'
  return 'info'
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

interface QueueColumn {
  key: string
  label: string
}

const queueColumns: QueueColumn[] = [
  { key: 'priority', label: '' },
  { key: 'user', label: 'Usuario' },
  { key: 'kind', label: 'Tipo' },
  { key: 'detail', label: 'Detalle' },
  { key: 'risk', label: 'Riesgo' },
  { key: 'age', label: 'Antiguedad' },
]
</script>

<template>
  <div class="compliance-view">
    <div class="page-h">
      <div>
        <h1>Compliance · cola de trabajo</h1>
        <p>KYC, AML, sanciones y disputas P2P pendientes de revisión.</p>
      </div>
      <div class="page-h-actions">
        <BaseButton variant="ghost" size="sm">
          <template #leading>
            <span class="pi pi-download" aria-hidden="true" />
          </template>
          Reporte regulatorio
        </BaseButton>
        <BaseButton variant="ghost" size="sm">
          <template #leading>
            <span class="pi pi-cog" aria-hidden="true" />
          </template>
          Reglas AML
        </BaseButton>
      </div>
    </div>

    <!-- Big stats -->
    <div class="bigstat-row">
      <BaseCard v-for="s in stats" :key="s.label" variant="bigstat">
        <template #header>
          <span>{{ s.label }}</span>
        </template>
        <span :style="s.valueColor ? { color: s.valueColor } : {}">{{ s.value }}</span>
        <template #footer>
          <span :style="s.detailColor ? { color: s.detailColor } : {}">{{ s.detail }}</span>
        </template>
      </BaseCard>
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
          >{{ tabCounts[t.key] ?? 0 }}</span
        >
      </button>
    </div>

    <!-- Queue -->
    <BaseCard class="queue-panel" variant="default" padding="none">
      <div v-if="loading" class="loading-row">
        <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
      </div>
      <PaginatedTable v-else :columns="queueColumns" :rows="filteredQueue">
        <template #cell-priority="{ row }">
          <span class="queue-priority" :class="`qp-${row.priority}`" aria-hidden="true" />
        </template>
        <template #cell-user="{ row }">
          <div class="queue-user">
            <div class="queue-avatar" aria-hidden="true">
              {{ row.user.charAt(0) }}
            </div>
            <div class="queue-info">
              <div class="queue-name">
                {{ row.user }}
              </div>
            </div>
          </div>
        </template>
        <template #cell-kind="{ row }">
          <BaseBadge :tone="kindTone(row.kind)">
            {{ row.kind }}
          </BaseBadge>
        </template>
        <template #cell-detail="{ row }">
          <span class="queue-detail">{{ row.detail }}</span>
        </template>
        <template #cell-risk="{ row }">
          <BaseBadge :tone="riskTone(row.risk)">
            {{ row.risk }}
          </BaseBadge>
        </template>
        <template #cell-age="{ row }">
          <span class="meta-age">hace {{ row.age }}</span>
        </template>
        <template #row-actions="{ row }">
          <BaseButton size="sm" variant="secondary" @click="openReview(row)"> Revisar </BaseButton>
        </template>
        <template #empty> Sin elementos en esta categoría. </template>
      </PaginatedTable>
    </BaseCard>
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
.compliance-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.page-h {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.page-h h1 {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 0 0 2px;
  color: var(--text);
}
.page-h p {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}
.page-h-actions {
  display: flex;
  gap: 8px;
}

/* ── Big stats ───────────────────────────────────────────────────────────── */
.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
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

.tab-item:hover {
  color: var(--text);
}
.tab-item.active {
  color: var(--text);
  border-bottom-color: var(--text);
}
.tab-item.danger {
  color: var(--danger);
}
.tab-item.danger.active {
  border-bottom-color: var(--danger);
}

.tab-count {
  padding: 1px 5px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  background: var(--muted-soft);
  color: var(--muted);
}
.tab-count-danger {
  background: var(--danger-soft);
  color: var(--danger);
}
.tab-count-success {
  background: var(--success-soft);
  color: var(--success);
}

/* ── Queue panel ─────────────────────────────────────────────────────────── */
.queue-panel {
}
.loading-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
  font-size: 13px;
  padding: 16px;
}

.queue-user {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.queue-priority {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.qp-high {
  background: var(--danger);
  box-shadow: 0 0 0 3px var(--danger-soft);
}
.qp-med {
  background: var(--warning);
  box-shadow: 0 0 0 3px var(--warning-soft);
}
.qp-low {
  background: var(--border-strong);
}

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

.queue-info {
  min-width: 0;
}

.queue-name {
  font-weight: 500;
  font-size: 13px;
  color: var(--text);
}

.queue-detail {
  font-size: 12px;
  color: var(--text-2);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-age {
  font-size: 11px;
  color: var(--text-3);
  margin-top: 2px;
}

@media (max-width: 900px) {
  .bigstat-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .bigstat-row {
    grid-template-columns: 1fr;
  }
  .page-h {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
