# Documentation Index — Basic Blockchain Frontend

Real-time dashboard for the
[Basic Blockchain Simulator](../../basic-blockchain-simulator/) backend.

Stack: Vue 3 + Vite 6 + TypeScript 5 + Pinia + VueUse + PrimeVue 4 + Chart.js.

---

## Documents

| Document | Description |
|----------|-------------|
| [Architecture](architecture.md) | Layered design, component tree, data flows, Pinia stores, WebSocket lifecycle, CI/CD, environment config. |
| [Component Catalog](components.md) | Every atom, molecule, organism and view — props, emits, usage examples. |
| [User Guide](user-guide.md) | End-to-end navigation guide for operators: dashboard, chain, mempool, nodes, validation, health. |
| [UX and Validation Requirements](ux-validation-requirements.md) | Visual improvement backlog, color strategy, accessibility and new validation capabilities roadmap. |
| [Phase Flow Plan](phase-flow-plan.md) | Real execution flow from feature delivery to release promotion, with phase gates and runbook. |
| [ADR-001 — Vue over React](decisions/ADR-001-vue-over-react.md) | Framework selection for the dashboard. |
| [ADR-002 — Pinia for state](decisions/ADR-002-pinia-state.md) | State-management choice (Pinia vs Vuex / TanStack Query / plain composables). |
| [ADR-003 — Atomic Design](decisions/ADR-003-atomic-design.md) | Component organisation (atoms -> molecules -> organisms -> views). |

---

## Release Notes

| Version | Notes |
|---------|-------|
| v0.6.0 | [docs/releases/v0.6.0.md](releases/v0.6.0.md) — Phase H+ (paired with simulator v0.10.0): Block carries merkleRoot + transactions; Merkle/tx-count badge on block card |
| v0.5.0 | [docs/releases/v0.5.0.md](releases/v0.5.0.md) — confirmed-transaction history hydration, lint cleanup, README/CLAUDE refresh |
| v0.4.0 | [docs/releases/v0.4.0.md](releases/v0.4.0.md) — Phase H1: typed BlockchainApiError envelope, debounced validation, 255-char input cap, runtime WS URL, Sprint 2+3 unit tests *(retroactive notes)* |
| v0.3.0 | [docs/releases/v0.3.0.md](releases/v0.3.0.md) — Accessibility batch: mobile drawer, aria-live, focus rings, WCAG AA contrast tokens *(retroactive notes)* |
| v0.2.0 | [docs/releases/v0.2.0.md](releases/v0.2.0.md) — Validation Center, confirmed-tx history list, WS parse-error visibility *(retroactive notes)* |

---

## Related Backend Documentation

| Document | Link |
|----------|------|
| Backend Architecture  | [../../basic-blockchain-simulator/docs/architecture.md](../../basic-blockchain-simulator/docs/architecture.md) |
| Backend API Reference | [../../basic-blockchain-simulator/docs/api-reference.md](../../basic-blockchain-simulator/docs/api-reference.md) |
| Business Rules        | [../../basic-blockchain-simulator/docs/business-rules.md](../../basic-blockchain-simulator/docs/business-rules.md) |
| Data Model            | [../../basic-blockchain-simulator/docs/data-model.md](../../basic-blockchain-simulator/docs/data-model.md) |
| Flow Diagrams         | [../../basic-blockchain-simulator/docs/flows.md](../../basic-blockchain-simulator/docs/flows.md) |
| Use Cases             | [../../basic-blockchain-simulator/docs/use-cases.md](../../basic-blockchain-simulator/docs/use-cases.md) |

---

## Conventions

- **Diagrams:** Mermaid in fenced code blocks.
- **Status tags:** each document starts with `Status:` + `Last updated:`.
- **ADR numbering:** `ADR-NNN-short-kebab-title.md`, monotonically increasing,
  never renumbered.
- **Links:** relative paths only, so docs render correctly in GitHub and in
  local Markdown previews.
