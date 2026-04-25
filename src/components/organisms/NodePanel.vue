<script setup lang="ts">
import { ref } from 'vue'
import { useNodesStore } from '@/stores/nodes'
import NodeBadge from '@/components/molecules/NodeBadge.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { useToast } from '@/composables/useToast'

const store = useNodesStore()
const newUrl = ref('')
const submitting = ref(false)
const resolving = ref(false)
const toast = useToast()

function validatePeerUrl(raw: string): string | null {
  const trimmed = raw.trim()
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return 'URL is not valid (e.g. http://localhost:5001)'
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'URL must use http:// or https://'
  }
  if (/^\d+$/.test(parsed.hostname)) {
    return `"${parsed.hostname}" looks like a bare port. Did you mean http://localhost:${parsed.hostname}?`
  }
  if (!parsed.hostname) {
    return 'URL must include a hostname (e.g. http://localhost:5001)'
  }
  return null
}

async function register() {
  const url = newUrl.value.trim()
  if (!url) return

  const validationError = validatePeerUrl(url)
  if (validationError) {
    toast.error('Invalid peer URL', validationError)
    return
  }

  submitting.value = true
  try {
    await store.register([url])
    toast.success('Node registered', url)
    newUrl.value = ''
  } catch (e) {
    toast.error('Register failed', e instanceof Error ? e.message : 'Unknown error')
  } finally {
    submitting.value = false
  }
}

async function resolve() {
  resolving.value = true
  try {
    const result = await store.resolve()
    if (result.replaced) {
      toast.success('Consensus resolved', result.message)
    } else {
      toast.info('Consensus resolved', result.message)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    const isTimeout = msg.toLowerCase().includes('timeout') || msg.includes('Network Error')
    toast.error(
      'Consensus failed',
      isTimeout
        ? 'One or more peer nodes are unreachable. Ensure all registered peers are running.'
        : msg,
    )
  } finally {
    resolving.value = false
  }
}
</script>

<template>
  <div class="node-panel">
    <h2>Peers <span class="count">{{ store.total }}</span></h2>

    <div class="peers">
      <NodeBadge v-for="peer in store.peers" :key="peer" :url="peer" online />
      <div v-if="store.peers.length === 0" class="empty">
        No peers registered. Add a running blockchain node below.
      </div>
    </div>

    <form class="form" @submit.prevent="register">
      <InputText v-model="newUrl" placeholder="http://localhost:5001" />
      <Button type="submit" label="Register" :loading="submitting" icon="pi pi-plus" />
    </form>

    <div class="resolve-row">
      <Button
        label="Resolve Consensus"
        icon="pi pi-sync"
        severity="secondary"
        :loading="resolving"
        :disabled="store.peers.length === 0"
        @click="resolve"
      />
      <span v-if="resolving" class="resolve-hint">Contacting peers…</span>
    </div>

    <p v-if="store.peers.length > 0" class="info-hint">
      Peers must be running blockchain nodes.
      Use <strong>http://localhost:PORT</strong> for local instances.
    </p>
  </div>
</template>

<style scoped>
.node-panel { display: flex; flex-direction: column; gap: 1rem; }

.count {
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 0.7rem;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  margin-left: 0.4rem;
  border: 1px solid rgba(180, 169, 230, 0.32);
}

.peers { display: flex; flex-wrap: wrap; gap: 0.5rem; }

.empty { color: var(--text-muted); font-size: 0.875rem; }

.form { display: flex; gap: 0.5rem; }
.form :deep(input) { flex: 1; }

.resolve-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.resolve-hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
}

.info-hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.5;
}
</style>
