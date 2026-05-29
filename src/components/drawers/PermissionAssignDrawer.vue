<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BaseDrawer from '@/components/atoms/BaseDrawer.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import UserChip from '@/components/atoms/UserChip.vue'
import {
  PERM_CATEGORIES, ROLE_PRESETS,
  type StaffUser, type StaffRole,
} from '@/composables/usePermissions'

const props = defineProps<{
  open: boolean
  user: StaffUser
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: [{ userId: string; perms: string[] }]
}>()

const activePerms = ref<Set<string>>(new Set(props.user.perms))
const reason = ref('')

watch(
  () => props.user,
  (u) => {
    activePerms.value = new Set(u.perms)
    reason.value = ''
  },
)

function has(key: string): boolean {
  return activePerms.value.has(key)
}

function toggle(key: string) {
  const next = new Set(activePerms.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  activePerms.value = next
}

function applyPreset(role: StaffRole) {
  activePerms.value = new Set(ROLE_PRESETS[role])
}

function clearAll() {
  activePerms.value = new Set()
}

const diff = computed(() => {
  const before = new Set(props.user.perms)
  const granted = [...activePerms.value].filter((p) => !before.has(p))
  const revoked = [...before].filter((p) => !activePerms.value.has(p))
  return { granted, revoked }
})

const hasChanges = computed(() => diff.value.granted.length > 0 || diff.value.revoked.length > 0)

const willBeCustom = computed(() => {
  const preset = ROLE_PRESETS[props.user.role]
  const next = activePerms.value
  if (next.size !== preset.length) return true
  return preset.some((p) => !next.has(p))
})

function close() {
  emit('update:open', false)
}

function save() {
  emit('saved', { userId: props.user.id, perms: [...activePerms.value] })
  close()
}

// Role badge colors
function roleBg(role: StaffRole): string {
  if (role === 'ADMIN') return '#ede9fe'
  if (role === 'OPERATOR') return '#cffafe'
  return 'var(--surface-2)'
}
function roleColor(role: StaffRole): string {
  if (role === 'ADMIN') return '#5b21b6'
  if (role === 'OPERATOR') return '#155e75'
  return 'var(--text-2)'
}

function categoryEnabledCount(cat: typeof PERM_CATEGORIES[number]): number {
  return cat.perms.filter(([k]) => has(k)).length
}
</script>

<template>
  <BaseDrawer
    :open="open"
    :width="720"
    @update:open="emit('update:open', $event)"
  >
    <template #header>
      <div class="dh-top">
        <span class="dh-id">{{ user.id }}</span>
        <span
          class="dh-role"
          :style="{ background: roleBg(user.role), color: roleColor(user.role) }"
        >{{ user.role }}</span>
        <button class="dh-close" aria-label="Cerrar" @click="close">
          <i class="pi pi-times" />
        </button>
      </div>
      <div class="dh-user">
        <UserChip :name="user.name" :role="user.email" size="md" />
        <div class="dh-meta">
          <span>{{ activePerms.size }} permisos activos</span>
          <template v-if="hasChanges">
            <span class="dot" />
            <span class="dh-dirty">+{{ diff.granted.length }} / −{{ diff.revoked.length }} sin guardar</span>
          </template>
        </div>
      </div>
    </template>

    <!-- Preset buttons -->
    <div class="section-row">
      <span class="section-label">Presets rápidos</span>
      <div class="preset-btns">
        <BaseButton size="sm" @click="applyPreset('ADMIN')">Aplicar ADMIN completo</BaseButton>
        <BaseButton size="sm" @click="applyPreset('OPERATOR')">Aplicar OPERATOR</BaseButton>
        <BaseButton size="sm" @click="clearAll">Limpiar todos</BaseButton>
      </div>
    </div>

    <!-- Permission categories -->
    <div
      v-for="cat in PERM_CATEGORIES"
      :key="cat.id"
      class="cat-block"
    >
      <div class="cat-header">
        <span class="cat-dot" :style="{ background: cat.color }" />
        <span class="cat-label">{{ cat.label }}</span>
        <span class="cat-desc">· {{ cat.desc }}</span>
        <span
          class="cat-count"
          :class="{
            'cat-count--full': categoryEnabledCount(cat) === cat.perms.length,
            'cat-count--partial': categoryEnabledCount(cat) > 0 && categoryEnabledCount(cat) < cat.perms.length,
          }"
        >{{ categoryEnabledCount(cat) }}/{{ cat.perms.length }}</span>
      </div>
      <div class="cat-card">
        <div
          v-for="([key, label, desc], i) in cat.perms"
          :key="key"
          class="perm-row"
          :class="{ 'perm-row--last': i === cat.perms.length - 1 }"
        >
          <div class="perm-info">
            <div class="perm-top">
              <span class="perm-label">{{ label }}</span>
              <span class="perm-key">{{ key }}</span>
            </div>
            <div class="perm-desc">{{ desc }}</div>
          </div>
          <label class="toggle-wrap">
            <input
              type="checkbox"
              class="toggle-input"
              :checked="has(key)"
              @change="toggle(key)"
            />
            <span class="toggle-track" />
          </label>
        </div>
      </div>
    </div>

    <!-- Diff summary (only when there are unsaved changes) -->
    <template v-if="hasChanges">
      <div class="section-row" style="margin-top: 20px">
        <span class="section-label">Cambios a aplicar</span>
      </div>
      <div class="diff-card">
        <div
          v-for="p in diff.granted"
          :key="'g' + p"
          class="diff-line diff-line--grant"
        >+ {{ p }}</div>
        <div
          v-for="p in diff.revoked"
          :key="'r' + p"
          class="diff-line diff-line--revoke"
        >− {{ p }}</div>
      </div>

      <div class="fld">
        <label class="fld-label">Motivo del cambio (requerido)</label>
        <textarea
          v-model="reason"
          class="fld-textarea"
          placeholder="Queda registrado en el log de auditoría…"
          rows="3"
        />
      </div>

      <div v-if="willBeCustom" class="info-box">
        <i class="pi pi-info-circle" />
        <span>Este usuario va a quedar con un set <strong>personalizado</strong> distinto del preset de su rol.</span>
      </div>
    </template>

    <template #footer>
      <BaseButton @click="close">Cancelar</BaseButton>
      <BaseButton
        variant="primary"
        :disabled="!hasChanges || !reason.trim()"
        @click="save"
      >
        Guardar cambios{{ hasChanges ? ` (${diff.granted.length + diff.revoked.length})` : '' }}
      </BaseButton>
    </template>
  </BaseDrawer>
