# Cadena · Simulator
### Documentación técnica + resumen ejecutivo

---

## 1 · Resumen ejecutivo

**Cadena Simulator** es un prototipo interactivo de alta fidelidad para una plataforma blockchain operada por una empresa (custodial), con monedas nativas, wallets de usuarios, mercado P2P, exchange interno y tesorería corporativa. Reemplaza un admin actualmente en Vue.js que cubre el modelo de datos pero carece de UX coherente, flujos críticos y mobile.

**Lo que resuelve**
- Refactor visual completo de la plataforma (paleta, tipografía, jerarquía, densidad)
- Diseño de los flujos críticos que hoy se hacen por Postman o no existen (asignar permisos, aprobación dual de tesorería, KYC review, resolución de disputas, creación de wallets con frase semilla)
- Tres roles claramente diferenciados — **ADMIN / OPERATOR / VIEWER** — con vistas y permisos específicos
- Versión móvil completa para el cliente final (5 pantallas + sheets de overlay)
- Sistema de diseño tweakable: la misma estructura admite 4 *moods*, 3 sistemas tipográficos y 3 tratamientos de superficie (12 combinaciones · de "Stripe sober" a "Bloomberg terminal")

**Cobertura funcional**
22 vistas principales + 21 flujos modales interactivos + 1 versión móvil + módulo de usuarios standalone embebido vía iframe. Todo navegable, sin pantallas estáticas decorativas.

**Estado**
Prototipo completo · listo para migración progresiva al stack Vue.js + Python existente. Documento `INTEGRATION.md` cubre el plan de migración.

### 1.1 · Usuario final (VIEWER)

El usuario final ("VIEWER") es la persona que utiliza la plataforma para gestionar sus wallets y balances personales. Sus expectativas y necesidades guían decisiones de densidad visual, flujos y accesibilidad.

- **Perfil:** usuario no técnico, realiza consultas y operaciones propias (ver saldo, enviar/recibir, historial), espera tiempos de respuesta rápidos y una experiencia mobile-first.
- **Principales metas:** revisar portafolio, enviar y recibir fondos de forma segura, ver historial y detalles de transacciones, generar y usar links/QR para recibir pagos.
- **Flujos críticos:** Login → Mi portafolio → Wallet detail → Send/Confirm → Receive (QR) → Historial/Detalle TX.
- **Requisitos UX:** CTA claros, confirmaciones con deshacer/tiempo limitado, feedback visual en cada paso, accesibilidad (contraste y soporte teclado), estados offline suaves y retry.
- **Mobile:** vista responsive con sheets para Send/Receive, tamaños de toque optimizados y persistencia local de drafts (por si se cierra la app).
- **KPIs UX:** éxito en envío (primer intento), tiempo hasta ver saldo actualizado (TTL), tasa de errores por dispositivo móvil, NPS básico interno en pruebas.

Incluir estas necesidades en el sistema de diseño asegura que los componentes `BaseCard`, `BaseButton`, `BaseBadge` y los patrones de flujo funcionen de forma consistente para la mayor base de usuarios de la plataforma.

---

## 2 · Arquitectura del prototipo

### 2.1 · Stack

| Capa | Implementación |
|---|---|
| Runtime | React 18.3.1 vía CDN UMD (como base inicial, nosotros adaptamos a Vue.js 3) |
| Transpilación | Babel Standalone 7.29.0 (in-browser) |
| Estado | `useState`/`useReducer` locales · `NavCtx` para navegación cross-component |
| Persistencia | `localStorage` (tweaks · sin backend) |
| Styling | CSS puro con custom properties (sin framework) |
| Tipografía | Geist · Geist Mono · Source Serif 4 (Google Fonts) |
| Fuentes de íconos | SVG inline custom (sin librería externa) |

### 2.2 · Filosofía de implementación

Todo el prototipo evita dependencias instalables: sirve como referencia visual y de comportamiento, no como base de código a portar. Los desarrolladores deben **traducir** los componentes a Vue 3 SFC manteniendo los tokens CSS y los flujos.

### 2.3 · Estructura de archivos

