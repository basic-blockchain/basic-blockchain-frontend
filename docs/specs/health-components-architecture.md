# Health view — Components section: architecture proposal

Status: Proposal  
Last updated: 2026-05-29  
Scope: `HealthView.vue` › "Componentes" panel; `GET /health`; `src/domain/metrics.ts`

---

## Problem

The "Componentes" table in `HealthView` is entirely hardcoded (version string,
port, service names, badge values). Any real node state divergence (version
bump, port change, degraded sub-service) is invisible to the operator.

---

## Proposed backend contract

Extend `GET /health` to include a `components` array:

```jsonc
{
  "status": "ok",
  "db": "ok",
  "chain_height": 412,
  "components": [
    {
      "id": "node",
      "label": "Node (Python · Quart)",
      "meta": "v0.4.2 · port 5000",
      "status": "ok"          // "ok" | "degraded" | "error" | "n/a"
    },
    {
      "id": "db",
      "label": "Database (PostgreSQL)",
      "meta": "chain · 3 TX · 4 conns",
      "status": "ok"
    },
    {
      "id": "mempool_relay",
      "label": "Mempool relay",
      "meta": "broadcast to peers",
      "status": "ok"
    },
    {
      "id": "block_validator",
      "label": "Block validator",
      "meta": "re-validation every 5 min",
      "status": "ok"
    }
  ]
}
```

Fields per component:

| Field    | Type                                    | Required | Notes                               |
| -------- | --------------------------------------- | -------- | ----------------------------------- |
| `id`     | `string`                                | yes      | Stable identifier, no spaces        |
| `label`  | `string`                                | yes      | Human-readable name                 |
| `meta`   | `string`                                | no       | Version, port, or short descriptor  |
| `status` | `"ok"\|"degraded"\|"error"\|"n/a"` | yes      | Same vocabulary as top-level status |

---

## Frontend changes

### 1. Domain model — `src/domain/metrics.ts`

```ts
export interface ComponentStatus {
  id: string
  label: string
  meta?: string
  status: 'ok' | 'degraded' | 'error' | 'n/a'
}

export interface Health {
  status: 'ok' | 'degraded'
  db: 'ok' | 'error' | 'n/a'
  chainHeight: number
  components?: ComponentStatus[]   // optional until backend ships it
}
```

### 2. API mapping — `src/api/health.ts`

Map `response.components` (snake_case from server) onto the typed array.
No change to the URL or auth scope.

### 3. Store — `src/stores/metrics.ts`

No structural change needed. `health.components` is surfaced as-is through
the existing `health` ref.

### 4. View — `src/views/HealthView.vue`

Replace the hardcoded `kvs-row` block with a `v-for` over
`store.health?.components`. Fall back to the current static rows when
`components` is absent (backend not yet upgraded):

```vue
<template v-if="store.health?.components?.length">
  <div v-for="c in store.health.components" :key="c.id" class="kvs-row">
    <div class="kvs-key">{{ c.label }}</div>
    <div class="kvs-val">{{ c.meta ?? '—' }}</div>
    <div class="kvs-badge">
      <BaseBadge :tone="healthTone(c.status)">{{ healthLabel(c.status) }}</BaseBadge>
    </div>
  </div>
</template>
<template v-else>
  <!-- current static rows as fallback -->
</template>
```

---

## Rollout

1. Backend ships `GET /health` with `components[]` (no breaking change —
   field is additive).
2. Frontend PR: extend `Health` interface + update `HealthView` (fallback
   keeps current behaviour until backend is deployed).
3. Remove static fallback rows in the next cleanup cycle once all environments
   run the new backend.

---

## Out of scope

- Audit log pagination (`offset` param) — tracked separately in `AuditParams`.
- WebSocket push for component health — future; polling every 3 s is sufficient.
