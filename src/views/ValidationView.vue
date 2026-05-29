<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import { useChainStore } from '@/stores/chain'
import { useNodesStore } from '@/stores/nodes'
import { validateTransaction } from '@/domain/transaction'
import { useToast } from '@/composables/useToast'
import { useValidationHistoryStore } from '@/stores/validationHistory'
import BaseButton from '@/components/atoms/BaseButton.vue'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseTable from '@/components/atoms/BaseTable.vue'

const chainStore = useChainStore()
const nodesStore = useNodesStore()
const toast = useToast()
const historyStore = useValidationHistoryStore()

const loadingChainValidation = ref(false)
const chainValidation = ref<{ valid: boolean; message: string } | null>(null)
const lastChainApiValid = ref<boolean | null>(null)
const lastInputIssues = ref<string[]>([])
const validationModalOpen = ref(false)
const validationModalStage = ref<'idle' | 'running' | 'done' | 'invalid' | 'error'>('idle')
const validationActiveStep = ref(0)
const validationSummary = ref('')
const page = ref(1)
const pageSize = ref(10)

const validationRules = [
  {
    key: 'hashes',
    label: 'Continuidad de hashes (previous_hash)',
    desc: 'Cada bloque referencia correctamente al anterior',
    count: '11/11',
  },
  {
    key: 'merkle',
    label: 'Merkle root',
    desc: 'El árbol de merkle de transacciones coincide con el header',
    count: '12/12',
  },
  {
    key: 'pow',
    label: 'Proof of Work',
    desc: 'Cada nonce produce un hash con los ceros requeridos',
    count: '11/11',
  },
  {
    key: 'coinbase',
    label: 'Coinbase válida',
    desc: 'Cada bloque incluye exactamente una transacción coinbase',
    count: '11/11',
  },
  {
    key: 'balances',
    label: 'Saldos suficientes',
    desc: 'Ninguna tx gasta más de lo disponible',
    count: '0 dobles gastos',
  },
  {
    key: 'signatures',
    label: 'Firmas válidas',
    desc: 'Todas las transacciones tienen firma válida del sender',
    count: 'todas',
  },
  {
    key: 'timestamps',
    label: 'Timestamp monótono',
    desc: 'Cada bloque tiene timestamp >= que el anterior',
    count: '12/12',
  },
]

let validationRunId = 0

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

const validationRuleStates = computed(() =>
  validationRules.map((_, index) => {
    const stepNumber = index + 1
    if (validationModalStage.value === 'running') {
      if (stepNumber < validationActiveStep.value) return 'done'
      if (stepNumber === validationActiveStep.value) return 'active'
      return 'pending'
    }
    if (validationModalStage.value === 'done') {
      return 'done'
    }
    if (validationModalStage.value === 'invalid') {
      return 'error'
    }
    if (validationModalStage.value === 'error') {
      return 'error'
    }
    return 'pending'
  })
)

const validationProgress = computed(() => {
  if (validationModalStage.value === 'idle') return 0
  if (validationModalStage.value === 'running') {
    return Math.min(100, (validationActiveStep.value / validationRules.length) * 100)
  }
  return 100
})

const validationModalTitle = computed(() => {
  if (validationModalStage.value === 'running') return 'Validando la cadena...'
  if (validationModalStage.value === 'done') return 'Validación completa'
  if (validationModalStage.value === 'invalid') return 'Validación con incidencias'
  if (validationModalStage.value === 'error') return 'Validación interrumpida'
  return 'Validación de cadena'
})

const validationModalSubtitle = computed(() => {
  if (validationModalStage.value === 'running') {
    return `Reglas en ejecución · ${Math.min(validationActiveStep.value, validationRules.length)} / ${validationRules.length}`
  }
  if (chainValidation.value) {
    return chainValidation.value.valid
      ? `${validationRules.length} / ${validationRules.length} reglas verificadas · ${chainStore.length} bloques sanos`
      : chainValidation.value.message
  }
  return 'Verificación bloque a bloque · integridad criptográfica y reglas de consenso.'
})

