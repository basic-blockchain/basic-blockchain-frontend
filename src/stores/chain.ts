import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getChain, validateChain } from '@/api/chain'
import type { Block } from '@/domain/block'

export const useChainStore = defineStore('chain', () => {
  const blocks = ref<Block[]>([])
  const isValid = ref<boolean | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const length = computed(() => blocks.value.length)
  const latestBlock = computed(() => blocks.value.at(-1) ?? null)
  const recentBlocks = computed(() => [...blocks.value].reverse().slice(0, 10))

  async function fetchChain() {
    loading.value = true
    error.value = null
    try {
      const result = await getChain()
      blocks.value = result.chain
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch chain'
    } finally {
      loading.value = false
    }
  }

  async function fetchValidation() {
    const result = await validateChain()
    isValid.value = result.valid
    return result
  }

  function appendBlock(block: Block) {
    if (!blocks.value.find((b) => b.index === block.index)) {
      blocks.value.push(block)
    }
  }

  return {
    blocks,
    isValid,
    loading,
    error,
    length,
    latestBlock,
    recentBlocks,
    fetchChain,
    fetchValidation,
    appendBlock,
  }
})