```
simulator/
├─ App.html                  ← Entry point principal (prototipo interactivo)
├─ Platform.html             ← Design canvas con todas las pantallas en grilla
├─ Users.html                ← Módulo de usuarios standalone (embebido en App)
├─ Versions.html             ← Comparativa v1 actual / v2 sober / v3 terminal
│
├─ styles.css                ← Tokens base + componentes core
├─ platform-styles.css       ← Componentes específicos de plataforma
├─ tweaks.css                ← Variantes mood/typeface/surface
├─ alerts.css                ← Sistema de toast + banners
│
├─ data.js                   ← Mock data: 32 usuarios sintéticos
├─ icons.jsx                 ← Pack de íconos SVG
├─ helpers.jsx               ← Utilidades de formato (USD, fechas, avatar color)
├─ chrome.jsx                ← Sidebar, TopBar, NavCtx, AssetPill, AddrChip, FakeQR
├─ tweaks-panel.jsx          ← Panel de tweaks (mood/type/surface)
│
├─ Pantallas (vistas principales)
│  ├─ auth-screens.jsx       ← Login, Registro, OTP
│  ├─ admin-screens.jsx      ← Dashboard admin, Tesorería
│  ├─ chain-screens.jsx      ← Chain, Mempool, Nodes, Validation, Health, Currencies, Rates
│  ├─ compliance-screens.jsx ← Compliance, Auditoría, Settings, Operator dashboard
│  ├─ module-screens.jsx     ← Wallets, Movimientos, Envíos, P2P, Exchange
│  ├─ user-screens.jsx       ← Portafolio, Wallet detail, Send/Receive (Viewer)
│  ├─ mobile-screens.jsx     ← 5 pantallas mobile estáticas
│  ├─ permissions-screen.jsx ← Tabla de permisos por usuario staff
│  └─ profile-screen.jsx     ← "Mi perfil" compartido entre roles
│
├─ Flujos (modales interactivos)
│  ├─ flows.jsx              ← AuthFlow, P2PBuyFlow, TreasuryApprovalFlow, SendConfirmFlow, KYCReviewFlow, FlowRouter
│  ├─ flows-extra.jsx        ← ExchangeOrderFlow, ReceiveFlow, WithdrawFlow, DisputeResolutionFlow, ConvertFlow, NotificationsPanel
│  ├─ flows-mining.jsx       ← MineBlockFlow (PoW animado), TransactionDetailFlow
│  ├─ flows-admin.jsx        ← WalletDetailDrawer, AuditEventFlow, SendDetailFlow, CurrencyFormFlow
│  ├─ flows-final.jsx        ← PeerActionsFlow, ValidationRunFlow, HealthLogsLive, AssetDetailFlow
│  ├─ flows-onboarding.jsx   ← WalletCreateFlow (frase semilla), PermissionsFlow, CreateUserFlow, TwoFASetupFlow
│  ├─ flows-permissions.jsx  ← (módulo legacy de permisos)
│  ├─ flows-user.jsx         ← RequestPaymentFlow, RecurringFlow, KycUpgradeFlow
│  └─ flows-mobile.jsx       ← MobileApp completa con sheets internos
│
├─ alert-system.jsx          ← ToastStack, AlertBanner, useAlertSystem
├─ interactive-app.jsx       ← Root del prototipo (orquesta roles, navegación, flujos, toasts)
│
└─ INTEGRATION.md            ← Guía de migración a Vue.js + Python
```

---

## 3 · Sistema de diseño

### 3.1 · Tokens base

```css
:root {
  /* Colores · Sober (default) */
  --bg: #faf9f6;
  --surface: #ffffff;
  --surface-2: #f5f4f0;
  --border: #e6e3db;
  --text: #1a1917;
  --text-2: #5d5b54;
  --accent: #2456e6;
  --success: #1f7a3a;
  --warning: #a8590b;
  --danger: #ad2820;
  --info: #0a6e88;

  /* Geometría */
  --radius: 6px;
  --radius-lg: 10px;

  /* Tipografía */
  --font-sans: 'Geist', system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;

  /* Sombras */
  --shadow-sm: 0 1px 2px rgba(20,18,12,0.04);
  --shadow-md: 0 4px 16px rgba(20,18,12,0.06);
  --shadow-lg: 0 24px 64px rgba(20,18,12,0.16);
}
```