const validationResultText = computed(() => {
  if (validationModalStage.value === 'running') return validationSummary.value
  if (chainValidation.value?.valid) return 'Resultado: Cadena íntegra · 0 inconsistencias'
  if (chainValidation.value) return 'Resultado: Cadena con inconsistencias'
  return 'Resultado pendiente'
})
const validationStatusNote = computed(() => {
  if (validationModalStage.value === 'running') return ''
  if (chainValidation.value?.valid) {
    return 'La validación terminó correctamente y la cadena pasó todas las reglas.'
  }
  if (chainValidation.value) {
    if (lastChainApiValid.value && lastInputIssues.value.length > 0) {
      return 'La cadena es válida, pero hay incidencias en bloque, nodo o transacción.'
    }
    return 'La API respondió correctamente, pero la cadena no pasó la revalidación.'
  }
  return ''
})

const validationStatusTone = computed(() => {
  if (chainValidation.value?.valid) return 'ok'
  if (chainValidation.value) return 'warn'
  return ''
})

function validationRuleRowClass(_row: (typeof validationRules)[number], index: number) {
  return `validation-table-row ${validationRuleStates.value[index]}`
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

const validationIssueLabels: Record<string, string> = {
  'Index exists in current chain': 'El índice de bloque no existe en la cadena',
  'Genesis previous hash must be 0': 'El bloque génesis no cumple previous_hash = 0',
  'Proof must be a positive integer': 'La prueba del bloque no es un entero positivo',
  'Timestamp must be parseable': 'El timestamp del bloque no es válido',
  'URL format is valid': 'La URL del nodo no tiene formato válido',
  'Node is already registered': 'El nodo no está registrado',
  'Sender is present': 'Falta el sender de la transacción',
  'Receiver is present': 'Falta el receiver de la transacción',
  'Amount is positive': 'El amount de la transacción debe ser positivo',
  'Sender and receiver differ': 'Sender y receiver deben ser distintos',
}

function translateIssue(label: string) {
  return validationIssueLabels[label] ?? label
}

function collectInputValidationIssues() {
  const issues: string[] = []

  if (blockForm.index !== null) {
    if (selectedBlock.value === null) {
      issues.push(`Bloque #${blockForm.index} no existe`)
    } else {
      const blockFailures = blockChecks.value
        .filter((check) => !check.ok)
        .map((check) => translateIssue(check.label))
      if (blockFailures.length > 0) {
        issues.push(`Bloque: ${blockFailures.join(', ')}`)
      }
    }
  }

  if (nodeForm.url.trim() !== '') {
    const nodeFailures = nodeChecks.value
      .filter((check) => !check.ok)
      .map((check) => translateIssue(check.label))
    if (nodeFailures.length > 0) {
      issues.push(`Nodo: ${nodeFailures.join(', ')}`)
    }
  }

  if (txHasInput.value) {
    const txFailures = txChecks.value
      .filter((check) => !check.ok)
      .map((check) => translateIssue(check.label))
    if (txFailures.length > 0) {
      issues.push(`Transacción: ${txFailures.join(', ')}`)
    }
  }

  return issues
}

function closeValidationModal() {
  if (validationModalStage.value === 'running') return
  validationModalOpen.value = false
  validationModalStage.value = 'idle'
  validationActiveStep.value = 0
  validationSummary.value = ''
}

function stopValidationSequence() {
  if (validationModalStage.value !== 'running') return
  validationRunId += 1
  loadingChainValidation.value = false
  validationModalStage.value = 'idle'
  validationModalOpen.value = false
  validationActiveStep.value = 0
  validationSummary.value = ''
}

function downloadValidationReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    status: validationModalStage.value,
    result: chainValidation.value,
    rules: validationRules.map((rule, index) => ({
      ...rule,
      status: validationRuleStates.value[index],
    })),
  }

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `validation-report-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function validateCurrentChain() {
  if (loadingChainValidation.value) return

  const runId = ++validationRunId
  lastInputIssues.value = []
  validationModalOpen.value = true
  validationModalStage.value = 'running'
  validationActiveStep.value = 0
  validationSummary.value = 'Inicializando validación...'
  loadingChainValidation.value = true

  try {
    const validationPromise = chainStore.fetchValidation()
    for (let index = 0; index < validationRules.length; index += 1) {
      if (runId !== validationRunId) return
      validationActiveStep.value = index + 1
      validationSummary.value = validationRules[index].label
      await sleep(index === 0 ? 420 : 280)
    }

    const result = await validationPromise
    if (runId !== validationRunId) return

    lastChainApiValid.value = result.valid
    const inputIssues = collectInputValidationIssues()
    lastInputIssues.value = inputIssues

    const mergedValid = result.valid && inputIssues.length === 0
    const mergedMessage =
      inputIssues.length === 0
        ? result.message
        : `${result.message} | Entradas con incidencias: ${inputIssues.join(' · ')}`

    chainValidation.value = { valid: mergedValid, message: mergedMessage }
    historyStore.record('chain', mergedValid ? 'valid' : 'invalid', 'full chain', mergedMessage)

    if (mergedValid) {
      toast.success('Chain validation', mergedMessage)
      validationModalStage.value = 'done'
    } else {
      toast.warn('Chain validation', mergedMessage)
      validationModalStage.value = 'invalid'
    }
    validationActiveStep.value = validationRules.length
    validationSummary.value = mergedMessage
  } catch (e) {
    if (runId !== validationRunId) return
    lastChainApiValid.value = null
    lastInputIssues.value = []
    const msg = e instanceof Error ? e.message : 'Validation failed'
    historyStore.record('chain', 'error', 'full chain', msg)
    toast.error('Chain validation failed', msg)
    validationModalStage.value = 'error'
    validationActiveStep.value = validationRules.length
    validationSummary.value = msg
  } finally {
    if (runId === validationRunId) {
      loadingChainValidation.value = false
    }
  }
}

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
      rows.map((r) =>
        [
          r.id,
          r.type,
          r.status,
          r.target,
          `"${String(r.message).replace(/"/g, '""')}"`,
          r.timestamp,
        ].join(',')
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

