# ADR-002 — Pinia for State Management

- **Status:** Accepted
- **Date:** 2026-04-24
- **Deciders:** Tech Lead, Frontend Lead
- **Related:** ADR-001 (Vue over React), ADR-003 (Atomic Design)

---

## Context

The dashboard needs to manage several categories of state simultaneously:

1. **Canonical chain** (possibly hundreds of blocks; append-only under normal
   operation but subject to full replacement on consensus resolve).
2. **Mempool** (high-churn list of pending transactions, pushed over WebSocket).
3. **Node registry** (small list, mutated via REST).
4. **Metrics** (polled; time-series data for charts).
5. **Ephemeral UI state** (selected block, open dialog, form drafts).

State flows come from **both** REST responses **and** WebSocket events, and
stores must reconcile the two without race conditions (for example a
`block.mined` WS event arriving while `fetchChain()` is in flight).

The team wants:

- **End-to-end TypeScript** with zero `any` in stores.
- **Testable actions** (plain functions, mockable HTTP).
- **DevTools support** for time-travel during development.
- **Low ceremony** — adding a store should take minutes, not a PR review cycle.

---

## Decision

We will use **Pinia 2** as the single state-management library for all shared
client state. Component-local state remains in `ref`/`reactive` inside
`<script setup>`.

Store conventions:

- One store per backend resource (`useChainStore`, `useMempoolStore`,
  `useNodesStore`, `useMetricsStore`).
- Stores own the **HTTP + WS subscription** for their resource; views never
  import `api/` directly.
- Actions return `Promise<T>` and throw typed `ApiError` on failure; the UI
  catches and surfaces via PrimeVue Toast.
- State is never mutated outside actions (enforced via ESLint rule + code
  review).
- Cross-store effects use **watchers at the composable layer**, not direct
  store-to-store imports, to avoid circular dependencies.

---

## Alternatives Considered

### Vuex 4

- **Pros:** previous official solution; familiar to long-time Vue devs.
- **Cons:** mutations/actions/getters split is verbose; TypeScript inference
  is poor (namespaced modules are especially painful); officially superseded
  by Pinia since Vue 3.

### TanStack Query (vue-query)

- **Pros:** excellent server-cache semantics (staleTime, invalidation,
  background refetch); ideal for REST-heavy apps.
- **Cons:** the dashboard is **push-driven** via WebSocket for the two
  highest-churn resources (chain, mempool). Query-key invalidation on every
  WS event re-introduces the logic we wanted to avoid. Still useful for
  polled metrics, but not sufficient as the only state solution.

### Plain composables + `ref` / `reactive`

- **Pros:** no dependency; works.
- **Cons:** no DevTools; no standard place to centralise cross-view state;
  testing requires re-instantiating composables with care; no hydration
  story if SSR is added later.

### Zustand-style lightweight store (e.g. `@vueuse/shared createGlobalState`)

- **Pros:** minimal API.
- **Cons:** we would end up re-implementing Pinia action/getter ergonomics
  and DevTools integration.

---

## Rationale

1. **Native TypeScript inference.** `defineStore('chain', () => { ... })` with
   the setup syntax infers state, getters and actions without generic
   gymnastics.
2. **Composition-API native.** Stores are regular composables; they can call
   other composables (`useIntervalFn`, `useWebSocket`) directly.
3. **DevTools.** Vue DevTools shows state, actions and timeline out of the box.
4. **SSR-safe.** If we later adopt Nuxt 3, Pinia is the official state layer.
5. **Small and tree-shakeable** (about 1 KB gzip runtime).
6. **Coexists with TanStack Query** if we ever want server-cache semantics for
   REST-only resources — no rewrite required.

---

## Consequences

### Positive

- Uniform mental model: "one store per backend resource".
- Easy testing via `createPinia()` + `setActivePinia()` in Vitest.
- WebSocket handlers live next to the state they mutate, keeping causality
  local and reviewable.
- DevTools timeline accelerates debugging of race conditions between REST and
  WS paths.

### Negative / Trade-offs

- **No built-in server cache.** We hand-roll staleness logic (timestamps in
  each store) for polled resources. Acceptable given only `useMetricsStore`
  needs it today.
- **Discipline required.** Nothing in the framework prevents importing a store
  into an atom. Enforced by ESLint rule `no-restricted-imports` + code review.
- **Cross-store coupling risk.** Mitigated by moving cross-store logic into
  composables rather than store-to-store imports.

### Neutral

- Migration path off Pinia (unlikely) would still require rewriting actions —
  same as any other store library.

---

## Example (for reference)

```ts
// src/stores/chain.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Block } from '@/domain/block'
import { getChain } from '@/api/client'

export const useChainStore = defineStore('chain', () => {
  const chain = ref<Block[]>([])
  const loading = ref(false)

  const height = computed(() => chain.value.length)
  const lastBlock = computed(() => chain.value.at(-1) ?? null)

  async function fetchChain() {
    loading.value = true
    try {
      chain.value = await getChain()
    } finally {
      loading.value = false
    }
  }

  function appendBlock(block: Block) {
    // idempotent: ignore if already present (WS + REST race)
    if (chain.value.some((b) => b.hash === block.hash)) return
    chain.value.push(block)
  }

  return { chain, height, lastBlock, loading, fetchChain, appendBlock }
})
```

---

## Follow-ups

- Revisit if we add more than ~10 stores — at that point introduce store
  modules or adopt TanStack Query for REST-only resources.
- Evaluate `@pinia/colada` when it reaches stable for query-cache semantics
  without leaving the Pinia ecosystem.
