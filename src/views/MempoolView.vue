<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useMempoolStore } from '@/stores/mempool'
import MempoolTable from '@/components/organisms/MempoolTable.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import { validateTransaction } from '@/domain/transaction'
import { useToast } from '@/composables/useToast'

const store = useMempoolStore()
const toast = useToast()
const submitting = ref(false)

const form = reactive<{ sender: string; receiver: string; amount: number | null }>({
  sender: '',
  receiver: '',
  amount: null,
})

onMounted(() => store.fetchPending())

async function submit() {
  const errors = validateTransaction({
    sender: form.sender,
    receiver: form.receiver,
    amount: form.amount ?? undefined,
  })
  if (errors.length > 0) {
    toast.error('Invalid transaction', errors.map((e) => e.message).join(', '))
    return
  }
  submitting.value = true
  try {
    await store.submitTransaction({
      sender: form.sender.trim(),
      receiver: form.receiver.trim(),
      amount: form.amount!,
    })
    toast.success('Transaction added to mempool')
    form.sender = ''
    form.receiver = ''
    form.amount = null
  } catch (e) {
    toast.error('Submit failed', e instanceof Error ? e.message : 'Unknown')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mempool-view">
    <h1>Mempool <span class="count">{{ store.count }}</span></h1>
    <section class="panel">
      <h2>Add Transaction</h2>
      <form class="tx-form" @submit.prevent="submit">
        <InputText v-model="form.sender" placeholder="Sender" />
        <InputText v-model="form.receiver" placeholder="Receiver" />
        <InputNumber
          v-model="form.amount"
          placeholder="Amount"
          :min-fraction-digits="0"
          :max-fraction-digits="8"
        />
        <Button type="submit" label="Submit" :loading="submitting" icon="pi pi-send" />
      </form>
    </section>
    <section class="panel">
      <h2>Pending Transactions</h2>
      <MempoolTable :transactions="store.transactions" />
    </section>
  </div>
</template>

<style scoped>
.mempool-view { display: flex; flex-direction: column; gap: 1.5rem; }
.panel {
  background: #fff;
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.tx-form { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.count {
  background: #3b82f6;
  color: #fff;
  font-size: 0.8rem;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  margin-left: 0.5rem;
  vertical-align: middle;
}
</style>
