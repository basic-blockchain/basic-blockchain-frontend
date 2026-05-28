# Guía de integración

Cómo llevar este diseño a tu repo de **`basic-blockchain-frontend`** (Vue.js) trabajando con **Claude Code** en VS Code, sin reescribir el backend.

---

## TL;DR

1. **No reescribís el backend.** Los endpoints de `basic-blockchain-simulator` se mantienen. Sólo cambia el frontend.
2. **No reescribís de cero.** Migrás módulo por módulo, manteniendo `v1` operativa.
3. **Sistema de diseño como dependencia.** Extraés tokens (colores, espaciado, tipografía) a un archivo CSS reutilizable y los aplicás progresivamente.
4. **Claude Code es el copiloto de migración.** Le pasás esta carpeta como referencia visual y le pedís componentes Vue uno a uno.

---

## 1 · Mapeo de archivos (este diseño → tu repo Vue)

Esta carpeta es React/JSX/CDN — un prototipo de alta fidelidad, no la implementación final. Para llevarlo a Vue.js, cada componente o pantalla se traduce a un archivo `.vue` en tu repo.

| Aquí (React/JSX) | En tu repo (Vue 3 + Composition API) |
|---|---|
| `styles.css` + `platform-styles.css` + `tweaks.css` | `src/assets/design-system.css` (tokens + base) |
| `icons.jsx` | `src/components/icons/` (un `.vue` por icono) o un wrapper de `lucide-vue-next` |
| `chrome.jsx` (Sidebar, TopBar) | `src/layouts/AdminLayout.vue` + `Sidebar.vue` + `TopBar.vue` |
| `admin-screens.jsx` (Dashboard, Treasury) | `src/views/admin/DashboardView.vue`, `TreasuryView.vue` |
| `chain-screens.jsx` (Chain, Mempool, Nodes…) | `src/views/blockchain/ChainView.vue`, etc. |
| `flows.jsx` + `flows-extra.jsx` + `flows-mining.jsx` | `src/components/flows/*.vue` (modales con stepper) |
| `Users.html` (módulo embebido) | `src/views/admin/UsersView.vue` con `UserDrawer.vue` |
| Mobile screens | `src/views/mobile/*.vue` (rutas separadas o responsive) |

> **No hace falta migrar todo.** Empezá por 1-2 vistas críticas y mantené el resto en v1 hasta que tengas presupuesto.

---

## 2 · Orden de migración recomendado

Empezá por las vistas con **mayor impacto visible al usuario final** y la menor superficie de backend:

1. **Login / Registro** — sólo cambia el form (1 endpoint), gana mucha credibilidad.
2. **Dashboard (admin)** — agrupa métricas que ya devuelve el backend.
3. **Users + Wallets** — son las tablas donde más tiempo pasan los admins.
4. **Chain · Mempool · Nodes** — primitivos blockchain con UX rica.
5. **Treasury (mint con aprobación dual)** — nuevo flujo de seguridad.
6. **P2P · Exchange · Compliance** — sólo si están en roadmap. Pueden quedar como mockups visibles a stakeholders mientras se construye backend.

Cada paso es un PR independiente que mantiene la app funcionando.

---

## 3 · Extracción del design system

### 3.1 · Tokens CSS

Copiá las custom properties de `styles.css` (las que están dentro de `:root`) a un archivo en tu repo:

```css
/* src/assets/design-system.css */
:root {
  --bg: #faf9f6;
  --surface: #ffffff;
  --surface-2: #f5f4f0;
  --border: #e6e3db;
  --text: #1a1917;
  --text-2: #5d5b54;
  --accent: #2456e6;
  --success: #1f7a3a;
  --danger: #ad2820;
  --warning: #a8590b;
  --radius: 6px;
  --radius-lg: 10px;
  --shadow-sm: 0 1px 2px rgba(20,18,12,0.04);
  --font-sans: 'Geist', 'Söhne', 'Helvetica Neue', sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;
  /* …el resto */
}
```

Importalo en `main.ts`:

```ts
import './assets/design-system.css'
```

A partir de ahí, cualquier `.vue` puede usar `var(--accent)`, `var(--surface)`, etc. **Esto solo ya cambia el 60% del look del producto** sin tocar componentes.

### 3.2 · Componentes base

Los más reutilizables. Crealos primero, antes que las pantallas:

- `BaseButton.vue` (props: `variant` = `primary | secondary | danger | ghost`, `size`)
- `BaseBadge.vue` (props: `status` = `active | frozen | banned | pending_kyc`)
- `BaseAvatar.vue` (genera color desde el nombre, igual que `helpers.jsx`)
- `BaseCard.vue` (wrapper con border-radius + shadow)
- `BaseTable.vue` (header sticky, hover state, paginación)
- `BaseModal.vue` (scrim + animación de entrada)
- `Stepper.vue` (de `flows.jsx`, para los flujos multi-step)
- `AddrChip.vue`, `AssetPill.vue`, `FakeQR.vue` → `RealQR.vue` (con `qrcode.vue`)

---

## 4 · Trabajando con Claude Code en VS Code

### 4.1 · Setup mínimo

1. Instalá la extensión de Claude Code.
2. Abrí tu carpeta `basic-blockchain-frontend/` en VS Code.
3. **Importante:** abrí esta carpeta (`simulator`) también como segundo workspace (`File → Add Folder to Workspace…`). Así Claude Code puede leer el prototipo como referencia.

### 4.2 · Prompts útiles

Para iniciar una migración de pantalla, pasale un prompt como este:

> Migrá la vista `DashboardView.vue` para que use el diseño de `simulator/admin-screens.jsx` → función `AdminDashboard`. Conservá los endpoints y el store de Pinia actuales. Convertí los iconos inline a `lucide-vue-next`. Usá los tokens CSS de `src/assets/design-system.css`. No introduzcas Tailwind ni nuevas dependencias.

Para componentes reutilizables:

> Implementá `BaseTable.vue` siguiendo el patrón de `.tbl` en `simulator/styles.css`: header sticky con `background: var(--surface-2)`, hover en filas, `row-actions` columna al final. Props: `columns`, `rows`, `loading`, `empty`. Slots: `cell-<key>` para render custom por celda.

Para flujos:

> Crea `TreasuryApprovalModal.vue` siguiendo el `TreasuryApprovalFlow` de `simulator/flows.jsx`. 5 steps. El POST de la operación va a `/admin/mint` y queda en estado `pending_approval` hasta que un segundo admin firme con `/admin/mint/:id/approve`. Conservá el `Stepper` y los chips de firmantes.

### 4.3 · Reglas de oro

- **Pasale los archivos del prototipo como contexto** (`@simulator/admin-screens.jsx`, `@simulator/styles.css`), no descripciones textuales.
- **Pedile UN componente o UNA vista por turno.** No "migrá todo el panel".
- **Pedí TypeScript explícito** si tu repo lo usa. Si no, pedí JSDoc.
- **Revisá los diffs.** Claude Code no sabe qué store de Pinia tenés ni qué composables ya existen; corregilo en el primer turno.
- **Tests de regresión visual:** después de cada migración, comparar screenshots con `Versions.html` lado a lado.

---

## 5 · Mapeo de endpoints

Asumiendo nombres comunes de `basic-blockchain-simulator`. Ajustá según tus rutas reales.

| Pantalla del diseño | Endpoint backend | Notas |
|---|---|---|
| **Login** | `POST /auth/login` | JWT en cookie httpOnly o header `Authorization` |
| **Dashboard** | `GET /chain/stats` + `GET /mempool` + `GET /users/stats` | Componer en el frontend |
| **Chain (lista)** | `GET /chain` | Devuelve array de bloques |
| **Chain (detalle)** | `GET /chain/block/:height` | Incluye txs del bloque |
| **Mempool** | `GET /mempool` + `GET /transactions` | Pending + history |
| **Nodes** | `GET /nodes` + `POST /nodes/register` + `POST /nodes/resolve` | Sin cambios respecto a v1 |
| **Mine block** | `POST /mine` | El PoW se hace server-side; el cliente sólo solicita |
| **Validation** | `GET /chain/validate` | Devuelve `{valid: bool, errors: []}` |
| **Health** | `GET /health` + `GET /metrics` | Métricas técnicas |
| **Users** | `GET /users` + `GET /users/:id` + `PATCH /users/:id` | `softdelete` con `DELETE /users/:id` |
| **Wallets** | `GET /wallets` + `POST /wallets/:id/freeze` | Filtros por user/status |
| **Currencies** | `GET /currencies` + `POST /currencies` | Mismo que v1 |
| **Exchange Rates** | `GET /rates` + `POST /rates/sync` + `POST /rates/manual` | Sync de Binance |
| **Treasury** | endpoints nuevos (ver §6) | |

---

## 6 · Endpoints nuevos sugeridos

Estos son los que tu backend no tendría todavía y la v2 introduce. Definilos como contratos antes de implementar el frontend:

```python
# basic-blockchain-simulator/api/treasury.py

@bp.route('/treasury/wallets', methods=['GET'])
def list_corporate_wallets():
    """Wallets corporativas con saldo + ratio cobertura."""
    pass

@bp.route('/treasury/distribute', methods=['POST'])
@require_role('admin')
def distribute():
    """
    Body: { source_wallet_id, recipient_user_ids[], amount_per_wallet, currency }
    Crea una operación en estado 'pending_approval'.
    Requiere segunda firma vía /treasury/distribute/:id/approve
    """
    pass

@bp.route('/treasury/distribute/<int:op_id>/approve', methods=['POST'])
@require_role('admin')
def approve_distribution(op_id):
    """Si el operation.requested_by != current_user → ejecuta. Si no, 403."""
    pass

@bp.route('/audit', methods=['GET'])
def audit_log():
    """
    Query params: actor, category, date_from, date_to
    Devuelve eventos firmados (HMAC) e inmutables.
    """
    pass
```

---

## 7 · Roles y permisos (alinear con tu backend)

Tu backend actual usa **ADMIN / OPERATOR / VIEWER**. El diseño usa esos mismos nombres (corregido en esta iteración — antes decía USER en algunos lugares).

| Rol | Puede ver | Puede hacer |
|---|---|---|
| **ADMIN** | Todo | Tesorería, mint, eliminar usuarios, configuración, mine block |
| **OPERATOR** | Casi todo · sin tesorería ni configuración avanzada | KYC review, congelar wallets, banear, resolver disputas |
| **VIEWER** | Sus wallets, P2P, exchange | Operar como usuario final, P2P, exchange, KYC |

En Vue + Pinia, eso queda como:

```ts
// src/stores/auth.ts
export const useAuth = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const role = computed(() => user.value?.role)
  const can = (action: string) => {
    if (role.value === 'ADMIN') return true
    if (role.value === 'OPERATOR') return !['mint', 'delete-user', 'settings.advanced'].includes(action)
    return ['view-portfolio', 'send', 'p2p', 'exchange'].includes(action)
  }
  return { user, role, can }
})
```

Y en el router:

```ts
{ path: '/admin/treasury', component: TreasuryView, meta: { requires: 'ADMIN' } }
```

---

## 8 · Lo que NO recomiendo

- ❌ **Migrar todo en un sprint.** Es la mejor manera de freezar features durante 2 meses.
- ❌ **Cambiar la API por estética.** Si un endpoint devuelve `previous_hash` no le pidas que devuelva `prevHash` solo para que matchee con el diseño — adaptá en frontend.
- ❌ **Reemplazar el dark theme actual.** La v3 terminal sigue siendo dark; muchos operadores la van a preferir. Es un toggle, no un descarte.
- ❌ **Componentes "framework" pesados.** El diseño usa CSS puro + tokens. No metas Vuetify/Element/Quasar — pierden el carácter del system.

---

## 9 · Cómo trabajar con esta carpeta como referencia

Esta carpeta tiene **3 entradas** según para qué la necesites:

| Archivo | Para qué sirve |
|---|---|
| **`Versions.html`** | Comparar v1 / v2 / v3 lado a lado. Llevar a stakeholders. |
| **`App.html`** | Prototipo clickeable con role switcher. Para probar flujos. |
| **`Platform.html`** | Design canvas con todas las pantallas. Para discutir layout sin distracción. |
| **`Users.html`** | Módulo de usuarios standalone (lo primero que se construyó). |

Y los `.jsx` que importás como contexto cuando le pedís a Claude Code que migre algo.

---

## 10 · Próximos pasos concretos

1. **Esta semana:** copiar tokens CSS a tu repo + implementar `BaseButton`, `BaseBadge`, `BaseCard`. Sin migrar pantallas. Mide solo el cambio de tokens.
2. **Semana siguiente:** migrar `LoginView.vue` y `DashboardView.vue`.
3. **Sprint siguiente:** migrar Users + Wallets (las dos vistas más usadas).
4. **Después:** Chain, Mempool, Nodes con sus detalles enriquecidos.
5. **Cuando esté listo el backend:** Treasury con aprobación dual, Compliance, P2P, Exchange.

---

## Preguntas / dudas

Si querés que armemos juntos:

- Un PR de ejemplo con la primera migración (login)
- El archivo `design-system.css` completo y validado
- Tipos TypeScript para los modelos (`User`, `Wallet`, `Block`, `Transaction`)
- Un set de fixtures `*.mock.ts` para desarrollo sin backend

Decímelo y lo construyo en la próxima vuelta.
