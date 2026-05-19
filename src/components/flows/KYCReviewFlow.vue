<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/atoms/BaseButton.vue'

export interface KYCData {
  user: string
  country: string
  kind: string
  age: string
  risk: 'Crítico' | 'Alto' | 'Medio' | 'Bajo'
}

const props = defineProps<{ data: KYCData }>()
const emit = defineEmits<{ close: []; complete: [] }>()

const decision = ref<'approve' | 'reject' | 'request' | null>(null)
const note = ref('')
const submitted = ref(false)

function submit(d: 'approve' | 'reject' | 'request') {
  decision.value = d
  submitted.value = true
}

const riskColor = (r: string) =>
  r === 'Crítico'
    ? 'var(--danger)'
    : r === 'Alto'
      ? 'var(--warning)'
      : r === 'Bajo'
        ? 'var(--success)'
        : 'var(--info)'
const riskBg = (r: string) =>
  r === 'Crítico'
    ? 'var(--danger-soft)'
    : r === 'Alto'
      ? 'var(--warning-soft)'
      : r === 'Bajo'
        ? 'var(--success-soft)'
        : 'var(--info-soft)'

const checks = [
  { label: 'OCR coincide con DB', status: 'pass' },
  { label: 'Liveness selfie', status: 'pass' },
  { label: 'Match facial 94.2%', status: 'pass' },
  { label: 'Lista OFAC', status: 'pass' },
  { label: 'Lista PEP', status: 'pass' },
  { label: 'Riesgo geográfico', status: 'warn' },
  { label: 'Patrón de operación', status: 'pass' },
]

const lastName = props.data.user.split(' ').slice(-1)[0]?.toUpperCase() ?? ''
const firstName = props.data.user.split(' ')[0]?.toUpperCase() ?? ''
</script>

