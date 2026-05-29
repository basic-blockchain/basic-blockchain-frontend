<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import {
  approveKycDocument,
  getPendingKycReviews,
  promoteKycLevel,
  rejectKycDocument,
  type KycDocumentKey,
  type KycDocumentRecord,
  type PendingKycReview,
} from '@/api/kyc'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'

const toast = useToast()
const reviews = ref<PendingKycReview[]>([])
const loading = ref(false)
const busyUser = ref<string | null>(null)
const rejectingDoc = ref<{ userId: string; key: KycDocumentKey } | null>(null)
const rejectReason = ref('')

// Required documents per target level, mirroring REQUIRED_DOCS_FOR on
// the backend. Used to highlight which docs the operator still has to
// approve before /promote will succeed.
const REQUIRED_FOR: Record<string, KycDocumentKey[]> = {
  L1: ['dni', 'selfie'],
  L2: ['dni', 'selfie', 'address'],
  L3: ['dni', 'selfie', 'address', 'funds'],
}

const DOC_LABEL: Record<KycDocumentKey, string> = {
  dni: 'DNI',
  selfie: 'Selfie',
  address: 'Domicilio',
  funds: 'Fondos',
}

type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

function docTone(status: string | undefined): BadgeTone {
  if (status === 'verified') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'pending_review') return 'warning'
  return 'neutral'
}

async function load() {
  loading.value = true
  try {
    const res = await getPendingKycReviews()
    reviews.value = res.users
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'Error al cargar revisiones',
      detail: e instanceof Error ? e.message : String(e),
      life: 4000,
    })
  } finally {
    loading.value = false
  }
}

function documentFor(review: PendingKycReview, key: KycDocumentKey): KycDocumentRecord | undefined {
  return review.documents.find((d) => d.key === key)
}

function isRequired(review: PendingKycReview, key: KycDocumentKey): boolean {
  return (REQUIRED_FOR[review.pending_review] ?? []).includes(key)
}

function allRequiredVerified(review: PendingKycReview): boolean {
  const required = REQUIRED_FOR[review.pending_review] ?? []
  return required.every((k) => documentFor(review, k)?.status === 'verified')
}

const totalPending = computed(() => reviews.value.length)
const readyToPromote = computed(() => reviews.value.filter(allRequiredVerified).length)
const oldestSubmission = computed(() => {
  const ts = reviews.value[0]?.submitted_at
  return ts ?? '—'
})

async function approve(userId: string, key: KycDocumentKey) {
  busyUser.value = userId
  try {
    await approveKycDocument(userId, key)
    toast.add({
      severity: 'success',
      summary: 'Documento aprobado',
      detail: `${DOC_LABEL[key]} → verified`,
      life: 3000,
    })
    await load()
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'Error al aprobar',
      detail: e instanceof Error ? e.message : String(e),
      life: 4000,
    })
  } finally {
    busyUser.value = null
  }
}

function openReject(userId: string, key: KycDocumentKey) {
  rejectingDoc.value = { userId, key }
  rejectReason.value = ''
}

function cancelReject() {
  rejectingDoc.value = null
  rejectReason.value = ''
}

async function confirmReject() {
  if (!rejectingDoc.value) return
  const reason = rejectReason.value.trim()
  if (!reason) {
    toast.add({
      severity: 'warn',
      summary: 'Motivo requerido',
      detail: 'Indica el motivo del rechazo.',
      life: 3000,
    })
    return
  }
  const { userId, key } = rejectingDoc.value
  busyUser.value = userId
  try {
    await rejectKycDocument(userId, key, reason)
    toast.add({
      severity: 'info',
      summary: 'Documento rechazado',
      detail: `${DOC_LABEL[key]} → rejected · revisión abortada`,
      life: 3500,
    })
    rejectingDoc.value = null
    rejectReason.value = ''
    await load()
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'Error al rechazar',
      detail: e instanceof Error ? e.message : String(e),
      life: 4000,
    })
  } finally {
    busyUser.value = null
  }
}