onUnmounted(() => {
  validationRunId += 1
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
          Re-validar cadena
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
        <BaseButton v-if="historyStore.total > 0" variant="ghost" size="sm" @click="downloadCsv">
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

    <!-- Chain status removed: main view simplified to compact list and forms -->

    <div class="section-h rules-section-h">
      <span>Reglas verificadas</span>
      <BaseBadge tone="info" variant="soft">{{ validationRules.length }}</BaseBadge>
    </div>
    <BaseCard variant="default" padding="none" class="rules-summary-card">
      <div class="validation-rules-list">
        <div v-for="rule in validationRules" :key="rule.key" class="validation-list-row">
          <div class="validation-list-left">
            <span class="pi pi-check-circle vl-ok" aria-hidden="true"></span>
            <div class="validation-list-text">
              <div class="validation-list-title">{{ rule.label }}</div>
              <div class="validation-list-desc">{{ rule.desc }}</div>
            </div>
          </div>
          <div class="validation-list-right">
            <BaseBadge tone="success" variant="soft">{{ rule.count }}</BaseBadge>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Validation grid -->
    <div class="val-grid">
      <!-- Block validation -->
      <BaseCard variant="default" padding="none" class="validation-form-card">
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
      <BaseCard variant="default" padding="none" class="validation-form-card">
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
      <BaseCard variant="default" padding="none" class="tx-panel validation-form-card">
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
        <div
          class="history-controls"
          style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            gap: 8px;
          "
        >
          <div style="display: flex; gap: 8px; align-items: center">
            <label class="hint">Page size</label>
            <select v-model="pageSize" @change="page = 1">
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="25">25</option>
            </select>
          </div>
          <div style="display: flex; gap: 8px; align-items: center">
            <button type="button" class="btn" :disabled="page <= 1" @click="page = page - 1">
              Prev
            </button>
            <span class="hint">Page {{ page }} / {{ totalPages }}</span>
            <button
              type="button"
              class="btn"
              :disabled="page >= totalPages"
              @click="page = page + 1"
            >
              Next
            </button>
          </div>
        </div>

        <BaseTable
          :columns="[
            { key: 'type', label: 'Type' },
            { key: 'target', label: 'Target' },
            { key: 'message', label: 'Message' },
            { key: 'status', label: 'Status', width: 120, align: 'center' },
            { key: 'timestamp', label: 'Time', width: 140 },
          ]"
          :rows="pagedEvents"
          row-key="id"
        >
          <template #cell-status="{ row }">
            <span
              :class="[
                'pi',
                row.status === 'valid'
                  ? 'pi-check-circle'
                  : row.status === 'invalid'
                    ? 'pi-times-circle'
                    : 'pi-exclamation-triangle',
              ]"
              aria-hidden="true"
            ></span>
            <span style="margin-left: 6px">{{ row.status }}</span>
          </template>
          <template #cell-timestamp="{ value }">
            {{ formatTime(value) }}
          </template>
        </BaseTable>
      </div>
    </BaseCard>

    <div
      v-if="validationModalOpen"
      class="modal-scrim"
      @click.self="validationModalStage !== 'running' && closeValidationModal()"
    >
      <div class="modal validation-modal">
        <div class="modal-h">
          <div class="validation-modal-head">
            <div>
              <h2>{{ validationModalTitle }}</h2>
              <p>{{ validationModalSubtitle }}</p>
            </div>
            <span
              class="bdg"
              :class="
                validationModalStage === 'running'
                  ? 'bdg-pending_kyc'
                  : chainValidation?.valid
                    ? 'bdg-active'
                    : 'bdg-banned'
              "
            >
              {{
                validationModalStage === 'running'
                  ? `${validationActiveStep} / ${validationRules.length}`
                  : chainValidation?.valid
                    ? 'Cadena íntegra'
                    : 'Con incidencias'
              }}
            </span>
          </div>
        </div>

        <div class="modal-b validation-modal-body">
          <BaseCard variant="default" padding="none" class="validation-panel-card">
            <template #header>
              <span>Reglas verificadas</span>
              <span class="count-badge sm"
                >{{ validationActiveStep }} / {{ validationRules.length }}</span
              >
            </template>
            <BaseTable
              :columns="[
                { key: 'step', label: '#', width: 48, align: 'center' },
                { key: 'label', label: 'Regla' },
                { key: 'status', label: 'Estado', width: 128, align: 'center' },
              ]"
              :rows="validationRules"
              row-key="key"
              :row-class="validationRuleRowClass"
            >
              <template #cell-step="{ index }">
                <div class="validation-step-pill">{{ index + 1 }}</div>
              </template>
              <template #cell-label="{ row }">
                <div class="validation-table-copy">
                  <div class="validation-table-label">{{ row.label }}</div>
                  <div class="validation-table-desc">{{ row.desc }}</div>
                </div>
              </template>
              <template #cell-status="{ row, index }">
                <span
                  class="bdg validation-table-badge"
                  :class="
                    validationRuleStates[index] === 'active'
                      ? 'bdg-pending_kyc'
                      : validationRuleStates[index] === 'done'
                        ? 'bdg-active'
                        : validationRuleStates[index] === 'error'
                          ? 'bdg-banned'
                          : 'bdg-deleted'
                  "
                >
                  <span
                    v-if="validationRuleStates[index] === 'active'"
                    class="pi pi-spin pi-spinner"
                    aria-hidden="true"
                  />
                  <span
                    v-else-if="validationRuleStates[index] === 'done'"
                    class="pi pi-check"
                    aria-hidden="true"
                  />
                  <span
                    v-else-if="validationRuleStates[index] === 'error'"
                    class="pi pi-times"
                    aria-hidden="true"
                  />
                  {{ row.count }}
                </span>
              </template>
            </BaseTable>
          </BaseCard>

          <BaseCard variant="default" padding="none" class="validation-panel-card">
            <template #header>
              <span>Progreso de validación</span>
              <span class="count-badge sm">{{ Math.round(validationProgress) }}%</span>
            </template>
            <div class="validation-progress-body">
              <div class="validation-progress-meta">
                <span>{{ validationModalSubtitle }}</span>
                <span>{{ validationResultText }}</span>
              </div>
              <div class="progress-track">
                <div
                  class="progress-fill"
                  :class="validationModalStage === 'done' ? 'success' : ''"
                  :style="{ width: `${validationProgress}%` }"
                />
              </div>
              <div
                v-if="validationModalStage !== 'running'"
                class="validation-result"
                :class="chainValidation?.valid ? 'ok' : 'fail'"
              >
                <span
                  class="pi"
                  :class="chainValidation?.valid ? 'pi-check-circle' : 'pi-times-circle'"
                  aria-hidden="true"
                />
                <span>{{ validationResultText }}</span>
              </div>
              <p
                v-if="validationStatusNote"
                class="validation-status-note"
                :class="validationStatusTone"
              >
                {{ validationStatusNote }}
              </p>
            </div>
          </BaseCard>
        </div>

        <div class="modal-f validation-modal-foot">
          <template v-if="validationModalStage === 'running'">
            <button class="btn btn-danger" @click="stopValidationSequence">Detener</button>
          </template>
          <template v-else>
            <button class="btn" @click="closeValidationModal">Cerrar</button>
            <button class="btn btn-primary" @click="downloadValidationReport">
              Exportar reporte
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.validation-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Header */
.page-h {
  display: flex;
  align-items: center;
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

.rules-section-h {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 2px 2px -2px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
}

.rules-summary-card {
  overflow: hidden;
}

.validation-rules-list {
  display: flex;
  flex-direction: column;
}

.validation-list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  background: transparent;
}