</template>

<style scoped>
/* Drawer header */
.dh-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dh-id {
  font: 11px/1 var(--font-mono);
  color: var(--text-3);
  flex: 1;
}
.dh-role {
  display: inline-block;
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  font: 600 10.5px/1 var(--font-mono);
}
.dh-close {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  border-radius: var(--radius);
  color: var(--text-3);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}
.dh-close:hover {
  background: var(--hover);
  color: var(--text);
}
.dh-user {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}
.dh-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-2);
}
.dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--border-strong);
  flex-shrink: 0;
}
.dh-dirty {
  color: var(--warning);
  font-weight: 500;
}

/* Sections */
.section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}
.section-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.preset-btns {
  display: flex;
  gap: 6px;
}

/* Category block */
.cat-block {
  margin-top: 16px;
}
.cat-header {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
}
.cat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.cat-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.cat-desc {
  font-size: 11.5px;
  color: var(--text-3);
  flex: 1;
}
.cat-count {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  color: var(--text-3);
}
.cat-count--full {
  background: var(--success-soft);
  color: var(--success);
}
.cat-count--partial {
  background: var(--warning-soft);
  color: var(--warning);
}
.cat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.perm-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}
.perm-row--last {
  border-bottom: 0;
}
.perm-info {
  flex: 1;
}
.perm-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}
.perm-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}
.perm-key {
  font: 10.5px/1 var(--font-mono);
  color: var(--text-3);
}
.perm-desc {
  font-size: 11.5px;
  color: var(--text-3);
}

/* Toggle */
.toggle-wrap {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}
.toggle-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-track {
  display: block;
  width: 34px;
  height: 20px;
  border-radius: 10px;
  background: var(--border-strong);
  transition: background var(--duration-fast) var(--ease-out);
  position: relative;
}
.toggle-track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform var(--duration-fast) var(--ease-out);
}
.toggle-input:checked + .toggle-track {
  background: var(--success);
}
.toggle-input:checked + .toggle-track::after {
  transform: translateX(14px);
}
.toggle-input:focus-visible + .toggle-track {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Diff */
.diff-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 14px;
  margin-bottom: 12px;
}
.diff-line {
  font: 11.5px/1.8 var(--font-mono);
}
.diff-line--grant {
  color: var(--success);
}
.diff-line--revoke {
  color: var(--danger);
}

/* Reason field */
.fld {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.fld-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
}
.fld-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  font: 12px/1.5 var(--font-sans);
  color: var(--text);
  background: var(--surface);
  resize: vertical;
  min-height: 56px;
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-out);
}
.fld-textarea:focus {
  border-color: var(--accent);
}
.fld-textarea::placeholder {
  color: var(--text-3);
}

/* Info box */
.info-box {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 10px;
  padding: 10px 12px;
  background: var(--info-soft);
  border-radius: var(--radius);
  font-size: 12px;
  color: var(--info);
  line-height: 1.5;
}
.info-box i {
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 13px;
}
</style>