<template>
  <!-- Result screen -->
  <div v-if="submitted" class="modal-scrim" @click.self="emit('close')">
    <div class="modal" style="width: 420px">
      <div class="modal-b">
        <div style="text-align: center; padding: 20px 0">
          <div
            class="result-circle"
            :style="{
              background: decision === 'reject' ? 'var(--danger-soft)' : 'var(--success-soft)',
              color: decision === 'reject' ? 'var(--danger)' : 'var(--success)',
            }"
          >
            <span class="pi pi-check" style="font-size: 24px" />
          </div>
          <div style="font-size: 16px; font-weight: 600; margin-bottom: 4px">
            Caso
            {{
              decision === 'approve'
                ? 'aprobado'
                : decision === 'reject'
                  ? 'rechazado'
                  : 'enviado para reenvío'
            }}
          </div>
          <div class="muted" style="font-size: 12.5px">
            Resuelto en 1m 24s · siguiente caso disponible en cola.
          </div>
        </div>
      </div>
      <div class="modal-f">
        <BaseButton variant="ghost" @click="emit('close')">Cerrar</BaseButton>
        <BaseButton
          variant="primary"
          @click="
            emit('complete')
            emit('close')
          "
          >Siguiente caso</BaseButton
        >
      </div>
    </div>
  </div>

  <!-- Review screen -->
  <div v-else class="modal-scrim" @click.self="emit('close')">
    <div class="modal" style="width: 720px; max-height: 88vh">
      <div
        class="modal-h"
        style="
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding-bottom: 14px;
        "
      >
        <div style="flex: 1">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px">
            <div class="user-avatar">{{ data.user[0] }}</div>
            <div>
              <div style="font-size: 16px; font-weight: 600">
                {{ data.user }}
                <span style="font-size: 14px; font-weight: 400">{{ data.country }}</span>
              </div>
              <div class="muted" style="font-size: 12px">{{ data.kind }} · hace {{ data.age }}</div>
            </div>
          </div>
          <div style="display: flex; gap: 6px; align-items: center; font-size: 11.5px">
            <span
              class="bdg"
              :style="{ background: riskBg(data.risk), color: riskColor(data.risk), border: 0 }"
            >
              Riesgo {{ data.risk }}
            </span>
            <span class="muted">SLA en 3h 12m</span>
          </div>
        </div>
        <BaseButton class="btn-icon" variant="ghost" @click="emit('close')">
          <span class="pi pi-times" />
        </BaseButton>
      </div>

      <div class="modal-b" style="padding-top: 4px">
        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px">
          <!-- Left: ID document -->
          <div>
            <div class="section-label">Documento de identidad</div>
            <div class="id-card">
              <div style="font-size: 9px; font-weight: 500; letter-spacing: 0.1em; opacity: 0.7">
                REPÚBLICA ARGENTINA
              </div>
              <div style="font-size: 11px; font-weight: 600; margin-top: 2px">
                DOCUMENTO NACIONAL DE IDENTIDAD
              </div>
              <div style="display: flex; gap: 12px; margin-top: 14px">
                <div class="id-photo">FOTO</div>
                <div style="font-size: 10.5px; line-height: 1.7">
                  <div><span style="opacity: 0.6">Apellido</span></div>
                  <div style="font-weight: 600; font-size: 12px; margin-bottom: 4px">
                    {{ lastName }}
                  </div>
                  <div><span style="opacity: 0.6">Nombre</span></div>
                  <div style="font-weight: 600; font-size: 12px">{{ firstName }}</div>
                </div>
              </div>
              <div
                class="mono"
                style="
                  position: absolute;
                  bottom: 12px;
                  left: 16px;
                  font-size: 11px;
                  letter-spacing: 0.04em;
                "
              >
                34.281.749
              </div>
            </div>

            <div style="display: flex; gap: 6px; margin-top: 8px">
              <BaseButton
                v-for="label in ['Ver', 'Frente', 'Reverso', 'Selfie']"
                :key="label"
                variant="ghost"
                size="sm"
                style="flex: 1; justify-content: center"
              >
                <span v-if="label === 'Ver'" class="pi pi-eye" style="font-size: 11px" />
                {{ label }}
              </BaseButton>
            </div>
          </div>

          <!-- Right: auto checks + note -->
          <div>
            <div class="section-label">Verificación automática</div>
            <div class="flow-card" style="padding: 12px">
              <div
                v-for="(c, i) in checks"
                :key="c.label"
                class="check-row"
                :style="{
                  borderBottom: i < checks.length - 1 ? '1px solid var(--border)' : 'none',
                }"
              >
                <span style="font-size: 12px">{{ c.label }}</span>
                <span
                  class="bdg"
                  :class="c.status === 'pass' ? 'bdg-active' : 'bdg-pending_kyc'"
                  style="font-size: 10px"
                >
                  {{ c.status === 'pass' ? '✓ OK' : '⚠ Atención' }}
                </span>
              </div>
            </div>

            <div style="margin-top: 14px">
              <label
                style="
                  font-size: 11px;
                  font-weight: 500;
                  color: var(--text-2);
                  display: block;
                  margin-bottom: 5px;
                "
                >Nota interna</label
              >
              <textarea
                v-model="note"
                placeholder="Visible para el equipo de compliance…"
                class="note-area"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="modal-f" style="flex-wrap: wrap; gap: 6px">
        <BaseButton variant="danger" @click="submit('reject')">
          <span class="pi pi-times" style="font-size: 12px" />
          Rechazar
        </BaseButton>
        <BaseButton variant="ghost" @click="submit('request')">
          <span class="pi pi-refresh" style="font-size: 12px" />
          Pedir reenvío
        </BaseButton>
        <div style="flex: 1" />
        <BaseButton variant="ghost" @click="emit('close')">Cancelar</BaseButton>
        <BaseButton variant="primary" @click="submit('approve')">
          <span class="pi pi-check" style="font-size: 12px" />
          Aprobar
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}
.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-text);
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}
.id-card {
  aspect-ratio: 1.6;
  background: linear-gradient(135deg, #1a3a6e 0%, #2456e6 100%);
  border-radius: 8px;
  padding: 16px;
  color: #fff;
  position: relative;
  overflow: hidden;
}
.id-photo {
  width: 60px;
  height: 80px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 4px;
  display: grid;
  place-items: center;
  font-size: 9px;
  opacity: 0.6;
  flex-shrink: 0;
}
.check-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}
.note-area {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  font-size: 12px;
  font-family: var(--font-sans);
  background: var(--surface-2);
  color: var(--text);
  min-height: 70px;
  resize: vertical;
  outline: none;
}
.note-area:focus {
  border-color: var(--accent);
}
.result-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin: 0 auto 14px;
}
</style>
