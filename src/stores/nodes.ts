import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getNodes, registerNodes, resolveConsensus } from '@/api/nodes'

export const useNodesStore = defineStore('nodes', () => {
  const peers = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const consensusReplaced = ref<boolean | null>(null)

  const total = computed(() => peers.value.length)

  async function fetchNodes() {
    loading.value = true
    try {
      const result = await getNodes()
      peers.value = result.nodes
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch nodes'
    } finally {
      loading.value = false
    }
  }

  async function register(urls: string[]) {
    const result = await registerNodes(urls)
    peers.value = result.nodes
  }

  async function resolve() {
    loading.value = true
    try {
      const result = await resolveConsensus()
      consensusReplaced.value = result.replaced
      return result
    } finally {
      loading.value = false
    }
  }

  return { peers, loading, error, total, consensusReplaced, fetchNodes, register, resolve }
})
