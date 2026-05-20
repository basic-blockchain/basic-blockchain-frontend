<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import { useChainStore } from '@/stores/chain'
import { useNodesStore } from '@/stores/nodes'
import { validateTransaction } from '@/domain/transaction'
import { useToast } from '@/composables/useToast'
import { useValidationHistoryStore } from '@/stores/validationHistory'
import BaseButton from '@/components/atoms/BaseButton.vue'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseTable from '@/components/atoms/BaseTable.vue'

const chainStore = useChainStore()
const nodesStore = useNodesStore()
const toast = useToast()
const historyStore = useValidationHistoryStore()

const loadingChainValidation = ref(false)
const chainValidation = ref<{ valid: boolean; message: string } | null>(null)
const page = ref(1)
const pageSize = ref(10)

const blockForm = reactive({ index: null as number | null })
const nodeForm = reactive({ url: '' })
const txForm = reactive({ sender: '', receiver: '', amount: null as number | null })

const selectedBlock = computed(() => {
  if (blockForm.index === null) return null
  return chainStore.blocks.find((b) => b.index === blockForm.index) ?? null
})

const blockNotFound = computed(() => blockForm.index !== null && selectedBlock.value === null)

const blockChecks = computed(() => {
  if (!selectedBlock.value) return []
  const checks: Array<{ label: string; ok: boolean }> = []
  checks.push({ label: 'Index exists in current chain', ok: true })
  checks.push({
    label: 'Genesis previous hash must be 0',
    ok: selectedBlock.value.index !== 1 || selectedBlock.value.previousHash === '0',
  })
  checks.push({
    label: 'Proof must be a positive integer',
    ok: Number.isInteger(selectedBlock.value.proof) && selectedBlock.value.proof > 0,
  })
  checks.push({
    label: 'Timestamp must be parseable',
    ok: Number.isNaN(new Date(selectedBlock.value.timestamp).getTime()) === false,
  })
  return checks
})

const nodeChecks = computed(() => {
  if (!nodeForm.url.trim()) return []
  const checks: Array<{ label: string; ok: boolean }> = []
  let isHttpUrl = false
  try {
    const parsed = new URL(nodeForm.url.trim())
    isHttpUrl = parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    isHttpUrl = false
  }
  checks.push({ label: 'URL format is valid', ok: isHttpUrl })
  checks.push({
    label: 'Node is already registered',
    ok: nodesStore.peers.includes(nodeForm.url.trim()),
  })
  return checks
})

const txHasInput = computed(
  () => txForm.sender.trim() !== '' || txForm.receiver.trim() !== '' || txForm.amount !== null
)

const txChecks = computed(() => {
  if (!txHasInput.value) return []
  const errors = validateTransaction({
    sender: txForm.sender,
    receiver: txForm.receiver,
    amount: txForm.amount ?? undefined,
  })

  return [
    { label: 'Sender is present', ok: !errors.some((e) => e.field === 'sender') },
    { label: 'Receiver is present', ok: !errors.some((e) => e.field === 'receiver') },
    { label: 'Amount is positive', ok: !errors.some((e) => e.field === 'amount') },
    {
      label: 'Sender and receiver differ',
      ok: !errors.some((e) => e.message.includes('must differ')),
    },
  ]
})

