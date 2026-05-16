<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { AuthUser, KycLevel } from '@/stores/auth'
import {
  getKycStatus, uploadKycDocument, submitKycReview,
  type KycDocumentKey, type KycDocumentRecord, type KycDocumentStatus,
} from '@/api/kyc'

const props = defineProps<{ user: AuthUser | null; open: boolean }>()
const emit = defineEmits<{ close: [] }>()

type Tab = 'profile' | 'kyc'
const tab = ref<Tab>('profile')

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

function copyId() {
  if (props.user) navigator.clipboard?.writeText(props.user.user_id).catch(() => {})
}

const primaryRole = computed(() => {
  if (!props.user) return 'VIEWER'
  const order = ['ADMIN', 'STAFF', 'USER', 'VIEWER']
  return order.find((r) => props.user!.roles.includes(r)) ?? props.user.roles[0] ?? 'VIEWER'
})

const roleBadgeClass = computed(() => {
  switch (primaryRole.value) {
    case 'ADMIN': return 'bdg-banned'
    case 'STAFF': return 'bdg-info'
    default:      return 'bdg-active'
  }
})

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return iso
  }
}

const KYC_LEVELS = [
  { level: 'L0', name: 'Sin verificar', desc: 'Solo email confirmado. Límites operativos restringidos.' },
  { level: 'L1', name: 'Básica',        desc: 'DNI / Pasaporte verificado. Límite USD 1.000 mensuales.' },
  { level: 'L2', name: 'Intermedia',    desc: 'Selfie + domicilio. Límite USD 50.000 mensuales.' },
  { level: 'L3', name: 'Completa',      desc: 'Fuente de fondos verificada. Sin límites.' },
]

interface KycDocMeta { key: KycDocumentKey; label: string; minLevel: KycLevel }
const KYC_DOCS: KycDocMeta[] = [
  { key: 'dni',     label: 'DNI / Pasaporte',          minLevel: 'L1' },
  { key: 'selfie',  label: 'Selfie con documento',     minLevel: 'L1' },
  { key: 'address', label: 'Comprobante de domicilio', minLevel: 'L2' },
  { key: 'funds',   label: 'Fuente de fondos',         minLevel: 'L3' },
]

const LEVEL_ORDER: KycLevel[] = ['L0', 'L1', 'L2', 'L3']

// ── KYC state (Phase 6g) ────────────────────────────────────────────────────
// Source of truth is the backend (GET /me/kyc/status). Until it lands, we
// persist per-user state in localStorage so the user-facing flow works
// end-to-end locally. Backend-or-fallback is decided per call via try/catch.

const kycLevel = ref<KycLevel>('L0')
const documents = ref<Record<KycDocumentKey, KycDocumentRecord>>(emptyDocs())
const pendingReview = ref<KycLevel | null>(null)
const uploadingDoc = ref<KycDocumentKey | null>(null)
const submitting = ref(false)
const kycError = ref<string>('')

function emptyDocs(): Record<KycDocumentKey, KycDocumentRecord> {
  return {
    dni:     { key: 'dni',     status: 'missing' },
    selfie:  { key: 'selfie',  status: 'missing' },
    address: { key: 'address', status: 'missing' },
    funds:   { key: 'funds',   status: 'missing' },
  }
}

function storageKey(userId: string): string { return `kyc:state:${userId}` }

function loadLocal(userId: string) {
  const raw = localStorage.getItem(storageKey(userId))
  if (!raw) { documents.value = emptyDocs(); pendingReview.value = null; return }
  try {
    const parsed = JSON.parse(raw) as {
      documents?: Record<KycDocumentKey, KycDocumentRecord>
      pendingReview?: KycLevel | null
      level?: KycLevel
    }
    documents.value = { ...emptyDocs(), ...(parsed.documents ?? {}) }
    pendingReview.value = parsed.pendingReview ?? null
    if (parsed.level) kycLevel.value = parsed.level
  } catch {
    documents.value = emptyDocs()
    pendingReview.value = null
  }
}

function persistLocal() {
  if (!props.user) return
  localStorage.setItem(storageKey(props.user.user_id), JSON.stringify({
    documents: documents.value,
    pendingReview: pendingReview.value,
    level: kycLevel.value,
  }))
}

async function refreshKyc() {
  if (!props.user) return
  kycLevel.value = props.user.kyc_level ?? 'L0'
  loadLocal(props.user.user_id)
  try {
    const remote = await getKycStatus()
    kycLevel.value = remote.level
    const merged: Record<KycDocumentKey, KycDocumentRecord> = emptyDocs()
    for (const d of remote.documents) merged[d.key] = d
    documents.value = merged
    pendingReview.value = remote.pending_review ?? null
    persistLocal()
  } catch {
    /* backend not wired yet — local state already loaded above */
  }
}

