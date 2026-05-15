<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const activeSection = ref<string>('general')

const sections = [
  { key: 'general',     label: 'General' },
  { key: 'fees',        label: 'Comisiones' },
  { key: 'assets',      label: 'Activos y redes' },
  { key: 'limits',      label: 'Límites operativos' },
  { key: 'roles',       label: 'Roles y permisos' },
  { key: 'security',    label: 'Seguridad' },
  { key: 'notifications', label: 'Notificaciones' },
  { key: 'api',         label: 'Integraciones · API' },
  { key: 'brand',       label: 'Marca y dominio' },
  { key: 'data',        label: 'Datos · Backup' },
]

const generalForm = ref({
  name: 'Cadena',
  legalName: 'Cadena S.A.',
  taxId: '',
  supportEmail: '',
  domain: '',
  timezone: 'America/Argentina/Buenos_Aires',
})

const operationToggles = ref([
  { key: 'registrations', label: 'Aceptar nuevos registros', value: true, desc: 'Cierra el formulario público de signup si se desactiva.' },
  { key: 'p2p',           label: 'Operaciones P2P',          value: true, desc: 'Permite ofertas y matches entre usuarios.' },
  { key: 'exchange',      label: 'Exchange',                  value: true, desc: 'Habilita órdenes de mercado y límite.' },
  { key: 'onchain_wd',    label: 'Retiros on-chain',          value: true, desc: 'Si se desactiva, sólo movimientos internos.' },
  { key: 'maintenance',   label: 'Modo mantenimiento',        value: false, desc: 'Sólo administradores pueden operar.' },
])

function saveGeneral() {
  toast.add({ severity: 'success', summary: 'Ajustes guardados', detail: 'La configuración general fue actualizada', life: 3000 })
}

function toggleChanged(toggle: typeof operationToggles.value[0]) {
  const state = toggle.value ? 'activado' : 'desactivado'
  toast.add({ severity: 'info', summary: toggle.label, detail: `${toggle.label} ${state}`, life: 2500 })
}
</script>

<template>
  <div class="settings-view">
    <div class="page-h">
      <div>
        <h1>Ajustes</h1>
        <p>Configuración global de la plataforma.</p>
      </div>
    </div>

    <div class="settings-layout">
      <!-- Sidebar nav -->
      <nav class="settings-nav" aria-label="Secciones de ajustes">
        <button
          v-for="s in sections"
          :key="s.key"
          class="settings-nav-item"
          :class="{ active: activeSection === s.key }"
          @click="activeSection = s.key"
        >
          {{ s.label }}
        </button>
      </nav>

      <!-- Content area -->
      <div class="settings-content">

        <!-- General -->
        <template v-if="activeSection === 'general'">
          <section class="panel">
            <div class="panel-h">
              <div>
                <h3>Información general</h3>
                <p>Nombre, dominios y entorno operativo.</p>
              </div>
              <button class="btn btn-primary" @click="saveGeneral">Guardar cambios</button>
            </div>

            <div class="panel-body">
              <div class="field">
                <label class="field-label" for="name">Nombre comercial</label>
                <input id="name" v-model="generalForm.name" class="field-input">
              </div>
              <div class="field-row">
                <div class="field">
                  <label class="field-label" for="legal-name">Razón social</label>
                  <input id="legal-name" v-model="generalForm.legalName" class="field-input">
                </div>
                <div class="field">
                  <label class="field-label" for="tax-id">CUIT / Tax ID</label>
                  <input id="tax-id" v-model="generalForm.taxId" class="field-input mono" placeholder="30-XXXXXXXX-3">
                </div>
              </div>
              <div class="field-row">
                <div class="field">
                  <label class="field-label" for="support-email">Email de soporte</label>
                  <input id="support-email" v-model="generalForm.supportEmail" class="field-input" placeholder="soporte@cadena.app" type="email">
                </div>
                <div class="field">
                  <label class="field-label" for="domain">Dominio</label>
                  <input id="domain" v-model="generalForm.domain" class="field-input" placeholder="app.cadena.app">
                </div>
              </div>
              <div class="field">
                <label class="field-label" for="timezone">Zona horaria</label>
                <select id="timezone" v-model="generalForm.timezone" class="field-input">
                  <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires (ART, UTC-3)</option>
                  <option value="America/Mexico_City">America/Mexico_City (CST, UTC-6)</option>
                  <option value="America/Bogota">America/Bogota (COT, UTC-5)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-h">
              <h3>Modo de operación</h3>
            </div>
            <div
              v-for="(toggle, i) in operationToggles"
              :key="toggle.key"
              class="toggle-row"
              :class="{ 'no-border': i === operationToggles.length - 1 }"
            >
              <div class="toggle-info">
                <div class="toggle-label">{{ toggle.label }}</div>
                <div class="toggle-desc">{{ toggle.desc }}</div>
              </div>
              <label class="toggle-switch" :for="`toggle-${toggle.key}`">
                <input
                  :id="`toggle-${toggle.key}`"
                  v-model="toggle.value"
                  type="checkbox"
                  class="toggle-input"
                  @change="toggleChanged(toggle)"
                >
                <span class="toggle-track">
                  <span class="toggle-thumb" />
                </span>
              </label>
            </div>
          </section>
        </template>

        <!-- Placeholder for other sections -->
        <template v-else>
          <section class="panel placeholder">
            <div class="placeholder-icon">
              <span class="pi pi-cog" aria-hidden="true" />
            </div>
            <p class="placeholder-label">{{ sections.find((s) => s.key === activeSection)?.label }}</p>
            <p class="placeholder-sub">Esta sección estará disponible próximamente.</p>
          </section>
        </template>

      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-view { display: flex; flex-direction: column; gap: 18px; }

