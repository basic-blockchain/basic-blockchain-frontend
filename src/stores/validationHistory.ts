import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ValidationEvent, ValidationType, ValidationStatus } from '@/domain/validation'

export const useValidationHistoryStore = defineStore('validationHistory', () => {
  const events = ref<ValidationEvent[]>([])

  const total = computed(() => events.value.length)
  const latest = computed(() => events.value.at(-1) ?? null)

  function record(
    type: ValidationType,
    status: ValidationStatus,
    target: string,
    message: string,
  ) {
    events.value.push({
      id: crypto.randomUUID(),
      type,
      status,
      target,
      message,
      timestamp: new Date().toISOString(),
    })
  }

  function clear() {
    events.value = []
  }

  function exportJson(): string {
    return JSON.stringify(events.value, null, 2)
  }

  return { events, total, latest, record, clear, exportJson }
})