watch(() => [props.open, props.user?.user_id], ([isOpen]) => {
  if (isOpen && tab.value === 'kyc') refreshKyc()
})

watch(tab, (t) => { if (t === 'kyc') refreshKyc() })

const fileInputs: Partial<Record<KycDocumentKey, HTMLInputElement | null>> = {}
function setFileRef(key: KycDocumentKey, el: unknown) {
  fileInputs[key] = (el as HTMLInputElement | null) ?? null
}
function triggerUpload(key: KycDocumentKey) { fileInputs[key]?.click() }

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function onFileSelected(key: KycDocumentKey, ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingDoc.value = key
  kycError.value = ''
  try {
    const data = await fileToBase64(file)
    let record: KycDocumentRecord
    try {
      record = await uploadKycDocument({
        key, filename: file.name, content_type: file.type, data,
      })
    } catch {
      record = { key, status: 'uploaded', uploaded_at: new Date().toISOString() }
    }
    documents.value = { ...documents.value, [key]: record }
    persistLocal()
  } catch (e: unknown) {
    kycError.value = e instanceof Error ? e.message : 'Error subiendo el documento.'
  } finally {
    uploadingDoc.value = null
    input.value = ''
  }
}

function docsNeededFor(level: KycLevel): KycDocMeta[] {
  const cap = LEVEL_ORDER.indexOf(level)
  return KYC_DOCS.filter((d) => LEVEL_ORDER.indexOf(d.minLevel) <= cap)
}

function nextLevel(level: KycLevel): KycLevel | null {
  const idx = LEVEL_ORDER.indexOf(level)
  return idx < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[idx + 1] : null
}

const target = computed<KycLevel | null>(() => nextLevel(kycLevel.value))

const canSubmitReview = computed(() => {
  if (!target.value || pendingReview.value) return false
  return docsNeededFor(target.value).every((d) =>
    ['uploaded', 'pending_review', 'verified'].includes(documents.value[d.key].status),
  )
})

async function onSubmitReview() {
  if (!target.value || !canSubmitReview.value) return
  submitting.value = true
  kycError.value = ''
  try {
    try {
      const remote = await submitKycReview(target.value)
      kycLevel.value = remote.level
      pendingReview.value = remote.pending_review ?? target.value
    } catch {
      pendingReview.value = target.value
      const updated = { ...documents.value }
      for (const d of docsNeededFor(target.value)) {
        if (updated[d.key].status === 'uploaded') {
          updated[d.key] = { ...updated[d.key], status: 'pending_review' }
        }
      }
      documents.value = updated
    }
    persistLocal()
  } finally {
    submitting.value = false
  }
}

const currentKyc = computed(
  () => KYC_LEVELS.find((l) => l.level === kycLevel.value) ?? KYC_LEVELS[0],
)

function statusBadge(s: KycDocumentStatus): { cls: string; label: string } {
  if (s === 'verified')       return { cls: 'bdg-active',       label: 'Verificado' }
  if (s === 'pending_review') return { cls: 'bdg-pending_kyc',  label: 'En revisión' }
  if (s === 'uploaded')       return { cls: 'bdg-info',         label: 'Subido' }
  if (s === 'rejected')       return { cls: 'bdg-banned',       label: 'Rechazado' }
  return { cls: 'bdg-deleted', label: 'Sin enviar' }
}
</script>

