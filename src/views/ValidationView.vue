<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import { useChainStore } from '@/stores/chain'
import { useNodesStore } from '@/stores/nodes'
import { validateTransaction } from '@/domain/transaction'
import { useToast } from '@/composables/useToast'
import { useValidationHistoryStore } from '@/stores/validationHistory'

const chainStore = useChainStore()
const nodesStore = useNodesStore()
const toast = useToast()
const historyStore = useValidationHistoryStore()

const loadingChainValidation = ref(false)
const chainValidation = ref<{ valid: boolean; message: string } | null>(null)

const blockForm = reactive({ index: null as number | null })
const nodeForm = reactive({ url: '' })
const txForm = reactive({ sender: '', receiver: '', amount: null as number | null })

const selectedBlock = computed(() => {
  if (blockForm.index === null) return null
  return chainStore.blocks.find((b) => b.index === blockForm.index) ?? null
})

const blockNotFound = computed(
  () => blockForm.index !== null && selectedBlock.value === null,
)

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
  () => txForm.sender.trim() !== '' || txForm.receiver.trim() !== '' || txForm.amount !== null,
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

async function validateCurrentChain() {
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

function downloadHistory() {
  const blob = new Blob([historyStore.exportJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `validation-history-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  await Promise.all([chainStore.fetchChain(), nodesStore.fetchNodes()])
})
</script>

<template>
  <div class="validation-view">
    <div class="header-row">
      <h1>Validation Center</h1>
      <div class="header-actions">
        <Button
          label="Validate Chain"
          icon="pi pi-check-circle"
          :loading="loadingChainValidation"
          @click="validateCurrentChain"
        />
        <Button
          v-if="historyStore.total > 0"
          label="Export History"
          icon="pi pi-download"
          severity="secondary"
          @click="downloadHistory"
        />
      </div>
    </div>

    <section class="panel chain-panel">
      <h2>Chain Status</h2>
      <p class="muted">
        Backend endpoint: <strong>/valid</strong>
      </p>
      <div
        class="result"
        :class="chainValidation?.valid ? 'ok' : 'neutral'"
      >
        <span v-if="chainValidation">{{ chainValidation.message }}</span>
        <span v-else>Run validation to verify chain integrity.</span>
      </div>
    </section>

    <div class="validation-grid">
      <section class="panel">
        <h2>Block Validation</h2>
        <div class="form-row">
          <InputNumber
            v-model="blockForm.index"
            placeholder="Block index"
            :min="1"
          />
        </div>
        <div
          v-if="selectedBlock"
          class="result-list"
        >
          <div
            v-for="check in blockChecks"
            :key="check.label"
            class="result-item"
            :class="check.ok ? 'ok' : 'error'"
          >
            <i :class="check.ok ? 'pi pi-check-circle' : 'pi pi-times-circle'" />
            <span>{{ check.label }}</span>
          </div>
        </div>
        <div
          v-else-if="blockNotFound"
          class="result error-banner"
        >
          <i class="pi pi-exclamation-triangle" />
          Block #{{ blockForm.index }} does not exist in the current chain (height: {{ chainStore.length }}).
        </div>
        <p
          v-else
          class="muted"
        >
          Enter a block index (1–{{ chainStore.length || '?' }}) to inspect its integrity.
        </p>
      </section>

      <section class="panel">
        <h2>Node Validation</h2>
        <div class="form-row">
          <InputText
            v-model="nodeForm.url"
            placeholder="http://peer:5000"
          />
        </div>
        <div
          v-if="nodeChecks.length > 0"
          class="result-list"
        >
          <div
            v-for="check in nodeChecks"
            :key="check.label"
            class="result-item"
            :class="check.ok ? 'ok' : 'error'"
          >
            <i :class="check.ok ? 'pi pi-check-circle' : 'pi pi-times-circle'" />
            <span>{{ check.label }}</span>
          </div>
        </div>
        <p
          v-else
          class="muted"
        >
          Type a node URL to evaluate format and registration state.
        </p>
      </section>

      <section class="panel tx-panel">
        <h2>Transaction Validation</h2>
        <div class="form-grid">
          <InputText
            v-model="txForm.sender"
            placeholder="Sender"
          />
          <InputText
            v-model="txForm.receiver"
            placeholder="Receiver"
          />
          <InputNumber
            v-model="txForm.amount"
            placeholder="Amount"
            :min-fraction-digits="0"
            :max-fraction-digits="8"
          />
        </div>
        <div
          v-if="txHasInput"
          class="result-list"
        >
          <div
            v-for="check in txChecks"
            :key="check.label"
            class="result-item"
            :class="check.ok ? 'ok' : 'error'"
          >
            <i :class="check.ok ? 'pi pi-check-circle' : 'pi pi-times-circle'" />
            <span>{{ check.label }}</span>
          </div>
        </div>
        <p
          v-else
          class="muted"
        >
          Fill sender, receiver and amount to dry-run transaction rules.
        </p>
      </section>
    </div>

    <section
      v-if="historyStore.total > 0"
      class="panel history-panel"
    >
      <div class="history-header">
        <h2>Validation History <span class="count">{{ historyStore.total }}</span></h2>
      </div>
      <div class="history-list">
        <div
          v-for="ev in [...historyStore.events].reverse()"
          :key="ev.id"
          class="history-item"
          :class="ev.status"
        >
          <i
            class="pi history-icon"
            :class="{
              'pi-check-circle': ev.status === 'valid',
              'pi-times-circle': ev.status === 'invalid',
              'pi-exclamation-triangle': ev.status === 'error',
            }"
          />
          <div class="history-body">
            <span class="history-type">{{ ev.type }}</span>
            <span class="history-target">{{ ev.target }}</span>
            <span class="history-message">{{ ev.message }}</span>
          </div>
          <span class="history-time">{{ new Date(ev.timestamp).toLocaleTimeString() }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.validation-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.validation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.tx-panel {
  grid-column: 1 / -1;
}

.form-row,
.form-grid {
  margin-top: 0.75rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.result {
  margin-top: 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-sm);
  padding: 0.65rem 0.75rem;
  color: var(--text-body);
  background: var(--surface-soft);
}

.result.neutral {
  border-color: #3a3c61;
}

.result.ok {
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.12);
  color: #86efac;
}

.result.error-banner {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.result-list {
  margin-top: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.92rem;
  border: 1px solid var(--surface-border);
  background: var(--surface-soft);
  border-radius: var(--radius-sm);
  padding: 0.45rem 0.6rem;
}

.result-item.ok {
  border-color: rgba(34, 197, 94, 0.35);
  color: #86efac;
}

.result-item.error {
  border-color: rgba(239, 68, 68, 0.35);
  color: #fca5a5;
}

.muted {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.history-panel { margin-top: 0; }

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 320px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.88rem;
  padding: 0.45rem 0.65rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--surface-border);
  background: var(--surface-soft);
}

.history-item.valid { border-color: rgba(34, 197, 94, 0.3); }
.history-item.invalid { border-color: rgba(239, 68, 68, 0.3); }
.history-item.error { border-color: rgba(250, 204, 21, 0.3); }

.history-icon { font-size: 0.95rem; flex-shrink: 0; }
.history-item.valid .history-icon { color: #86efac; }
.history-item.invalid .history-icon { color: #fca5a5; }
.history-item.error .history-icon { color: #fde68a; }

.history-body {
  display: flex;
  gap: 0.5rem;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
}

.history-type {
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 0.75rem;
  padding: 0.1rem 0.4rem;
  border-radius: 6px;
  border: 1px solid rgba(180, 169, 230, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.history-target { color: var(--text-muted); }
.history-message { color: var(--text-body); }
.history-time { color: var(--text-muted); font-size: 0.8rem; margin-left: auto; flex-shrink: 0; }

.count {
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 0.8rem;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  margin-left: 0.4rem;
  border: 1px solid rgba(180, 169, 230, 0.32);
}

@media (max-width: 960px) {
  .validation-grid {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .header-actions {
    flex-wrap: wrap;
  }
}
</style>