### 3.2 · Variantes (vía atributos `data-*` en `<html>`)

**Mood** (`data-mood`)
- `sober` — Stripe / Mercury · paleta neutra cálida + azul confiado (default)
- `terminal` — Bloomberg / Linear · fondo negro con grid, acento verde fosforescente
- `editorial` — FT / WSJ · cream + magenta + serifa compatible
- `vivid` — crypto moderno · violetas saturadas, gradients

**Typeface** (`data-type`)
- `sans` — Geist (default)
- `mono` — Geist Mono (todos los textos)
- `serif` — Source Serif 4 para títulos, Geist para UI controls

**Surface** (`data-surface`)
- `flat` — sin sombras, bordes mínimos, radios chicos
- `soft` — sombras suaves, radios medios (default)
- `sharp` — bordes 1.5px sólidos, hard shadows offset, estética neo-brutalist

### 3.3 · Componentes core (definidos en `styles.css`)

`.btn`, `.btn-primary`, `.btn-danger`, `.btn-ghost`, `.btn-sm`, `.btn-icon`
`.bdg`, `.bdg-active`, `.bdg-pending_kyc`, `.bdg-frozen`, `.bdg-banned`, `.bdg-deleted`, `.bdg-kyc`, `.bdg-staff`
`.chip`, `.tabs`, `.tab`, `.toggle`, `.cbx`
`.card`, `.card-row`, `.tbl`, `.pager`
`.modal-scrim`, `.modal`, `.modal-h`, `.modal-b`, `.modal-f`
`.drawer`, `.drawer-head`, `.drawer-tabs`, `.drawer-body`
`.fld`, `.fld-row`, `.warn-box`, `.dry-run`
`.kvs` (key-value table), `.mv-ic`, `.audit-row`, `.audit-item`
`.spinner`, `.empty`

### 3.4 · Componentes JSX reutilizables (`chrome.jsx` + helpers)

| Componente | Función |
|---|---|
| `<Sidebar role>` | Navegación lateral por rol con grupos y resaltado activo |
| `<TopBar crumbs env>` | Breadcrumbs + búsqueda + notif bell |
| `<AssetPill asset>` | Pill con dot coloreado por activo (BTC, ETH, USDT, etc.) |
| `<AddrChip addr>` | Dirección truncada + botón copiar |
| `<Avatar name size>` | Avatar circular con color derivado del nombre |
| `<StatusBadge status>` | Badge de estado de usuario |
| `<FakeQR seed size>` | QR code SVG determinista (sin librería) |
| `<Sparkline data color>` | Mini gráfico SVG inline |
| `<Stepper steps current>` | Indicador de pasos para flujos multi-step |

---

## 4 · Modelo de roles y permisos

### 4.1 · Roles

| Rol | Etiqueta | Color | Descripción |
|---|---|---|---|
| `ADMIN` | Administrador | `#7c3aed` violeta | Acceso total · tesorería, mint, eliminar usuarios, configuración |
| `OPERATOR` | Operador | `#0891b2` cian | KYC, congelar/desbanear, resolver disputas, sin tesorería ni config |
| `VIEWER` | Viewer (cliente final) | `#1f7a3a` verde | Sólo sus propias wallets, P2P, exchange |

### 4.2 · Catálogo de permisos (16 permisos · 6 grupos)

**Tokens**
- `MINT` (riesgo alto) — acuñar tokens
- `BURN` (alto) — destruir suministro

**Transacciones**
- `APPROVE_TX` (alto) — segunda firma en aprobación dual
- `REJECT_TX` (medio) — bloquear TX en compliance
- `EXPORT_TX` (bajo) — descargar historial

**Usuarios y wallets**
- `USER_MANAGE` (medio) — CRUD de cuentas
- `WALLET_FREEZE` / `WALLET_UNFREEZE` (medio)

**Compliance**
- `KYC_REVIEW`, `AML_INVESTIGATE`, `P2P_DISPUTE` (medio)

**Tesorería**
- `TREASURY_VIEW` (bajo)
- `TREASURY_MANAGE` (alto) — distribuir, requiere aprobación dual

