# Design System (Phase 5)

Status: Accepted
Last updated: 2026-05-15
Scope: visual primitives, layout patterns and conventions used across all
views under `src/views/` and reusable components under `src/components/`.

See also: [components.md](./components.md) (Atomic Design component
catalog — what exists), this doc (how it looks and how to compose it).

---

## 1. Philosophy

**Phase 5** is the current design language. It is implemented with:

- **CSS custom properties** as the single source of design tokens
  (`src/assets/design-system.css`).
- A small set of **global utility classes** in `src/assets/main.css`
  (`.panel` base, `.btn` family, `.count-badge`, modal scaffolding,
  PrimeVue overrides).
- **View-scoped** `<style scoped>` blocks that re-declare a small set
  of *shared primitives* (`.page-h`, `.panel-h`, `.bigstat-row`, `.field`,
  `.data-table`, etc.) using the same tokens, so every view looks the
  same without leaking styles globally.

A second, more interactive iteration of the system is being explored
(see [§9 Roadmap](#9-roadmap)). Until that lands, **Phase 5 is normative**.

> **Rule of thumb:** if a class name from this document matches your
> need, use it verbatim. Do not create a parallel class with the same
> meaning under a different prefix.

---

## 2. Tokens

Defined in `src/assets/design-system.css`. Use `var(--token)` — never
hard-code colors, radii, or font stacks.

### Surfaces & borders

| Token | Use |
| --- | --- |
| `--bg` | App background outside panels |
| `--surface` | Panels, cards, drawer, modal body |
| `--surface-2` | Hover wash, panel headers, table headers, inactive tabs |
| `--hover` | Hover background for buttons / nav items |
| `--border` | Default 1px border on panels, table rows, fields |
| `--border-strong` | Emphasized border (focus rings off, dividers) |

### Text

`--text` (primary) · `--text-2` (secondary, labels) · `--text-3` (tertiary, hints/timestamps).

### Brand & semantic

`--accent` (primary actions, focus) · `--accent-soft` (badges, chips) · `--accent-text` (text on soft).

`--success` / `--success-soft` · `--warning` / `--warning-soft` · `--danger` / `--danger-soft` · `--info` / `--info-soft` · `--muted` / `--muted-soft`.

### Shape & motion

Radii: `--radius-sm` (4px) · `--radius` (6px) · `--radius-lg` (10px).
Shadows: `--shadow-sm` / `--shadow-md` / `--shadow-lg`.
Type: `--font-sans` (Geist) · `--font-mono` (Geist Mono).

---

## 3. Shared primitives

These classes mean the same thing in every view. If you reach for one of
these names, the visual contract is fixed; only override paddings/widths
when the layout absolutely demands it.

### 3.1 Page header — `.page-h`

```html
<div class="page-h">
  <div>
    <h1>Section title</h1>
    <p>Short subtitle.</p>
  </div>
  <div class="page-actions">
    <button class="btn btn-ghost">Secondary</button>
    <button class="btn btn-primary">Primary</button>
  </div>
</div>
```

- `h1`: 22px / 600 weight / `-0.015em` letter-spacing / `var(--text)`.
- `p`: 13px / `var(--text-2)`.
- `.page-actions` is `display: flex; gap: 8px;`.
- Collapses to column at `max-width: 640–900px`.

### 3.2 KPI strip — `.bigstat-row` / `.bigstat`

```html
<div class="bigstat-row">
  <div class="bigstat">
    <div class="lb">Label uppercase</div>
    <div class="vl">Value</div>
    <div class="ds">Description</div>
  </div>
  <!-- repeat for 3 more KPIs -->
</div>
```

- `.bigstat-row`: 4-col grid by default. Override `grid-template-columns`
  for 3 or 5 KPIs.
- `.lb`: 11.5px / uppercase / `--text-2`.
- `.vl`: 26px / 600 / tabular-nums / `--text`. Color modifiers:
  `vl-ok` (success), `vl-err` (danger), `vl-warn` (warning), `vl-danger`
  for emphasis (see AdminView).
- `.ds`: 11.5px / `--text-3`.

### 3.3 Container — `.panel` + `.panel-h` + `.panel-body`

There are two `.panel` flavors that coexist:

| Flavor | Where defined | Padding | When |
| --- | --- | --- | --- |
| Global base | `main.css:36` | `1.25rem` | Standalone card with body inline |
| Scoped header+body | view `<style scoped>` | `0` (children pad) | Whenever you also need `.panel-h` |

The scoped flavor overrides the global one and is the dominant pattern:

```html
<section class="panel">
  <div class="panel-h">
    <span>Section name</span>
    <span class="count-badge sm">{{ count }}</span>
  </div>
  <div class="panel-body">
    ...
  </div>
</section>
```

- `.panel-h`: `padding: 10px 14px`, `background: var(--surface-2)`,
  `border-bottom: 1px solid var(--border)`, uppercase 12px label.
- `.panel-body`: `padding: 16px`, flex column with `gap: 12px`.
- Tables go directly inside `.panel` (no `.panel-body`) so rows touch
  the border-radius cleanly.

### 3.4 Forms — `.field`, `.field-row`, `.field-label`, `.field-input`

```html
<div class="field">
  <label class="field-label" for="name">Name</label>
  <input id="name" v-model="name" class="field-input" type="text">
</div>

<div class="field-row">
  <div class="field"> ... </div>
  <div class="field"> ... </div>
</div>
```

- `.field`: vertical flex, `gap: 4px`.
- `.field-row`: 2-col grid for paired fields; collapses to 1 col under 760px.
- `.field-input`: 7×10px padding, `--surface-2` bg, `--border`, focuses to `--accent`.
- Modifiers: `.field-input.mono` (uses `--font-mono`).
- For inputs with a unit suffix (e.g. `BTC`), wrap in `.field-input-wrap` and add `.field-input-unit`.
- For read-only displays (e.g. "Disponible: 12,420.50 USDT"), use `.field-static`.

**Do not** use `.fld` / `.fld-row` (legacy naming from the JSX prototype).

### 3.5 Buttons — `.btn` + variants

Defined globally in `main.css:207+`.

```html
<button class="btn btn-primary">Save</button>
<button class="btn btn-ghost">Cancel</button>
<button class="btn btn-danger">Delete</button>
<button class="btn btn-sm">Compact</button>
<button class="btn btn-icon btn-ghost"><i class="pi pi-cog" /></button>
```

| Variant | Use |
| --- | --- |
| `btn-primary` | Single primary action per surface |
| `btn-ghost` | Secondary / refresh / dismissive |
| `btn-danger` | Destructive (delete, ban) |
| `btn-sm` | Inline / table-row actions |
| `btn-icon` | Square icon-only button |

**Do not** mix `.btn-sm .btn-edit` with `.btn .btn-sm` — choose one
pattern per view (`.btn` family is preferred for new code).

### 3.6 Tabs — `.tabs` + `.tab`

```html
<div class="tabs">
  <button class="tab active">15m</button>
  <button class="tab">1H</button>
  <button class="tab">4H</button>
</div>
```

Used for timeframes (Exchange), order types, segmented controls inside
panel headers. Active state: `background: var(--surface)`, `border-color: var(--border)`.

### 3.7 Tables — `.data-table` and `.tbl`

Both exist in the codebase and look identical. Convention going forward:

- **`.data-table`** when the view has CRUD-row actions (Wallets, Users).
- **`.tbl`** in flow-card style audit/log tables (Audit, dashboards).

Either way:

```html
<table class="data-table">
  <thead>
    <tr><th>Column</th></tr>
  </thead>
  <tbody>
    <tr><td>Cell</td></tr>
  </tbody>
</table>
```

- `th`: 11.5px / uppercase / `--text-3` / `--surface-2` bg.
- `td`: 13px / `--text` / `--border` bottom.
- Use `.row-muted` for soft-deleted/disabled rows.

### 3.8 Indicators

| Class | Meaning | Where |
| --- | --- | --- |
| `.count-badge` | Numeric pill next to a label | Panel headers, sidebar |
| `.count-badge.sm` | Smaller version (11px) | Inline next to titles |
| `.status-dot` | User/wallet status pill | `+ .active / .banned / .deleted / .frozen` |
| `.type-badge` | Wallet-type / asset-class pill | `+ .type-user / .type-treasury / .type-fee` |
| `.role-chip` | Toggleable role (ADMIN/OPERATOR/VIEWER) | Users table |
| `.asset-pill` | Currency/asset code chip | Wallets table |
| `.pill` | Trend pill (`+5%` / `-2%`) | KPI footers · `+ .pill-up / .pill-down` |

### 3.9 Inline alerts — `.inline-alert`

```html
<div class="inline-alert danger">{{ error }}</div>
```

`.inline-alert.danger` (errors), `.inline-alert.fail` (validation
warnings, uses `--warning`), `.inline-alert.info` (informational).

### 3.10 Modals — `.modal-scrim` + `.modal-h/b/f`

```html
<Teleport to="body">
  <div class="modal-scrim" @click.self="close">
    <div class="modal" role="dialog">
      <div class="modal-h"><h2>Title</h2></div>
      <div class="modal-b">…</div>
      <div class="modal-f">
        <button class="btn">Cancel</button>
        <button class="btn btn-primary">Confirm</button>
      </div>
    </div>
  </div>
</Teleport>
```

**Always wrap in `<Teleport to="body">`.** A `position: fixed` overlay
nested inside a transformed/filtered ancestor will be clipped. This was
the root cause of the "ban modal not visible" bug — fixed in
PR #160.

### 3.11 Filters bar

```html
<div class="filters-bar">
  <input class="filter-input" placeholder="Buscar…">
  <select class="filter-select"> ... </select>
</div>
```

Used above tables. `.filter-input` and `.filter-select` share the same
visual treatment as `.field-input` but expose minimum widths for use in
horizontal toolbars.

---

## 4. Domain primitives

These classes are **specific to one view's domain** and should not be
reused outside it. They are documented here so the reader knows what
they mean when reading code.

| Class | View | Meaning |
| --- | --- | --- |
| `.ob-row`, `.ob-bid`, `.ob-ask` | `ExchangeView` | Order book row (price/qty/total grid) |
| `.ob-mid`, `.ob-mid-price` | `ExchangeView` | Mid-price band between bids and asks |
| `.buy-price` / `.sell-price` | `ExchangeView` | Price coloring per side |
| `.trade-side.buy` / `.sell` | `ExchangeView` | Buy/sell segmented toggle |
| `.cta-buy` / `.cta-sell` | `ExchangeView` | Full-width CTA with side coloring |
| `.pct-row` / `.pct-btn` | `ExchangeView` | 25/50/75/100% quick-fill row |
| `.check-list` / `.check-item` | `ValidationView` | Per-rule validation outcome |
| `.audit-item` / `.audit-dot` | `AdminAuditView` | Audit feed row with severity dot |
| `.history-item.valid/invalid/error` | `ValidationView` | Validation history entry |

If you find yourself reaching for one of these outside its view, that
is a signal it belongs in §3 (promote it to a shared primitive) instead.

---

## 5. Page patterns (skeletons)

### 5.1 Admin / CRUD view

```
page-h
bigstat-row                  (4 KPIs)
flow-card toolbar            (search + filters + tabs)
panel
  panel-h                    (label + count-badge)
  data-table
```

Examples: `AdminWalletsView`, `AdminUsersView`, `AdminMovementsView`,
`AdminAuditView`.

### 5.2 Form / settings view

```
page-h
settings-layout              (sidebar nav + content column)
  settings-nav
  settings-content
    panel
      panel-h
      panel-body
        field-row
        field
```

Example: `AdminSettingsView`.

### 5.3 Detail / explorer view

```
page-h
bigstat-row
2-col grid
  panel (left)
  panel (right)
```

Examples: `ChainView`, `AdminView` (Resumen), `HealthView`.

### 5.4 Trading terminal (Exchange)

```
page-h                       (pair + inline ticker stats)
3-col grid
  panel chart-panel
  panel orderbook-panel
  panel trade-panel
```

Example: `ExchangeView`. Note: **no `bigstat-row`** — ticker stats sit
in the header to keep vertical space for the chart and book.

### 5.5 Validation / diagnostics view

```
page-h
bigstat-row
panel                        (top-level result)
2-col grid + full-width row
  panel + panel + panel (full)
panel                        (history)
```

Example: `ValidationView`.

---

## 6. Drawers

Drawers slide in from the right and host **detail views** for a single
selected entity. They are not modals: the underlying page stays
interactive (no scrim takeover) and the drawer can be closed to
preserve scroll position.

Existing drawers (see `src/components/drawers/`):

- **`UserDrawer`** — admin's detail panel for one user (tabs:
  Resumen / Wallets / Movimientos / KYC / Auditoría).
- **`ProfileDrawer`** — the user's own profile (Identidad / KYC) opened
  from the sidebar avatar.

Pending: **`WalletDrawer`** (per-wallet detail) — Phase 6d.

### When to use a drawer vs a modal

| Drawer | Modal |
| --- | --- |
| Detail / read-mostly | Action / confirmation |
| Multiple tabs or sections | Single decision |
| Stays open while scrolling table | Blocks everything else |
| No "destructive" intent | Often destructive (ban, delete, restore) |

---

## 7. Naming rules

- **One name per meaning.** If `.panel` exists, do not create
  `.settings-panel`, `.wallet-panel`, etc.
- **Domain-prefixed names for domain primitives** (`.trade-side`, not
  `.side`; `.ob-row`, not `.row`).
- **`.field` over `.fld`.** The JSX prototypes use `.fld`; the shipped
  Phase 5 code uses `.field`. Latter wins.
- **`.data-table` and `.tbl`** are both legal but pick the one that
  matches the surrounding view to avoid churn.
- **State modifiers** are short adjectives (`.active`, `.banned`,
  `.frozen`, `.muted`, `.ok`, `.fail`) appended to the base class.

---

## 8. Anti-patterns

Lessons from the audit (Phase 5 cleanup, May 2026):

1. **Do not create a parallel class for an existing primitive.** The
   `.settings-panel` family duplicated `.panel` and made
   AdminSettingsView drift visually from the rest of the platform until
   PR #161 collapsed it back.
2. **Do not re-define design tokens in scoped styles.** Always
   `var(--*)`.
3. **Do not nest `position: fixed` overlays inside transformed
   ancestors.** Teleport to `body` (see §3.10).
4. **Do not hard-code totals or counts** in confirmation dialogs.
   `ConfirmUserModal` originally showed "$0,00 · 1 wallet" for every
   user because the caller passed literals — fixed in PR #160 by
   summing real wallet balances at open time.
5. **Do not mix `.btn-sm.btn-edit` ad-hoc variants with `.btn .btn-sm`
   composition.** Pick the `.btn` family and the proper variant.

---

## 9. Roadmap

The next iteration of the design system (informal name: "Phase 6 visual"
or "Cadena v2") introduces interactive flows that span multiple panels
and revamped table chrome (column selector, bulk actions, segmented
filters). It will be documented in `docs/DESIGN-v2.md` when work starts.
Until then:

- **Phase 6d** keeps Phase 5 vocabulary. New components (e.g.
  `WalletDrawer`, fully-wired `UserDrawer` tabs) must follow this
  document.
- **Phase 6e** (AdminView dashboard enrichment — chart, asset
  composition, event feeds, trend pills) requires new backend endpoints
  and may introduce one or two new shared primitives (e.g.
  `.trend-pill`); those will be added to §3 by their PR.
- **Users table redesign** (proposed in `Screenshot_438.png`) requires
  pagination, column selector, advanced filters — same story.
