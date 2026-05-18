<script setup lang="ts">
// AuthLayout — two-column shell for the auth views (Login, Register,
// Activate). Layout-only: brand mark + foot are baked-in defaults
// (overridable via slots); the left form panel and the dark right
// panel are both required slots. The three view files supply their
// own form + right-panel content; the chrome and form-internal CSS
// (.fld / .auth-divider / etc.) live here as the single source of
// truth.
</script>

<template>
  <div class="auth-wrap">
    <div class="auth-left">
      <slot name="brand">
        <div class="auth-brand">
          <div class="auth-mark">◆</div>
          <span>Cadena</span>
        </div>
      </slot>

      <slot />

      <footer class="auth-foot">
        <slot name="foot">
          <span>© 2026 Cadena</span>
        </slot>
      </footer>
    </div>

    <div class="auth-right">
      <slot name="right-panel" />
    </div>
  </div>
</template>

<style scoped>
.auth-wrap {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 420px 1fr;
  font-family: var(--font-sans);
}

.auth-left {
  display: flex;
  flex-direction: column;
  padding: 32px 40px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  min-height: 100vh;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: 700;
  font-size: 15px;
  color: var(--text);
  margin-bottom: 36px;
}

.auth-mark {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: linear-gradient(135deg, #1a1917 0%, #3a3833 100%);
  display: grid;
  place-items: center;
  color: #faf9f6;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.auth-foot {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.auth-right {
  background: linear-gradient(160deg, #1a1917 0%, #2c2a25 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 48px 40px;
  color: #fff;
  min-height: 100vh;
}

@media (max-width: 760px) {
  .auth-wrap {
    grid-template-columns: 1fr;
  }
  .auth-right {
    display: none;
  }
  .auth-left {
    padding: 24px 20px;
  }
}

/* Form internals lifted from the three v1 views. Targeted via :slotted()
 * so they reach into the consumer-provided form markup without forcing
 * each view to redefine the same rules. */
:slotted(.auth-form) {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 340px;
  width: 100%;
}

:slotted(.auth-form h1) {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--text);
  margin: 0 0 6px;
}

:slotted(.auth-sub) {
  font-size: 13.5px;
  color: var(--text-2);
  margin: 0 0 24px;
  line-height: 1.5;
}

:slotted(.fld) {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

:slotted(.fld label) {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
}

:slotted(.opt) {
  font-weight: 400;
  color: var(--text-3);
}

:slotted(.fld input),
:slotted(.fld select) {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
  font-family: var(--font-sans);
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-out);
}

:slotted(.fld input:focus),
:slotted(.fld select:focus) {
  border-color: var(--accent);
}

:slotted(.auth-divider) {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  color: var(--text-3);
  font-size: 11.5px;
  margin: 16px 0;
}

:slotted(.auth-divider-line) {
  flex: 1;
  height: 1px;
  background: var(--border);
  display: block;
}

:slotted(.auth-switch) {
  margin-top: 18px;
  font-size: 12.5px;
  color: var(--text-2);
  text-align: center;
}

:slotted(.auth-switch a) {
  color: var(--accent-text);
  font-weight: 500;
  text-decoration: none;
}

/* Right-panel typography baked into the layout — every view's right
 * panel uses the same label + quote recipe (only the strings differ).
 * The :slotted selector keeps this shared without per-view CSS. */
:slotted(.auth-right-content) {
  /* container — consumers add their own structure */
}

:slotted(.auth-right-label) {
  font-size: 11.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 12px;
}

:slotted(.auth-quote) {
  font-size: 18px;
  font-weight: 400;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.88);
  max-width: 480px;
  margin: 0;
}

:slotted(.role-card) {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  padding: 18px 20px;
}

:slotted(.role-card h4) {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 14px;
}

.auth-foot a {
  color: inherit;
  text-decoration: none;
}
.auth-foot a:hover {
  color: var(--text-2);
}
</style>
