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
const toast = useToast()

async function register() {
  if (!newUrl.value.trim()) return
  submitting.value = true
  try {
    await store.register([newUrl.value.trim()])
    toast.success('Node registered', newUrl.value)
    newUrl.value = ''
  } catch (e) {
    toast.error('Register failed', e instanceof Error ? e.message : 'Unknown error')
  } finally {
    submitting.value = false
  }
}

async function resolve() {
  try {
    const result = await store.resolve()
    toast.info('Consensus resolved', result.message)
  } catch (e) {
    toast.error('Consensus failed', e instanceof Error ? e.message : 'Unknown error')
  }
}
</script>

<template>
  <div class="node-panel">
    <h2>Peers <span class="count">{{ store.total }}</span></h2>
    <div class="peers">
      <NodeBadge v-for="peer in store.peers" :key="peer" :url="peer" online />
      <div v-if="store.peers.length === 0" class="empty">No peers registered.</div>
    </div>
    <form class="form" @submit.prevent="register">
      <InputText v-model="newUrl" placeholder="http://peer:5000" />
      <Button type="submit" label="Register" :loading="submitting" icon="pi pi-plus" />
    </form>
    <Button
      label="Resolve Consensus"
      icon="pi pi-sync"
      severity="secondary"
      :loading="store.loading"
      @click="resolve"
    />
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
.empty { color: var(--text-muted); }
.form { display: flex; gap: 0.5rem; }
.form :deep(input) { flex: 1; }
</style>