**Sistema**
- `PEER_MANAGE` (medio)
- `CONFIG_EDIT` (alto)
- `AUDIT_VIEW` (bajo)

### 4.3 · Presets

- `DEFAULT_PERMS_BY_ROLE.ADMIN` — los 16 permisos
- `DEFAULT_PERMS_BY_ROLE.OPERATOR` — 10 permisos (sin MINT, BURN, USER_MANAGE, TREASURY_MANAGE, PEER_MANAGE, CONFIG_EDIT)
- `DEFAULT_PERMS_BY_ROLE.VIEWER` — vacío

---

## 5 · Pantallas (vistas)

### 5.1 · Acceso (compartido)

| Pantalla | Archivo · función | Notas |
|---|---|---|
| Login | `auth-screens.jsx · LoginScreen` | Form + panel derecho con roles documentados |
| Registro | `auth-screens.jsx · RegisterScreen` | Paso 2 de 4 con barra de progreso |
| OTP / 2FA | `auth-screens.jsx · OtpScreen` | 6 cells con cursor visible · auto-submit al completar |

### 5.2 · ADMIN (11 vistas)

| Vista | Archivo · función |
|---|---|
| Resumen (Dashboard) | `admin-screens.jsx · AdminDashboard` |
| Usuarios (embebido) | `Users.html` vía iframe — drawer + bulk + soft-delete |
| Tesorería | `admin-screens.jsx · TreasuryScreen` |
| Wallets | `module-screens.jsx · WalletsScreen` |
| Movimientos | `module-screens.jsx · MovementsScreen` |
| Envíos | `module-screens.jsx · SendsScreen` |
| Mercado P2P | `module-screens.jsx · P2PScreen` |
| Exchange | `module-screens.jsx · ExchangeScreen` (chart con velas + order book) |
| Compliance | `compliance-screens.jsx · ComplianceScreen` |
| Permisos | `permissions-screen.jsx · PermissionsScreen` |
| Auditoría | `compliance-screens.jsx · AuditScreen` |
| Ajustes (plataforma) | `compliance-screens.jsx · SettingsScreen` |

### 5.3 · Blockchain (admin/operator)

| Vista | Archivo · función |
|---|---|
| Cadena | `chain-screens.jsx · ChainScreen` — explorador con bloques + detalle |
| Mempool | `chain-screens.jsx · MempoolScreen` |
| Nodos | `chain-screens.jsx · NodesScreen` |
| Validación | `chain-screens.jsx · ValidationScreen` |
| Health | `chain-screens.jsx · HealthScreen` |
| Monedas | `chain-screens.jsx · CurrencyCatalogScreen` |
| Tasas de cambio | `chain-screens.jsx · ExchangeRatesScreen` |

### 5.4 · OPERATOR (4 vistas + heredadas)

| Vista | Archivo · función |
|---|---|
| Resumen (mi turno) | `compliance-screens.jsx · OperatorDashboard` — cola priorizada + métricas personales |
| Compliance | reusa `ComplianceScreen` |
| Movimientos / Wallets / Chain / Mempool / Nodos / P2P / Auditoría | reusan vistas admin |

### 5.5 · VIEWER (8 vistas)

| Vista | Archivo · función |
|---|---|
| Mi portafolio | `user-screens.jsx · UserPortfolio` |
| Mis wallets | `user-screens.jsx · UserWalletDetail` (con QR para recibir) |
| Enviar/Recibir | `user-screens.jsx · UserSendScreen` |
| Historial | reusa `MovementsScreen` |
| Mercado P2P | reusa `P2PScreen` (sin controles admin) |
| Exchange | reusa `ExchangeScreen` |
| Verificación KYC | placeholder + `KycUpgradeFlow` |
| Ajustes (Mi perfil) | `profile-screen.jsx · ProfileScreen` |

### 5.6 · Mi perfil (compartido entre los 3 roles)

