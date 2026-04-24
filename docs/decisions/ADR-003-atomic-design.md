# ADR-003 — Atomic Design for Component Organisation

- **Status:** Accepted
- **Date:** 2026-04-24
- **Deciders:** Tech Lead, Frontend Lead, UX Lead
- **Related:** ADR-001 (Vue), ADR-002 (Pinia)

---

## Context

The project starts as a small dashboard (5 views, about 20 components) but is
expected to grow into an enterprise-grade blockchain console in later phases
(Web4, multi-tenant, role-based dashboards). We need a component-organisation
strategy that:

- **Scales from PoC to production** without mid-project restructuring.
- Defines **clear testing boundaries** (pure vs impure components).
- Makes it obvious **where new components belong** so contributors do not
  invent ad-hoc folders.
- Aligns with the backend layered architecture so reviewers can reason
  about data flow end-to-end.
- Allows designers and engineers to share vocabulary.

---

## Decision

We adopt **Atomic Design** (Brad Frost) with four active tiers inside
`src/components/` plus views under `src/views/`:

```
src/components/
  atoms/         (pure primitives: StatusBadge, HashChip, AmountDisplay)
  molecules/     (simple compositions: BlockCard, TransactionRow, ...)
  organisms/     (store-aware, side-effectful: ChainList, MempoolTable, ...)
src/views/       (route targets: DashboardView, ChainView, ...)
```

We **skip templates** (the original fifth tier of Atomic Design) because
Vue RouterView + view components already fill that role.

### Hard rules (enforced by ESLint + review)

1. **Atoms** never import stores, composables that call stores, or `api/*`.
2. **Molecules** never import stores. They may import other molecules/atoms.
3. **Organisms** are the **first layer** allowed to call `useXxxStore()` and
   composables with side effects (`useWebSocket`, `useIntervalFn`).
4. **Views** orchestrate organisms and read route params; they should contain
   little logic beyond layout and route handling.
5. Dependency direction is **bottom-up only**. An atom cannot import a
   molecule. A molecule cannot import an organism. This is enforced via
   `eslint-plugin-boundaries`.

---

## Alternatives Considered

### Feature-sliced design (FSD)

- **Pros:** organises by business feature (`features/mining`, `features/chain`).
- **Cons:** overkill for a 5-view dashboard; encourages duplication of small
  primitives across features. Worth revisiting once we exceed about 50 components
  or introduce RBAC or feature flags.

### Flat `src/components/` folder

- **Pros:** zero ceremony.
- **Cons:** breaks down past about 20 files; new contributors have no guidance
  on where to add components; review cycles slow down.

### Domain-driven folders (`src/components/chain/`, `src/components/mempool/`)

- **Pros:** mirrors backend domain.
- **Cons:** primitives (StatusBadge, HashChip) get duplicated or awkwardly
  shared. Does not encode the **purity** boundary we care about (no-store vs
  store-aware).

### Storybook-only organisation

- Not an alternative — orthogonal. We may add Storybook on top of Atomic
  Design later.

---

## Rationale

1. **Scales predictably.** Adding a new feature usually means: 0-2 new atoms,
   1-3 new molecules, 1 organism, 1 view. The folder for each is obvious.
2. **Encodes the purity boundary.** The "no stores below organisms" rule maps
   one-to-one to test strategy: atoms/molecules get **unit tests** (fast, no
   Pinia); organisms get **component tests** (with `createPinia()`); views
   get **integration tests** (with router + mocked API).
3. **Shared vocabulary with design.** Designers think in "cards, rows,
   tables, panels"; Atomic Design gives engineers the same words.
4. **Low migration cost if we later adopt FSD.** Atoms/molecules move
   unchanged to `shared/ui`; organisms become feature slices.

---

## Consequences

### Positive

- Onboarding doc fits on one page ("where do I put my new component?").
- ESLint boundary rules catch architectural drift at PR time, not months
  later.
- Storybook (if introduced) maps trivially: one section per tier.
- Testing strategy is crisp and automatable: coverage thresholds per tier.

### Negative / Trade-offs

- **Classification debates.** "Is this a molecule or an organism?" can
  consume review time. Mitigation: default to organism the moment a component
  reads from a store.
- **Deeper folder nesting** than flat layouts; IDE navigation is fine but
  `cd`-based workflows pay a small cost.
- **Risk of over-abstraction** (atoms created speculatively). Mitigation:
  create atoms only when a primitive is reused in **two or more** molecules.

### Neutral

- Bundle size is unaffected; Vite tree-shakes unused components regardless of
  folder layout.

---

## Testing Matrix

| Tier      | Test type          | Framework                                  | Store required | Target coverage |
|-----------|--------------------|--------------------------------------------|----------------|-----------------|
| Atoms     | Unit               | Vitest                                     | No             | 90%             |
| Molecules | Unit + snapshot    | Vitest + @vue/test-utils                   | No             | 85%             |
| Organisms | Component          | Vitest + @vue/test-utils + Pinia (testing) | Yes (mocked)   | 80%             |
| Views     | Integration        | Vitest + router + MSW                      | Yes            | 70%             |

Global floor: **80% lines/branches/functions** across `src/`.

---

## Follow-ups

- Revisit when the app grows past about 50 components or introduces feature
  flags / RBAC — at that point evaluate migrating to Feature-Sliced Design with
  `shared/ui/` housing today's atoms/molecules.
- Add a Storybook package in a later phase; one story file co-located per
  component.