async function promote(review: PendingKycReview) {
  busyUser.value = review.user_id
  try {
    const res = await promoteKycLevel(review.user_id)
    toast.add({
      severity: 'success',
      summary: 'Usuario promocionado',
      detail: `${review.username}: ${res.from_level} → ${res.to_level}`,
      life: 3500,
    })
    await load()
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'Error al promocionar',
      detail: e instanceof Error ? e.message : String(e),
      life: 4500,
    })
  } finally {
    busyUser.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="kyc-admin-view">
    <div class="page-h">
      <div>
        <h1>Revisión KYC</h1>
        <p>
          Cola de usuarios con revisión KYC pendiente. Aprueba cada documento y luego promociona el
          nivel.
        </p>
      </div>
      <div class="page-h-actions">
        <BaseButton variant="ghost" size="sm" :loading="loading" @click="load">
          <template #leading>
            <span class="pi pi-refresh" :class="{ 'pi-spin': loading }" aria-hidden="true" />
          </template>
          Actualizar
        </BaseButton>
      </div>
    </div>

    <div class="bigstat-row">
      <BaseCard variant="bigstat">
        <template #header>
          <span>Pendientes</span>
        </template>
        {{ totalPending }}
        <template #footer> usuarios en cola </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Listos para promover</span>
        </template>
        <span :class="{ 'kpi-success': readyToPromote > 0 }">{{ readyToPromote }}</span>
        <template #footer> todos sus documentos verificados </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Más antigua</span>
        </template>
        <span class="mono ts-vl">{{ oldestSubmission }}</span>
        <template #footer> submitted_at FIFO </template>
      </BaseCard>
    </div>

    <BaseCard v-if="loading" class="loading-row">
      <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando cola…
    </BaseCard>

    <BaseCard v-else-if="reviews.length === 0" class="empty-card">
      <span class="pi pi-check-circle" aria-hidden="true" />
      <div>
        <div class="empty-title">Cola vacía</div>
        <div class="empty-sub">Ningún usuario tiene una revisión KYC pendiente.</div>
      </div>
    </BaseCard>

    <div v-else class="review-list">
      <BaseCard
        v-for="review in reviews"
        :key="review.user_id"
        class="review-card"
        :class="{ 'is-busy': busyUser === review.user_id }"
      >
        <header class="review-h">
          <div class="review-title">
            <div class="review-name">
              {{ review.display_name || review.username }}
            </div>
            <div class="review-sub">
              <span class="mono">@{{ review.username }}</span>
              ·
              <span class="mono">{{ review.user_id }}</span>
            </div>
          </div>
          <div class="review-meta">
            <BaseBadge variant="soft" tone="neutral">
              {{ review.kyc_level }}
            </BaseBadge>
            <span class="pi pi-arrow-right level-arrow" aria-hidden="true" />
            <BaseBadge variant="soft" tone="info">
              {{ review.pending_review }}
            </BaseBadge>
          </div>
          <div class="review-ts mono">
            {{ review.submitted_at }}
          </div>
        </header>

        <div class="doc-grid">
          <div
            v-for="key in ['dni', 'selfie', 'address', 'funds'] as KycDocumentKey[]"
            :key="key"
            class="doc-card"
            :class="[
              `doc-${documentFor(review, key)?.status ?? 'missing'}`,
              { 'doc-required': isRequired(review, key) },
            ]"
          >
            <div class="doc-h">
              <div class="doc-label">
                {{ DOC_LABEL[key] }}
                <span v-if="isRequired(review, key)" class="doc-required-tag">requerido</span>
              </div>
              <BaseBadge :tone="docTone(documentFor(review, key)?.status)">
                {{ documentFor(review, key)?.status ?? 'missing' }}
              </BaseBadge>
            </div>
            <div v-if="documentFor(review, key)?.uploaded_at" class="doc-detail mono">
              ⬆ {{ documentFor(review, key)?.uploaded_at }}
            </div>
            <div v-if="documentFor(review, key)?.reviewed_at" class="doc-detail mono">
              ✓ {{ documentFor(review, key)?.reviewed_at }}
            </div>
            <div v-if="documentFor(review, key)?.reject_reason" class="doc-reason">
              {{ documentFor(review, key)?.reject_reason }}
            </div>

            <div class="doc-actions">
              <BaseButton
                v-if="documentFor(review, key) && documentFor(review, key)?.status !== 'verified'"
                variant="primary"
                size="sm"
                :disabled="busyUser === review.user_id"
                @click="approve(review.user_id, key)"
              >
                Aprobar
              </BaseButton>
              <BaseButton
                v-if="documentFor(review, key) && documentFor(review, key)?.status !== 'rejected'"
                variant="danger"
                size="sm"
                :disabled="busyUser === review.user_id"
                @click="openReject(review.user_id, key)"
              >
                Rechazar
              </BaseButton>
            </div>

            <div
              v-if="
                rejectingDoc && rejectingDoc.userId === review.user_id && rejectingDoc.key === key
              "
              class="reject-form"
            >
              <textarea
                v-model="rejectReason"
                placeholder="Motivo del rechazo (visible para el usuario)…"
                rows="2"
              />
              <div class="reject-actions">
                <BaseButton size="sm" variant="ghost" @click="cancelReject"> Cancelar </BaseButton>
                <BaseButton
                  size="sm"
                  variant="danger"
                  :disabled="busyUser === review.user_id"
                  @click="confirmReject"
                >
                  Confirmar rechazo
                </BaseButton>
              </div>
              <p class="reject-hint">
                Rechazar cualquier documento aborta la revisión completa: se limpiará
                <code>kyc_pending_review</code> y el usuario podrá volver a subir.
              </p>
            </div>
          </div>
        </div>

        <footer class="review-f">
          <div class="review-hint">
            <span v-if="allRequiredVerified(review)" class="hint-ok">
              <span class="pi pi-check" aria-hidden="true" /> Todos los documentos requeridos
              verificados.
            </span>
            <span v-else class="hint-warn">
              <span class="pi pi-clock" aria-hidden="true" /> Faltan documentos por verificar para
              promover a {{ review.pending_review }}.
            </span>
          </div>
          <BaseButton
            variant="primary"
            :disabled="!allRequiredVerified(review) || busyUser === review.user_id"
            @click="promote(review)"
          >
            Promover a {{ review.pending_review }}
          </BaseButton>
        </footer>
      </BaseCard>
    </div>
  </div>