`profile-screen.jsx · ProfileScreen` con 7 secciones:
1. **Perfil** — datos personales, username público, verificación KYC, zona peligrosa (export GDPR, pausar cuenta, eliminar)
2. **Seguridad** — cambio de contraseña, 4 métodos 2FA, códigos de respaldo
3. **Notificaciones** — 4 canales × 7 tipos de eventos con frecuencia configurable
4. **Sesiones activas** — devices con cerrar individual o todas
5. **Dispositivos confiables** — saltean 2FA, revocar
6. **API personal** — tokens, webhooks, scopes
7. **Soporte** — chat en vivo, tickets, base de ayuda

### 5.7 · Mobile (responsive · 5 pantallas + 6 sheets)

`flows-mobile.jsx · MobileApp` — phone frame en overlay con:
- Login con loading state
- Tab bar inferior (Inicio · Wallets · Enviar · P2P · Cuenta)
- 5 sheets full-screen overlay: enviar, confirmar (Face ID), sent, recibir (QR live), P2P offer (3 pasos)

---

## 6 · Flujos modales (21 flujos interactivos)

| Flujo | Archivo | Pasos | Disparador |
|---|---|---|---|
| **AuthFlow** | `flows.jsx` | 2 (login → OTP) | Botón "Login" del role switcher |
| **P2PBuyFlow** | `flows.jsx` | 4 (monto → pagar → esperar → recibido) | Card de oferta en P2PScreen |
| **TreasuryApprovalFlow** | `flows.jsx` | 5 (revisar → firmar → 2ª aprobación → ejecutar → done) | Tesorería · "Enviar para aprobación" |
| **SendConfirmFlow** | `flows.jsx` | 2 (revisar con slide-to-confirm → enviado) | Form de envío |
| **KYCReviewFlow** | `flows.jsx` | 1 (revisar docs + decidir) | Click en cola compliance |
| **ExchangeOrderFlow** | `flows-extra.jsx` | 3 (revisar → ejecutar → filled) | Botón "Comprar X" en Exchange |
| **ReceiveFlow** | `flows-extra.jsx` | live QR + simular pago entrante | Hero "Recibir" |
| **WithdrawFlow** | `flows-extra.jsx` | 5 (datos → verificar dir → 2FA → broadcast → done) | Wallet detail "Retirar" |
| **DisputeResolutionFlow** | `flows-extra.jsx` | 1 (chat + evidencia + 4 decisiones) | P2P admin |
| **ConvertFlow** | `flows-extra.jsx` | 2 (swap config → ejecutado) | Hero "Convertir" |
| **MineBlockFlow** | `flows-mining.jsx` | 3 (preview → mining animado → done) | Chain · "Minar bloque" |
| **TransactionDetailFlow** | `flows-mining.jsx` | drawer-modal | Click en cualquier row de movimientos |
| **WalletDetailDrawer** | `flows-admin.jsx` | drawer | Click en row de Wallets admin |
| **AuditEventFlow** | `flows-admin.jsx` | modal | Click en evento de auditoría |
| **SendDetailFlow** | `flows-admin.jsx` | modal | Click en row de Envíos/Tesorería |
| **CurrencyFormFlow** | `flows-admin.jsx` | form | Currencies "Agregar/Editar" |
| **PeerActionsFlow** | `flows-final.jsx` | modal con ping/sync/remove | Click en row de Nodes |
| **ValidationRunFlow** | `flows-final.jsx` | animado · 7 reglas secuenciales | Validation · "Re-validar cadena" |
| **AssetDetailFlow** | `flows-final.jsx` | modal con 4 quick actions | Click en row de Mis activos (Viewer) |
| **WalletCreateFlow** | `flows-onboarding.jsx` | 4 (activo → semilla blur+revelar → verificar 3 palabras → done) | Portfolio "Nueva wallet" |
| **PermissionsFlow** | `flows-onboarding.jsx` | drawer · 6 grupos de toggles + diff + motivo | Click en row de Permisos |
| **CreateUserFlow** | `flows-onboarding.jsx` | 4 (identidad → rol+KYC → permisos → invitar) | Permisos "Crear usuario staff" |
| **TwoFASetupFlow** | `flows-onboarding.jsx` | 4 (método → QR/SMS → verificar → códigos respaldo) | Activar 2FA |
| **RequestPaymentFlow** | `flows-user.jsx` | 2 (form → link + QR live) | Atajos "Solicitar pago" |
| **RecurringFlow** | `flows-user.jsx` | 3 (destinatario → monto y frecuencia → activado) | Atajos "Programar envío" |
| **KycUpgradeFlow** | `flows-user.jsx` | 3 (fuente → docs → revisión) | Banner "Mejorar a L3" |