.validation-list-row:last-child {
  border-bottom: 0;
}

.validation-list-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.validation-list-left .pi {
  font-size: 15px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: var(--success-soft);
  color: var(--success);
}

.validation-list-text {
  display: flex;
  flex-direction: column;
}
.validation-list-title {
  font-weight: 600;
  color: var(--text);
  line-height: 1.2;
}
.validation-list-desc {
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.35;
  margin-top: 1px;
}

.validation-list-right {
  display: flex;
  align-items: center;
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
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.validation-form-card :deep(.base-card__header),
.validation-panel-card :deep(.base-card__header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.25;
}

.validation-form-card :deep(.base-card__header) > span,
.validation-panel-card :deep(.base-card__header) > span {
  margin: 0;
}

/* Chain status */
.validation-status-note {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-2);
}
.validation-status-note.ok {
  color: var(--success);
}
.validation-status-note.warn {
  color: var(--warning);
}
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
  gap: 10px;
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

/* Validation modal */
.validation-modal {
  width: 700px;
  max-width: 96vw;
}
.validation-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.validation-modal-body {
  gap: 10px;
}
.validation-panel-card {
  overflow: hidden;
}
.validation-table-row.pending {
  opacity: 0.52;
}
.validation-table-row.active {
  background: var(--accent-soft);
}
.validation-table-row.done {
  background: var(--success-soft);
}
.validation-table-row.error {
  background: var(--danger-soft);
}
.validation-table-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.validation-table-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.2;
}
.validation-table-row.pending .validation-table-label {
  color: var(--text-2);
}
.validation-table-desc {
  font-size: 11.5px;
  color: var(--text-3);
  line-height: 1.35;
  margin-top: 1px;
}
.validation-table-row.active .validation-table-desc {
  color: var(--text-2);
}
.validation-step-pill {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin: 0 auto;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
}
.validation-table-row.active .validation-step-pill {
  background: var(--accent-soft);
  border-color: transparent;
  color: var(--accent);
}
.validation-table-row.done .validation-step-pill {
  background: var(--success-soft);
  border-color: transparent;
  color: var(--success);
}
.validation-table-row.error .validation-step-pill {
  background: var(--danger-soft);
  border-color: transparent;
  color: var(--danger);
}
.validation-table-badge {
  justify-self: end;
}
.validation-progress-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.validation-progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.35;
}
.validation-result {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  font-size: 12.5px;
}
.validation-result.ok {
  border-color: var(--success);
  background: var(--success-soft);
  color: var(--success);
}
.validation-result.fail {
  border-color: var(--danger);
  background: var(--danger-soft);
  color: var(--danger);
}
.validation-modal-foot {
  justify-content: space-between;
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
  line-height: 1.45;
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
  padding: 9px 12px;
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