<template>
  <div class="scrim" :class="{ open }" @click="emit('close')" />
  <aside class="drawer" :class="{ open }" role="dialog" aria-modal="true" aria-label="Mi perfil">
    <template v-if="user">
      <!-- Header -->
      <div class="drawer-head">
        <div class="head-row">
          <div class="avatar" aria-hidden="true">{{ user.display_name.charAt(0).toUpperCase() }}</div>
          <div class="head-info">
            <div class="head-name">{{ user.display_name }}</div>
            <div class="head-sub">
              <span class="mono">@{{ user.username }}</span>
              <span class="bdg" :class="roleBadgeClass">{{ primaryRole }}</span>
              <span v-if="user.banned" class="bdg bdg-banned">Baneado</span>
            </div>
          </div>
          <button class="btn btn-icon btn-ghost" aria-label="Cerrar perfil" @click="emit('close')">
            <span class="pi pi-times" aria-hidden="true" />
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <nav class="drawer-tabs" aria-label="Secciones de perfil">
        <button class="drawer-tab" :class="{ active: tab === 'profile' }" @click="tab = 'profile'">
          Perfil
        </button>
        <button class="drawer-tab" :class="{ active: tab === 'kyc' }" @click="tab = 'kyc'">
          KYC <span class="tab-badge">{{ kycLevel }}</span>
        </button>
        <!-- doc upload hidden file inputs -->
        <input
          v-for="doc in KYC_DOCS"
          :key="`f-${doc.key}`"
          :ref="(el) => setFileRef(doc.key, el)"
          type="file"
          accept="image/*,application/pdf"
          style="display:none"
          @change="onFileSelected(doc.key, $event)"
        />
      </nav>

      <div class="drawer-body">

        <!-- Profile tab -->
        <template v-if="tab === 'profile'">
          <div class="section-h">Identidad</div>
          <div class="kv-panel">
            <div class="kv-row">
              <span class="kv-label">User ID</span>
              <span class="kv-val mono xs">
                {{ user.user_id }}
                <button class="copy-btn" aria-label="Copiar ID" @click="copyId">
                  <span class="pi pi-copy" aria-hidden="true" />
                </button>
              </span>
            </div>
            <div class="kv-row">
              <span class="kv-label">Usuario</span>
              <span class="kv-val mono">@{{ user.username }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-label">Nombre</span>
              <span class="kv-val">{{ user.display_name }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-label">Roles</span>
              <span class="kv-val roles-list">
                <span v-for="r in user.roles" :key="r" class="bdg bdg-info sm">{{ r }}</span>
              </span>
            </div>
            <div class="kv-row">
              <span class="kv-label">Miembro desde</span>
              <span class="kv-val">{{ formatDate(user.created_at) }}</span>
            </div>
            <div class="kv-row no-border">
              <span class="kv-label">Estado</span>
              <span class="kv-val">
                <span v-if="user.banned" class="bdg bdg-banned">Baneado</span>
                <span v-else class="bdg bdg-active">Activo</span>
              </span>
            </div>
          </div>

          <div class="section-h" style="margin-top: 18px;">Seguridad</div>
          <div class="kv-panel">
            <div class="kv-row no-border">
              <span class="kv-label">Contraseña</span>
              <span class="kv-val muted xs">
                Usa el flujo de activación para cambiar tu contraseña.
              </span>
            </div>
          </div>
        </template>

        <!-- KYC tab -->
        <template v-else-if="tab === 'kyc'">
          <div class="kyc-card">
            <div class="kyc-level-badge">{{ currentKyc.level }}</div>
            <div class="kyc-card-info">
              <div class="kyc-card-name">Nivel {{ currentKyc.level }} · {{ currentKyc.name }}</div>
              <div class="kyc-card-desc">{{ currentKyc.desc }}</div>
            </div>
          </div>

          <div v-if="pendingReview" class="kyc-banner pending">
            Revisión pendiente para nivel {{ pendingReview }}. Te avisaremos cuando se complete.
          </div>

          <div class="kyc-levels">
            <div
              v-for="lvl in KYC_LEVELS"
              :key="lvl.level"
              class="kyc-level-row"
              :class="{ current: lvl.level === kycLevel, past: lvl.level < kycLevel }"
            >
              <span class="kyc-level-dot" aria-hidden="true" />
              <div class="kyc-level-text">
                <span class="kyc-level-label">{{ lvl.level }}</span>
                <span class="kyc-level-name">{{ lvl.name }}</span>
              </div>
              <span v-if="lvl.level === kycLevel" class="bdg bdg-pending_kyc xs">Actual</span>
              <span v-else-if="lvl.level < kycLevel" class="bdg bdg-active xs">Completado</span>
            </div>
          </div>

          <div class="section-h" style="margin-top: 18px;">Documentos</div>
          <div class="kv-panel">
            <div
              v-for="(doc, i) in KYC_DOCS"
              :key="doc.key"
              class="kv-row doc-row"
              :class="{ 'no-border': i === KYC_DOCS.length - 1 }"
            >
              <div class="doc-meta">
                <span class="kv-label doc-label">{{ doc.label }}</span>
                <span class="doc-min">Requerido desde {{ doc.minLevel }}</span>
              </div>
              <span class="bdg xs" :class="statusBadge(documents[doc.key].status).cls">
                {{ statusBadge(documents[doc.key].status).label }}
              </span>
              <button
                class="btn btn-sm"
                :disabled="uploadingDoc !== null || pendingReview !== null"
                @click="triggerUpload(doc.key)"
              >
                <span v-if="uploadingDoc === doc.key" class="pi pi-spin pi-spinner" aria-hidden="true" />
                <template v-else-if="documents[doc.key].status === 'missing'">Subir</template>
                <template v-else>Reemplazar</template>
              </button>
            </div>
          </div>

          <div v-if="kycError" class="kyc-banner danger">{{ kycError }}</div>

          <div v-if="target" class="kyc-submit">
            <div class="kyc-submit-info">
              <div class="kyc-submit-title">Solicitar nivel {{ target }}</div>
              <div class="kyc-submit-desc">
                Subí los documentos requeridos y enviá tu solicitud a revisión.
              </div>
            </div>
            <button
              class="btn btn-primary"
              :disabled="!canSubmitReview || submitting"
              @click="onSubmitReview"
            >
              <span v-if="submitting" class="pi pi-spin pi-spinner" aria-hidden="true" />
              <template v-else>Enviar a revisión</template>
            </button>
          </div>
        </template>

      </div>
    </template>
  </aside>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  z-index: 199;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s;
}
.scrim.open { opacity: 1; pointer-events: all; }

.drawer {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  width: 400px;
  background: var(--surface);
  border-left: 1px solid var(--border);
  z-index: 200;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.drawer.open { transform: translateX(0); }

/* Header */
.drawer-head {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.head-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 60%, #000) 100%);
  color: #fff;
  font-weight: 700;
  font-size: 16px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.head-info { flex: 1; min-width: 0; }
.head-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.head-sub {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 3px;
  font-size: 12px;
  color: var(--text-2);
}

/* Tabs */
.drawer-tabs {
  display: flex;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.drawer-tab {
  padding: 10px 12px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-2);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  font-family: var(--font-sans);
}
.drawer-tab.active { color: var(--text); border-bottom-color: var(--accent); }
.drawer-tab:hover  { color: var(--text); }
.tab-badge {
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
  font-family: var(--font-mono);
}

/* Body */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}
.section-h {
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-2);
  margin: 0 0 8px;
}

/* KV panel */
.kv-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.kv-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 14px;
  border-bottom: 1px solid var(--border);
  font-size: 12.5px;
}
.kv-row.no-border { border-bottom: none; }
.kv-label {
  width: 130px;
  flex-shrink: 0;
  color: var(--text-2);
  font-size: 12px;
}
.kv-val {
  flex: 1;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.roles-list { gap: 4px; }
.mono { font-family: var(--font-mono); }
.xs { font-size: 11.5px; }
.muted { color: var(--text-3); }

.copy-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-3);
  padding: 2px;
  font-size: 12px;
  line-height: 1;
}
.copy-btn:hover { color: var(--text); }