---

## 7 · Sistema de alertas

### 7.1 · API

```js
// Vía nav (NavCtx)
nav.toast(string)                    // shortcut → success
nav.toastSuccess(title, opts)
nav.toastError(title, opts)
nav.toastWarning(title, opts)
nav.toastInfo(title, opts)
nav.toastLoading(title)              // sticky · spinner
nav.toastUndo(title, onUndo)         // botón "Deshacer" auto
nav.toastPromise(promise, { loading, success, error })

// opts: { desc, action: { label, onClick, primary }, duration, id, sticky }
```

### 7.2 · Características

- 5 variantes: `success` · `info` · `warning` · `danger` · `loading`
- Stack de hasta 5 visibles simultáneos
- Barra de progreso animada por duración real
- Hover pausa el timer (hover-friendly)
- Botón de acción opcional (CTA secundaria)
- Botón X de dismiss manual
- Animación de entrada/salida cubic-bezier
- Mismo ID → actualiza toast existente (perfecto para promesas)

### 7.3 · Componente inline `<AlertBanner>`

Para alertas a nivel de pantalla (no global). 4 variantes, acciones múltiples, dismiss opcional, slot de contenido custom.

---

## 8 · Modelo de datos (mock)

`data.js` genera 32 usuarios sintéticos deterministas con FNV-1a hash + xorshift. Cada usuario incluye:

```js
{
  id, fullName, email, phone, country,
  kyc: 'L0' | 'L1' | 'L2' | 'L3',
  status: 'active' | 'pending_kyc' | 'frozen' | 'banned' | 'deleted',
  role: 'user' | 'staff',
  wallets: [{ id, asset, address, network, balance, balanceUsd, status, createdAt }],
  totalUsd, walletCount, createdAt, lastActive, twoFA,
  flags: { banReason, freezeReason, deletedAt },
  movements: [{ id, type, asset, amount, amountUsd, counterparty, txHash, status, createdAt }],
  audit: [{ id, action, actor, meta, at }],
}
```

Datos de cadena (`chain-screens.jsx`):
- 12 bloques con `prev_hash`, `merkle_root`, `nonce`, `difficulty`, `timestamp`, `miner`, `size`, `txs`, `reward`
- 3 transacciones en mempool
- 5 peers con `url`, `status`, `height`, `latency`, `version`, `region`, `lastSync`

---

## 9 · Personalización: Tweaks Panel

`tweaks-panel.jsx` provee un panel persistente que ajusta:

| Tweak | Valores | Efecto |
|---|---|---|
| `mood` | sober / terminal / editorial / vivid | Paleta + carácter de marca |
| `type` | sans / mono / serif | Sistema tipográfico completo |
| `surface` | flat / soft / sharp | Tratamiento de cards y bordes |

Los valores se persisten en `localStorage` por `__activate_edit_mode`. Total: **36 combinaciones** que producen productos visualmente muy distintos.

---

## 10 · Cobertura · matriz de features