async function _validateCurrentChain() {
  loadingChainValidation.value = true
  try {
    const result = await chainStore.fetchValidation()
    chainValidation.value = result
    historyStore.record('chain', result.valid ? 'valid' : 'invalid', 'full chain', result.message)
    if (result.valid) {
      toast.success('Chain validation', result.message)
    } else {
      toast.error('Chain validation failed', result.message)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Validation failed'
    historyStore.record('chain', 'error', 'full chain', msg)
    toast.error('Chain validation failed', msg)
  } finally {
    loadingChainValidation.value = false
  }
}

const validateCurrentChain = useDebounceFn(_validateCurrentChain, 1000)

function downloadHistory() {
  const blob = new Blob([historyStore.exportJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `validation-history-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadCsv() {
  const rows = [...historyStore.events].reverse()
  if (rows.length === 0) return
  const headers = ['id', 'type', 'status', 'target', 'message', 'timestamp']
  const csv = [headers.join(',')]
    .concat(
      rows.map((r: any) =>
        [r.id, r.type, r.status, r.target, `"${String(r.message).replace(/"/g, '""')}"`, r.timestamp].join(',')
      )
    )
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `validation-history-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function formatTime(value: unknown) {
  return new Date(String(value)).toLocaleString()
}

const totalPages = computed(() => Math.max(1, Math.ceil(historyStore.total / pageSize.value)))
const pagedEvents = computed(() => {
  const all = [...historyStore.events].reverse()
  const start = (page.value - 1) * pageSize.value
  return all.slice(start, start + pageSize.value)
})

onMounted(async () => {
  await Promise.all([chainStore.fetchChain(), nodesStore.fetchNodes()])
})
</script>

<template>
  <div class="validation-view">
    <div class="page-h">
      <div>
        <h1>Centro de validación</h1>
        <p>Verificación de integridad de la cadena, bloques y transacciones</p>
      </div>
      <div class="page-actions">
        <BaseButton
          variant="primary"
          size="sm"
          :loading="loadingChainValidation"
          @click="validateCurrentChain"
        >
          <span
            class="pi"
            :class="loadingChainValidation ? 'pi-spin pi-spinner' : 'pi-check-circle'"
            aria-hidden="true"
          />
          Validar cadena
        </BaseButton>
        <BaseButton
          v-if="historyStore.total > 0"
          variant="ghost"
          size="sm"
          @click="downloadHistory"
        >
          <span class="pi pi-download" aria-hidden="true" />
          Exportar historial
        </BaseButton>
        <BaseButton
          v-if="historyStore.total > 0"
          variant="ghost"
          size="sm"
          @click="downloadCsv"
        >
          <span class="pi pi-file-o" aria-hidden="true" />
          Export CSV
        </BaseButton>
      </div>
    </div>

    <!-- KPI bigstat row -->
    <div class="bigstat-row">
      <BaseCard variant="bigstat">
        <template #header> Validaciones </template>
        {{ historyStore.total }}
        <template #footer> en esta sesión </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header> Cadena </template>
        <span :class="chainValidation === null ? '' : chainValidation.valid ? 'vl-ok' : 'vl-err'">
          {{ chainValidation === null ? '—' : chainValidation.valid ? 'Válida' : 'Inválida' }}
        </span>
        <template #footer> último resultado </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header> Correctas </template>
        <span class="vl-ok">{{
          historyStore.events.filter((e: any) => e.status === 'valid').length
        }}</span>
        <template #footer> validaciones OK </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header> Fallidas </template>
        <span
          :class="
            historyStore.events.filter((e: any) => e.status !== 'valid').length > 0 ? 'vl-err' : ''
          "
        >
          {{ historyStore.events.filter((e: any) => e.status !== 'valid').length }}
        </span>
        <template #footer> errores o inválidas </template>
      </BaseCard>
    </div>

    <!-- Chain status -->
    <BaseCard variant="default" padding="none">
      <template #header>
        <span>Estado de la cadena</span>
      </template>
      <div class="section-body">
        <div
          class="chain-result"
          :class="chainValidation === null ? 'neutral' : chainValidation.valid ? 'ok' : 'fail'"
        >
          <span
            class="pi"
            :class="
              chainValidation?.valid
                ? 'pi-check-circle'
                : chainValidation
                  ? 'pi-times-circle'
                  : 'pi-circle'
            "
            aria-hidden="true"
          />
          <span>
            {{
              chainValidation
                ? chainValidation.message
                : 'Ejecuta la validación para verificar la integridad de la cadena.'
            }}
          </span>
        </div>
        <p class="endpoint-note">Endpoint: <code>/valid</code></p>
      </div>
    </BaseCard>

    <!-- Validation grid -->
    <div class="val-grid">
      <!-- Block validation -->
      <BaseCard variant="default" padding="none">
        <template #header>
          <span>Validación de bloque</span>
        </template>
        <div class="section-body">
          <InputNumber
            v-model="blockForm.index"
            placeholder="Índice de bloque"
            :min="1"
            class="val-input"
          />
          <div v-if="selectedBlock" class="check-list">
            <div
              v-for="check in blockChecks"
              :key="check.label"
              class="check-item"
              :class="check.ok ? 'ok' : 'fail'"
            >
              <span
                class="pi"
                :class="check.ok ? 'pi-check-circle' : 'pi-times-circle'"
                aria-hidden="true"
              />
              <span>{{ check.label }}</span>
            </div>
          </div>
          <div v-else-if="blockNotFound" class="inline-alert fail">
            <span class="pi pi-exclamation-triangle" aria-hidden="true" />
            Bloque #{{ blockForm.index }} no existe (altura: {{ chainStore.length }}).
          </div>
          <p v-else class="hint">
            Ingresa un índice (1–{{ chainStore.length || '?' }}) para inspeccionar el bloque.
          </p>
        </div>
      </BaseCard>

      <!-- Node validation -->
      <BaseCard variant="default" padding="none">
        <template #header>
          <span>Validación de nodo</span>
        </template>
        <div class="section-body">
          <InputText v-model="nodeForm.url" placeholder="http://peer:5000" class="val-input" />
          <div v-if="nodeChecks.length > 0" class="check-list">
            <div
              v-for="check in nodeChecks"
              :key="check.label"
              class="check-item"
              :class="check.ok ? 'ok' : 'fail'"
            >
              <span
                class="pi"
                :class="check.ok ? 'pi-check-circle' : 'pi-times-circle'"
                aria-hidden="true"
              />
              <span>{{ check.label }}</span>
            </div>
          </div>
          <p v-else class="hint">Ingresa una URL para evaluar su formato y estado de registro.</p>
        </div>
      </BaseCard>

      <!-- TX validation -->
      <BaseCard variant="default" padding="none" class="tx-panel">
        <template #header>
          <span>Validación de transacción</span>
        </template>
        <div class="section-body">
          <div class="tx-grid">
            <InputText v-model="txForm.sender" placeholder="Sender" class="val-input" />
            <InputText v-model="txForm.receiver" placeholder="Receiver" class="val-input" />
            <InputNumber
              v-model="txForm.amount"
              placeholder="Amount"
              :min-fraction-digits="0"
              :max-fraction-digits="8"
              class="val-input"
            />
          </div>
          <div v-if="txHasInput" class="check-list">
            <div
              v-for="check in txChecks"
              :key="check.label"
              class="check-item"
              :class="check.ok ? 'ok' : 'fail'"
            >
              <span
                class="pi"
                :class="check.ok ? 'pi-check-circle' : 'pi-times-circle'"
                aria-hidden="true"
              />
              <span>{{ check.label }}</span>
            </div>
          </div>
          <p v-else class="hint">
            Rellena sender, receiver y amount para validar las reglas de negocio.
          </p>
        </div>
      </BaseCard>
    </div>

    <!-- Validation history -->
    <BaseCard v-if="historyStore.total > 0" variant="default" padding="none">
      <template #header>
        <span>Historial de validaciones</span>
        <span class="count-badge sm">{{ historyStore.total }}</span>
      </template>
      <div class="section-body history-list-shell">
        <div class="history-controls" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px;">
          <div style="display:flex;gap:8px;align-items:center;">
            <label class="hint">Page size</label>
            <select v-model="pageSize" @change="page = 1">
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="25">25</option>
            </select>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button type="button" class="btn" :disabled="page <= 1" @click="page = page - 1">Prev</button>
            <span class="hint">Page {{ page }} / {{ totalPages }}</span>
            <button type="button" class="btn" :disabled="page >= totalPages" @click="page = page + 1">Next</button>
          </div>
        </div>

        <BaseTable
          :columns="[
            { key: 'type', label: 'Type' },
            { key: 'target', label: 'Target' },
            { key: 'message', label: 'Message' },
            { key: 'status', label: 'Status', width: 120, align: 'center' },
            { key: 'timestamp', label: 'Time', width: 140 }
          ]"
          :rows="pagedEvents"
          row-key="id"
        >
          <template #cell-status="{ row }">
            <span :class="['pi', row.status === 'valid' ? 'pi-check-circle' : row.status === 'invalid' ? 'pi-times-circle' : 'pi-exclamation-triangle']" aria-hidden="true"></span>
            <span style="margin-left:6px">{{ row.status }}</span>
          </template>
          <template #cell-timestamp="{ value }">
            {{ new Date(value).toLocaleString() }}
          </template>
        </BaseTable>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
.validation-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Header */
.page-h {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
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
.page-actions {
  display: flex;
  gap: 8px;
}

/* Bigstat KPI row */
.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.vl-ok {
  color: var(--success);
}
.vl-err {
  color: var(--danger);
}

/* Panels */
.section-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Chain status */
.chain-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  font-size: 13.5px;
  color: var(--text-2);
  background: var(--surface-2);
}
.chain-result.ok {
  border-color: var(--success);
  background: var(--success-soft);
  color: var(--success);
}
.chain-result.fail {
  border-color: var(--danger);
  background: var(--danger-soft);
  color: var(--danger);
}
.chain-result .pi {
  font-size: 15px;
  flex-shrink: 0;
}
.endpoint-note {
  font-size: 12px;
  color: var(--text-3);
  margin: 0;
}
.endpoint-note code {
  font-family: var(--font-mono);
  background: var(--surface-2);
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid var(--border);
}

/* Grid */
.val-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.tx-panel {
  grid-column: 1 / -1;
}

/* Inputs */
.val-input {
  width: 100%;
}
.tx-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

/* Check lists */
.check-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.check-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
}
.check-item.ok {
  border-color: var(--success);
  background: var(--success-soft);
  color: var(--success);
}
.check-item.fail {
  border-color: var(--danger);
  background: var(--danger-soft);
  color: var(--danger);
}
.check-item .pi {
  font-size: 13px;
  flex-shrink: 0;
}

.inline-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 10px 12px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}
.inline-alert.fail {
  border-color: var(--warning);
  background: var(--warning-soft);
  color: var(--warning);
}

.hint {
  font-size: 13px;
  color: var(--text-3);
  margin: 0;
}

/* History */
.history-list-shell {
  gap: 0;
}
.history-list {
  display: flex;
  flex-direction: column;
  max-height: 320px;
  overflow-y: auto;
}
.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}
.history-item:last-child {
  border-bottom: none;
}
.history-item.valid {
  background: var(--success-soft);
}
.history-item.invalid {
  background: var(--danger-soft);
}
.history-item.error {
  background: var(--warning-soft);
}
.history-icon {
  font-size: 14px;
  flex-shrink: 0;
}
.history-item.valid .history-icon {
  color: var(--success);
}
.history-item.invalid .history-icon {
  color: var(--danger);
}
.history-item.error .history-icon {
  color: var(--warning);
}
.history-body {
  display: flex;
  gap: 6px;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
}
.ev-type {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--muted-soft);
  color: var(--muted);
  padding: 1px 6px;
  border-radius: 4px;
}
.ev-target {
  color: var(--text-2);
}
.ev-message {
  color: var(--text);
}
.ev-time {
  color: var(--text-3);
  font-size: 12px;
  margin-left: auto;
  flex-shrink: 0;
}

.count-badge.sm {
  font-size: 11px;
  padding: 1px 7px;
}

@media (max-width: 900px) {
  .val-grid {
    grid-template-columns: 1fr;
  }
  .tx-grid {
    grid-template-columns: 1fr;
  }
  .tx-panel {
    grid-column: auto;
  }
  .page-h {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