.page-h { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
.page-h h1 { font-size: 22px; font-weight: 600; letter-spacing: -0.015em; margin: 0 0 2px; color: var(--text); }
.page-h p  { margin: 0; font-size: 13px; color: var(--text-2); }

/* Layout */
.settings-layout {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 16px;
  align-items: start;
}

/* Left nav */
.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 8px;
}

.settings-nav-item {
  display: block;
  padding: 7px 10px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  font-family: var(--font-sans);
  width: 100%;
}
.settings-nav-item:hover { background: var(--hover); color: var(--text); }
.settings-nav-item.active { background: var(--surface-2); color: var(--text); font-weight: 600; }

.settings-content { display: flex; flex-direction: column; gap: 14px; }

/* Phase 5 panel (overrides global .panel padding for header + body layout) */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0;
  overflow: hidden;
  box-shadow: none;
}

.panel-h {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
  gap: 12px;
}
.panel-h h3 { font-size: 14px; font-weight: 600; margin: 0; color: var(--text); }
.panel-h p  { font-size: 12px; color: var(--text-2); margin: 4px 0 0; }

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px 18px;
}

/* Form fields */
.field { display: flex; flex-direction: column; gap: 4px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-label { font-size: 12px; font-weight: 500; color: var(--text-2); }
.field-input {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
  font-family: var(--font-sans);
  outline: none;
  transition: border-color 0.12s;
  width: 100%;
  box-sizing: border-box;
}
.field-input:focus { border-color: var(--accent); }
.field-input.mono { font-family: var(--font-mono); }

/* Toggle rows */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 20px;
  border-bottom: 1px solid var(--border);
  gap: 16px;
}
.toggle-row.no-border { border-bottom: none; }

.toggle-info { flex: 1; }
.toggle-label { font-weight: 500; font-size: 13px; color: var(--text); }
.toggle-desc  { font-size: 11.5px; color: var(--text-2); margin-top: 2px; }

.toggle-switch { display: inline-flex; align-items: center; cursor: pointer; flex-shrink: 0; }
.toggle-input { position: absolute; opacity: 0; width: 0; height: 0; }
.toggle-track {
  position: relative;
  width: 36px; height: 20px;
  background: var(--border-strong);
  border-radius: 10px;
  transition: background 0.18s;
  display: block;
}
.toggle-input:checked + .toggle-track { background: var(--accent); }
.toggle-thumb {
  position: absolute;
  top: 2px; left: 2px;
  width: 16px; height: 16px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  transition: left 0.18s;
}
.toggle-input:checked + .toggle-track .toggle-thumb { left: 18px; }

/* Placeholder */
.placeholder {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; min-height: 200px; gap: 8px; padding: 40px;
}
.placeholder-icon .pi { font-size: 28px; color: var(--text-3); }
.placeholder-label { font-size: 15px; font-weight: 600; color: var(--text); margin: 0; }
.placeholder-sub   { font-size: 13px; color: var(--text-3); margin: 0; text-align: center; }

@media (max-width: 760px) {
  .settings-layout { grid-template-columns: 1fr; }
  .settings-nav { flex-direction: row; flex-wrap: wrap; }
  .field-row { grid-template-columns: 1fr; }
}
</style>