| Capacidad | Estado | Notas |
|---|---|---|
| Autenticación con 2FA | ✅ completo | App / SMS / Email + FIDO2 mencionado |
| Onboarding KYC progresivo (L0-L3) | ✅ completo | KycUpgradeFlow para subir nivel |
| Crear wallet con frase semilla | ✅ completo | 4 pasos · blur+revelar · verificación de 3 palabras |
| Enviar / recibir interno | ✅ completo | Slide-to-confirm + QR vivo |
| Retiro on-chain | ✅ completo | Re-pegar dirección + 2FA + broadcast |
| Mercado P2P | ✅ completo | Ofertas + flujo de 4 pasos + chat + disputas |
| Exchange (mercado/límite/stop) | ⚠ visual | Order book + chart de velas · stop sólo UI |
| Conversión instantánea | ✅ completo | Swap entre activos · sin comisión |
| Pago con link + QR | ✅ completo | RequestPaymentFlow con expiración |
| Pagos recurrentes | ✅ completo | RecurringFlow con regla configurable |
| Tesorería con aprobación dual | ✅ completo | 5 pasos · simulación de 2ª firma |
| Asignación de permisos granular | ✅ completo | Drawer con 16 permisos + diff + motivo |
| Creación de usuarios admin/op/viewer | ✅ completo | 4 pasos + presets de permisos |
| KYC review (operator) | ✅ completo | Modal con docs + checks automáticos |
| Resolución de disputas P2P | ✅ completo | Chat + evidencia + 4 decisiones |
| Cadena · explorador | ✅ completo | Lista + detalle con prev/merkle/nonce |
| Mempool · pending + history | ✅ completo | Click a tx detail |
| Nodos · peers + consenso | ✅ completo | Ping + register + remove |
| Validación de cadena | ✅ completo | 7 reglas animadas secuenciales |
| Mining (Proof of Work) | ✅ completo | Animación con nonce en vivo · ~3-5s |
| Currency catalog | ✅ completo | CRUD + tipos (native/stable/platform) |
| Exchange rates feed | ✅ completo | Binance sync + manual |
| Auditoría inmutable | ✅ completo | Filtros + detail con diff + HMAC |
| Health · logs live | ✅ completo | Logs auto-actualizándose + pausa |
| Notificaciones (popover bell) | ✅ completo | Deep-link al contexto del evento |
| Sistema de alertas (toasts) | ✅ completo | 5 variantes + acción + progress + hover-pause |
| Perfil personal compartido | ✅ completo | 7 secciones · mismo para todos los roles |
| Mobile responsive | ✅ completo | 5 tabs + 6 sheets · interactivo |
| Tweakable design system | ✅ completo | 36 combinaciones mood × type × surface |

---

## 11 · Patrones técnicos relevantes para migración

### 11.1 · Estado de navegación

```js
const NavCtx = React.createContext({
  navigate: (k) => {},   // cambia view
  openFlow: (type, data) => {},  // abre modal
  toast: (msg, opts) => {},
  role: 'admin',
});
```

En Vue: `provide/inject` con un composable `useNav()`, o un store de Pinia.

### 11.2 · Router de flujos

Patrón `FlowRouter` recibe `flow: { type, data }` y delega al componente correspondiente. En Vue: equivalente a `<router-view>` con `name="modal"` o un `<Teleport>` con `<component :is>`.

### 11.3 · Tweaks persistentes

`useTweaks(defaults)` → `[state, setTweak]` con persistencia en `localStorage` y postMessage al host. En Vue: composable `useTweaks()` con `useStorage` de VueUse.

### 11.4 · Validación de formularios

Estado local con `useState` + cálculo derivado de `canSubmit`. No usa librerías de validación. En Vue: VeeValidate o Zod opcional.

---

## 12 · Próximos pasos sugeridos

**Inmediato (sprint corto)**
1. Extraer tokens CSS a `src/assets/design-system.css` en el repo Vue
2. Implementar `BaseButton`, `BaseBadge`, `BaseCard`, `BaseTable`, `BaseModal` como SFC base
3. Migrar `LoginView.vue` y `DashboardView.vue`

**Medio plazo**
- Backend: endpoints nuevos para Treasury con aprobación dual (`POST /treasury/distribute`, `POST /treasury/distribute/:id/approve`)
- Backend: log de auditoría firmado con HMAC + endpoint export
- Frontend: migración progresiva pantalla por pantalla

**Visión**
Ver sección 10 del documento `INTEGRATION.md` para el plan completo de migración módulo por módulo manteniendo v1 operativa.

---

## 13 · Entregables · entradas según uso

| Para qué | Archivo |
|---|---|
| Demo clickeable con role switcher + flujos | `App.html` |
| Comparar v1 actual vs. v2 sober vs. v3 terminal | `Versions.html` |
| Canvas con todas las pantallas en grilla (para stakeholders) | `Platform.html` |
| Módulo de usuarios standalone | `Users.html` |
| Plan de migración técnica | `INTEGRATION.md` |
| Esta documentación | `DOCUMENTATION.md` |

---

*Documento generado · mayo 2026 · Cadena Simulator · proyecto interno de rediseño basic-blockchain*