</template>

<style scoped>
.kyc-admin-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

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
.page-h-actions {
  display: flex;
  gap: 8px;
}

.bigstat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.ts-vl {
  font-size: 13px;
  font-weight: 500;
}
.kpi-success {
  color: var(--success);
}
.loading-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
  font-size: 13px;
}
.empty-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
}
.empty-card .pi {
  font-size: 22px;
  color: var(--success);
}
.empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.empty-sub {
  font-size: 12.5px;
  color: var(--text-3);
  margin-top: 2px;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.review-card {
  transition: opacity 0.15s ease;
}
.review-card.is-busy {
  opacity: 0.7;
  pointer-events: none;
}

.review-h {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 16px;
  align-items: center;
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--border);
}
.review-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.review-sub {
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 2px;
}
.review-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}
.level-arrow {
  font-size: 10px;
  color: var(--text-3);
}
.review-ts {
  font-size: 11px;
  color: var(--text-3);
}

.doc-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.doc-card {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.doc-card.doc-required {
  border-color: var(--border);
}
.doc-card.doc-verified {
  border-color: rgba(34, 197, 94, 0.45);
  background: rgba(34, 197, 94, 0.06);
}
.doc-card.doc-rejected {
  border-color: rgba(239, 68, 68, 0.45);
  background: rgba(239, 68, 68, 0.06);
}
.doc-card.doc-pending_review {
  border-color: rgba(234, 179, 8, 0.45);
  background: rgba(234, 179, 8, 0.06);
}

.doc-h {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.doc-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
}
.doc-required-tag {
  font-size: 9.5px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--text-3);
  text-transform: uppercase;
  padding: 1px 5px;
  border: 1px solid var(--border);
  border-radius: 99px;
}
.doc-detail {
  font-size: 10.5px;
  color: var(--text-3);
}
.doc-reason {
  font-size: 11.5px;
  color: var(--danger);
  padding: 4px 6px;
  background: rgba(239, 68, 68, 0.08);
  border-radius: var(--radius);
}

.doc-actions {
  display: flex;
  gap: 6px;
  margin-top: 2px;
  flex-wrap: wrap;
}

.reject-form {
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px dashed var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.reject-form textarea {
  width: 100%;
  resize: vertical;
  font: inherit;
  font-size: 12.5px;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
}
.reject-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.reject-hint {
  font-size: 10.5px;
  color: var(--text-3);
  margin: 0;
}
.reject-hint code {
  font-family: var(--font-mono);
  font-size: 10.5px;
}

.review-f {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.review-hint {
  font-size: 12px;
}
.hint-ok {
  color: var(--success);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.hint-warn {
  color: var(--warning);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.mono {
  font-family: var(--font-mono);
}

@media (max-width: 900px) {
  .bigstat-row {
    grid-template-columns: 1fr 1fr;
  }
  .doc-grid {
    grid-template-columns: 1fr 1fr;
  }
  .review-h {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .bigstat-row {
    grid-template-columns: 1fr;
  }
  .doc-grid {
    grid-template-columns: 1fr;
  }
  .review-f {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
