# ADR-001 — Vue 3 over React for the Blockchain Dashboard

- **Status:** Accepted
- **Date:** 2026-04-24
- **Deciders:** Tech Lead, Frontend Lead
- **Related:** ADR-002 (Pinia), ADR-003 (Atomic Design)

---

## Context

The Basic Blockchain Simulator needs a real-time dashboard that:

- Reflects a **continuously changing chain** and mempool with sub-second latency.
- Is **maintainable by a small team** (1-3 engineers) while keeping the option
  to scale to enterprise-grade features (Web4, multi-tenant) in later phases.
- Ships with a **batteries-included UI kit** so the team can focus on domain
  visuals rather than primitives.
- Mirrors the backend layered architecture (`api/`, `domain/`, `repository/`)
  so developers can move between stacks with minimal friction.
- Enforces **TypeScript end-to-end**, including in templates.

The two final candidates were:

1. **React 18 + Vite + Zustand + TanStack Query + MUI**
2. **Vue 3 + Vite + Pinia + VueUse + PrimeVue**

Both are production-proven. The decision below is driven by fit for this
particular product, not a general preference.

---

## Decision

We will build the frontend with **Vue 3 (Composition API) + Vite + TypeScript**.

Supporting libraries chosen as part of this decision:

- **Pinia** for state (see ADR-002).
- **VueUse** for `useWebSocket`, `useIntervalFn`, `useStorage`, etc.
- **PrimeVue 4** as the UI component kit.
- **Vue Router 4** for client routing.
- **Chart.js** (via `vue-chartjs`) for charts.

---

## Rationale

1. **Reactivity model fits real-time state.** Vue fine-grained reactivity
   (Proxy-based) updates only the components that read a given field. For a
   ticker-style UI where the mempool and chain change many times per second,
   this yields fewer wasted re-renders than React reference-equality model,
   without `memo` / `useMemo` / `useCallback` gymnastics.

2. **Single-file components keep presentation and logic cohesive.** A `.vue`
   file bundles template, script setup and scoped style into one unit. For
   the Atomic Design hierarchy (see ADR-003) this makes atoms and molecules
   trivially portable and reviewable.

3. **First-class TypeScript in templates.** Since Vue 3.3+, template
   expressions are type-checked via `vue-tsc`. `defineProps<T>()` and
   `defineEmits<T>()` give full inference with zero runtime cost.

4. **VueUse eliminates hand-rolled plumbing.** `useWebSocket` gives us
   exponential-backoff reconnection out of the box — critical for a dashboard
   that must survive transient backend restarts during simulation.

5. **PrimeVue covers our component surface.** DataTable, Toast, Dialog,
   Chart, InputNumber with locale-aware formatting — all accessible and
   themeable — cover more than 90 percent of the screens without extra
   dependencies.

6. **Smaller cognitive surface for a small team.** Vue opinionated defaults
   (one store pattern, one reactivity primitive) reduce the number of micro-
   decisions per feature compared to the React ecosystem multi-vendor
   landscape (Redux vs Zustand vs Jotai vs Recoil, TanStack vs SWR, etc.).

7. **Build performance.** Vite is the reference build tool for Vue; HMR is
   near-instant even with several hundred components.

---

## Alternatives Considered

### React 18 + Zustand + TanStack Query

- **Pros:** largest ecosystem, more hiring liquidity, JSX power.
- **Cons:** requires stitching state (Zustand) + server-cache (TanStack) +
  WebSocket handling (custom) + forms (react-hook-form) into a coherent whole;
  templates are not type-checked the same way; more boilerplate around
  memoisation for high-frequency updates.

### Svelte 5

- **Pros:** excellent DX, signals reactivity, small bundle.
- **Cons:** smaller UI-kit ecosystem; PrimeVue-equivalent (Skeleton) is less
  mature; team has no Svelte experience.

### Angular 17

- **Pros:** opinionated, enterprise-ready.
- **Cons:** over-engineered for a small dashboard; DI + NgModules friction
  not justified; steeper ramp-up for contributors.

---

## Consequences

### Positive

- Fast time-to-first-feature (scaffold to working dashboard in days, not weeks).
- Lower bug surface on real-time paths thanks to fine-grained reactivity.
- Unified documentation path: backend `domain/` to frontend `src/domain/` with
  the same vocabulary.
- Straightforward SSR upgrade path via Nuxt 3 if needed later.

### Negative / Trade-offs

- **Smaller hiring pool** in some regions compared to React. Mitigation: Vue 3
  is familiar to any modern JS developer; internal onboarding takes less than
  one week.
- **Fewer off-the-shelf enterprise components** (charts aside, Vue ecosystem
  is shallower than React for exotic widgets). Mitigation: PrimeVue covers
  current needs; we can wrap any React lib via `veaury` if a gap appears.
- **Team context-switching cost** if engineers also maintain a React product.
  Mitigation: Composition API idioms translate cleanly to and from React hooks.

### Neutral

- Build output and deployment are identical to any other SPA: static files
  served by Nginx, Caddy or any CDN.

---

## Follow-ups

- ADR-002: state-management choice within the Vue ecosystem (Pinia).
- ADR-003: component organisation (Atomic Design).
- Revisit this ADR if: team grows past 8 engineers, or the product pivots to
  a heavy content-focused SSR site (in which case Nuxt or a React meta-
  framework should be re-evaluated).