/* KYC */
.kyc-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  margin-bottom: 14px;
}
.kyc-level-badge {
  width: 52px; height: 52px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--warning) 15%, var(--surface));
  color: var(--warning);
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.kyc-card-info { flex: 1; }
.kyc-card-name { font-weight: 600; font-size: 14px; color: var(--text); }
.kyc-card-desc { font-size: 12px; color: var(--text-2); margin-top: 3px; }

.kyc-levels {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 4px;
}
.kyc-level-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-bottom: 1px solid var(--border);
  font-size: 12.5px;
}
.kyc-level-row:last-child { border-bottom: none; }
.kyc-level-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--border-strong);
  flex-shrink: 0;
}
.kyc-level-row.current .kyc-level-dot { background: var(--warning); }
.kyc-level-row.past    .kyc-level-dot { background: var(--success); }

.kyc-level-text {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.kyc-level-label {
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-2);
  width: 24px;
}
.kyc-level-name { color: var(--text); }
.kyc-level-row.current .kyc-level-name { font-weight: 600; }

/* KYC documents + review */
.doc-row { gap: 10px; }
.doc-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.doc-label { width: auto; }
.doc-min {
  font-size: 11px;
  color: var(--text-3);
}
.kyc-banner {
  margin: 12px 0;
  padding: 10px 14px;
  border-radius: var(--radius);
  font-size: 12.5px;
}
.kyc-banner.pending {
  background: var(--info-soft, #eff6ff);
  color: var(--info, #1d4ed8);
  border: 1px solid color-mix(in srgb, var(--info, #1d4ed8) 30%, transparent);
}
.kyc-banner.danger {
  background: var(--danger-soft, #fef2f2);
  color: var(--danger);
  border: 1px solid color-mix(in srgb, var(--danger) 30%, transparent);
}
.kyc-submit {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface-2);
}
.kyc-submit-info { flex: 1; min-width: 0; }
.kyc-submit-title { font-weight: 600; font-size: 13px; }
.kyc-submit-desc { font-size: 11.5px; color: var(--text-2); margin-top: 3px; }

@media (max-width: 480px) {
  .drawer { width: 100%; }
}
</style>
