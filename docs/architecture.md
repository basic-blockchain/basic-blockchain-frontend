# Frontend Architecture — Basic Blockchain Simulator Dashboard

Status: Accepted
Last updated: 2026-04-24
Audience: Frontend engineers, tech leads, SRE, DevSecOps

---

## 1. Overview

### 1.1 Purpose

The **Basic Blockchain Frontend** is a real-time dashboard that visualises and
interacts with the [Basic Blockchain Simulator](../../basic-blockchain-simulator/) backend.
It provides:

- Live view of the canonical chain (blocks, transactions, metadata).
- Mempool monitoring with pending-transaction feed.
- Mining trigger with rate-limit awareness.
- Node-registry and consensus (longest-chain) visualisation.
- Health, metrics and latency telemetry.

The frontend is a **single-page application (SPA)** that communicates with the
backend through:

- **REST** (`/api/*`) for commands and queries.
- **WebSocket** (`/ws`) for chain and mempool change events.

### 1.2 Tech Stack

| Layer               | Technology           | Version | Role                                                     |
|---------------------|----------------------|---------|----------------------------------------------------------|
| Framework           | Vue                  | 3.x     | Reactive UI, Composition API                             |
| Build tool          | Vite                 | 6.x     | Dev server, HMR, production bundler                      |
| Language            | TypeScript           | 5.x     | Static types across domain, api, stores and components   |
| State               | Pinia                | 2.x     | Store-based state management                             |
| Utilities           | VueUse               | 11.x    | Composable primitives (useWebSocket, useIntervalFn, ...) |
| UI kit              | PrimeVue             | 4.x     | Accessible components (DataTable, Toast, Dialog, ...)    |
| Charts              | Chart.js             | 4.x     | Mining throughput, latency, mempool depth                |
| Routing             | Vue Router           | 4.x     | Client-side routing                                      |
| HTTP                | Axios                | 1.x     | REST client with interceptors                            |
| Tests               | Vitest + Vue TL      | 2.x     | Unit and component tests (>= 80% coverage)               |

### 1.3 Key Principle: Backend Mirroring

The frontend **deliberately mirrors the backend layering**:

```
backend/                      frontend/
api/           ------>        src/api/         (HTTP + WS clients)
domain/        ------>        src/domain/      (types, validation, pure logic)
persistence/                  (n/a — state in Pinia)
repository/    ------>        src/stores/      (reactive caches, actions)
```

This symmetry makes it trivial for a backend engineer to find the frontend
counterpart of any module and vice versa. Domain invariants (e.g. BR-TX-*) are
enforced both client-side (fast UX feedback) and server-side (authoritative).

---

## 2. Layered Architecture

```mermaid
flowchart TB
    subgraph Browser["Browser (SPA)"]
        V["Views<br/>(DashboardView, ChainView, ...)"]
        C["Composables<br/>(useBlockchainWs, useMining, useToast)"]
        S["Stores (Pinia)<br/>(useChainStore, useMempoolStore, useNodesStore, useMetricsStore)"]
        A["API Clients<br/>(src/api/client.ts, websocket.ts)"]
        D["Domain<br/>(src/domain/block.ts, transaction.ts, validation)"]
    end

    subgraph Backend["Backend (FastAPI)"]
        REST["REST /api/*"]
        WS["WebSocket /ws"]
    end

    V --> C
    C --> S
    S --> A
    S --> D
    V -.uses types.-> D
    A -->|HTTP| REST
    A -->|WS| WS
    WS -.events.-> A
```

**Rules:**

- Views never talk to `api/` directly — always through a store or composable.
- Stores are the only layer allowed to mutate client-side state.
- `domain/` is pure (no I/O), fully unit-testable, shared with `stores/` and views.
- `api/` converts DTOs to/from domain objects and normalises error envelopes.

---

## 3. Component Tree

```mermaid
flowchart TB
    App["App.vue"]
    Router["RouterView"]
    App --> Router

    Router --> Dash["DashboardView"]
    Router --> Chain["ChainView"]
    Router --> Mem["MempoolView"]
    Router --> Nodes["NodesView"]
    Router --> Health["HealthView"]

    Dash --> MB["MetricsBar (organism)"]
    Dash --> MC["MiningChart (organism)"]
    Dash --> MBtn["MineButton (organism)"]

    Chain --> CL["ChainList (organism)"]
    CL --> BC["BlockCard (molecule)"]
    BC --> HC["HashChip (atom)"]
    BC --> SB["StatusBadge (atom)"]

    Mem --> MT["MempoolTable (organism)"]
    MT --> TR["TransactionRow (molecule)"]
    TR --> AD["AmountDisplay (atom)"]
    TR --> HC2["HashChip (atom)"]

    Nodes --> NP["NodePanel (organism)"]
    NP --> NB["NodeBadge (molecule)"]
    NB --> SB2["StatusBadge (atom)"]

    Health --> MT2["MetricTile (molecule)"]
```

---

## 4. Backend to Frontend Mapping

| Backend module                              | Frontend counterpart                                   | Notes                                                           |
|---------------------------------------------|--------------------------------------------------------|-----------------------------------------------------------------|
| `domain/models.py` (Block, Transaction)     | `src/domain/block.ts`, `src/domain/transaction.ts`     | TypeScript mirrors of Python dataclasses.                       |
| `domain/validation.py`                      | `src/domain/transaction.ts` (`validateTransaction`)    | Client-side BR-TX-* checks before POST.                         |
| `domain/blockchain.py` (`BlockchainService`) | `src/stores/chain.ts` (`useChainStore`)               | Holds canonical chain, height, last block.                      |
| `domain/mempool.py`                         | `src/stores/mempool.ts` (`useMempoolStore`)            | Pending tx list + submit action.                                |
| `domain/node_registry.py`                   | `src/stores/nodes.ts` (`useNodesStore`)                | Peer list, register/resolve actions.                            |
| `api/websocket_hub.py`                      | `src/api/websocket.ts` + `composables/useBlockchainWs` | VueUse `useWebSocket` with reconnection.                        |
| `api/rate_limit.py`                         | `src/components/organisms/MineButton.vue`              | Reads `Retry-After` header on HTTP 429 and disables button.     |
| `api/errors.py` (error envelope)            | `src/api/client.ts` (axios interceptor)                | Normalises `{code, message, details}` into typed `ApiError`.    |
| `scripts/serve_api.py` routes               | `src/api/endpoints.ts`                                 | Single source of truth for URL paths.                           |

---

## 5. Data Flow Diagrams

### 5.1 Block Mined (WebSocket push)

```mermaid
sequenceDiagram
    autonumber
    participant BE as Backend (BlockchainService)
    participant WS as WebSocket Hub
    participant CL as src/api/websocket.ts
    participant CP as useBlockchainWs
    participant ST as useChainStore
    participant UI as ChainList / BlockCard

    BE->>WS: broadcast block.mined event
    WS-->>CL: {type: block.mined, payload: ...}
    CL->>CP: onMessage(event)
    CP->>ST: appendBlock(block)
    ST-->>UI: reactive update (chain[])
    UI-->>UI: render new BlockCard
```

### 5.2 Transaction Submission

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant MV as MempoolView
    participant MS as useMempoolStore
    participant DV as validateTransaction (domain)
    participant AX as axios client
    participant BE as POST /api/transactions

    U->>MV: fill form + submit
    MV->>MS: submitTransaction(dto)
    MS->>DV: validateTransaction(dto)
    alt invalid
        DV-->>MS: ValidationError
        MS-->>MV: reject(error) -> toast
    else valid
        DV-->>MS: ok
        MS->>AX: POST /api/transactions
        AX->>BE: HTTP
        BE-->>AX: 201 {tx_id}
        AX-->>MS: TransactionCreated
        MS->>MS: fetchPending()
        MS-->>MV: success toast
    end
```

### 5.3 Consensus Resolve

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant NV as NodesView
    participant NS as useNodesStore
    participant CS as useChainStore
    participant BE as GET /api/nodes/resolve

    U->>NV: click Resolve
    NV->>NS: resolve()
    NS->>BE: GET /api/nodes/resolve
    BE-->>NS: {replaced: boolean, chain?: [...]}
    alt replaced = true
        NS->>CS: fetchChain()
        CS-->>NV: chain updated
    else replaced = false
        NS-->>NV: no change (toast chain authoritative)
    end
```

---

## 6. State Management — Pinia Stores

```mermaid
classDiagram
    class useChainStore {
        +chain
        +height
        +lastBlock
        +loading
        +fetchChain()
        +appendBlock(b)
        +reset()
    }
    class useMempoolStore {
        +pending
        +submitting
        +fetchPending()
        +submitTransaction(dto)
        +removeConfirmed(ids)
    }
    class useNodesStore {
        +peers
        +registering
        +register(url)
        +resolve()
        +fetchPeers()
    }
    class useMetricsStore {
        +health
        +latencyMs
        +mempoolDepth
        +miningRate
        +tick()
        +startPolling()
        +stopPolling()
    }

    class apiClient
    class websocketClient

    useChainStore --> apiClient
    useChainStore --> websocketClient
    useMempoolStore --> apiClient
    useMempoolStore --> websocketClient
    useNodesStore --> apiClient
    useMetricsStore --> apiClient
    useNodesStore ..> useChainStore : triggers fetchChain()
    useChainStore ..> useMempoolStore : removeConfirmed() on block.mined
```

**State responsibilities:**

- `useChainStore` — authoritative client-side mirror of the chain; listens to
  `block.mined` WS events and appends.
- `useMempoolStore` — pending transactions; reacts to `tx.added` and `tx.confirmed`.
- `useNodesStore` — peer registry + consensus trigger; may cascade into
  `useChainStore.fetchChain()` on chain replacement.
- `useMetricsStore` — polled every 5 s via `useIntervalFn`; powers `MetricsBar`
  and `MiningChart`.

---

## 7. Atomic Design Hierarchy

```mermaid
flowchart LR
    subgraph Atoms
        A1[StatusBadge]
        A2[HashChip]
        A3[AmountDisplay]
    end
    subgraph Molecules
        M1[BlockCard]
        M2[TransactionRow]
        M3[NodeBadge]
        M4[MetricTile]
    end
    subgraph Organisms
        O1[ChainList]
        O2[MempoolTable]
        O3[NodePanel]
        O4[MetricsBar]
        O5[MineButton]
        O6[MiningChart]
    end
    subgraph Views
        V1[DashboardView]
        V2[ChainView]
        V3[MempoolView]
        V4[NodesView]
        V5[HealthView]
    end

    A1 --> M1
    A1 --> M3
    A2 --> M1
    A2 --> M2
    A3 --> M2
    M1 --> O1
    M2 --> O2
    M3 --> O3
    M4 --> O4
    O1 --> V2
    O2 --> V3
    O3 --> V4
    O4 --> V1
    O5 --> V1
    O6 --> V1
    M4 --> V5
```

**Hard rules:**

- Atoms have **no dependencies on stores** — pure presentational, props in, emits out.
- Molecules may compose atoms but still no store access.
- Organisms are the **first layer allowed to call useXxxStore()**.
- Views orchestrate organisms and routing params.

---

## 8. WebSocket Connection Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Connecting : useBlockchainWs() mounted
    Connecting --> Open : onopen
    Connecting --> Closed : network error
    Open --> Receiving : onmessage
    Receiving --> Open : dispatched to store
    Open --> Closing : onclose (server/client)
    Closing --> Reconnecting : auto (VueUse backoff)
    Reconnecting --> Connecting : retry (exp backoff, max 30s)
    Closed --> Reconnecting : auto
    Open --> [*] : component unmount
    Reconnecting --> [*] : component unmount
```

- Reconnection is handled by VueUse `useWebSocket` with `autoReconnect`
  (retries: Infinity, delay: 1000, exponential).
- On each reconnect `useChainStore.fetchChain()` is called to reconcile any
  events missed while offline (idempotent; backend returns canonical chain).

---

## 9. Environment Configuration

| Variable              | Default (dev)              | Default (prod)         | Purpose                                    |
|-----------------------|----------------------------|------------------------|--------------------------------------------|
| `VITE_API_BASE_URL`   | `/api` (via Vite proxy)    | `https://host/api`     | Base URL for REST calls.                   |
| `VITE_WS_URL`         | `ws://localhost:5173/ws`   | `wss://host/ws`        | WebSocket endpoint.                        |
| `VITE_POLL_INTERVAL`  | `5000`                     | `5000`                 | Metrics polling period (ms).               |
| `VITE_LOG_LEVEL`      | `debug`                    | `warn`                 | Console log verbosity.                     |
| `VITE_APP_VERSION`    | from `package.json`        | from `package.json`    | Displayed in footer; injected at build.    |

Override via `.env.local` (dev) or runtime `window.__ENV__` (prod, injected by
container entrypoint). See `src/config/env.ts`.

---

## 10. CI/CD Pipeline

### 10.1 ci.yml — pull request + push

```
install  ->  lint  ->  typecheck  ->  test (coverage >= 80%)  ->  build  ->  audit
```

- `install` — `npm ci` with cache key `package-lock.json`.
- `lint` — ESLint + Prettier check.
- `typecheck` — `vue-tsc --noEmit`.
- `test` — Vitest with `--coverage` (thresholds: 80% lines/branches/functions).
- `build` — `vite build`; artifact uploaded.
- `audit` — `npm audit --omit=dev --audit-level=high`.

### 10.2 sast.yml — security scans

- Runs on pushes to `develop` and `main`, and weekly.
- **Semgrep** with `p/owasp-top-ten` and `p/javascript` rulesets.
- **CodeQL** for JavaScript/TypeScript.
- Fails the build on any high-severity finding.

### 10.3 release.yml — tag-triggered

- Triggered by `push` of a tag matching `v*`.
- Builds production artifact, generates `CHANGELOG.md` delta, creates GitHub
  release with the build zipped, and publishes a Docker image tagged with the
  SemVer version.
- Annotated tags only (`git tag -a vX.Y.Z -m "..."`).

---

## 11. Design Decisions (ADR summary)

Full ADRs live under `decisions/`.

| ID      | Title                                     | Rationale (short)                                                                                       |
|---------|-------------------------------------------|---------------------------------------------------------------------------------------------------------|
| ADR-001 | Vue 3 over React                          | Reactivity model fits real-time chain state; single-file components keep presentational+logic cohesive. |
| ADR-002 | Pinia over Vuex / Tanstack Query          | Simpler TypeScript inference, Composition-API native, ergonomic for both sync stores and async actions. |
| ADR-003 | Atomic Design                             | Scales from PoC to production without structural rewrites; clear testing boundaries per layer.          |
| -       | VueUse useWebSocket                       | Built-in reconnection with backoff eliminates hand-rolled retry logic and its edge cases.               |
| -       | Vite dev proxy for /api and /ws           | Avoids CORS in development; production uses same-origin reverse proxy.                                  |
| -       | Client-side validation mirroring BR-TX-*  | Instant user feedback without a round-trip; backend remains authoritative.                              |
| -       | PrimeVue as UI kit                        | Accessible, themeable, batteries-included DataTable/Toast/Dialog.                                       |
| -       | Chart.js over D3                          | Zero-config for the chart set we need (line/bar); lower bundle cost than D3.                            |

---

## 12. Repository Layout (target)

```
basic-blockchain-frontend/
  docs/
    architecture.md        (this file)
    components.md
    index.md
    decisions/
      ADR-001-vue-over-react.md
      ADR-002-pinia-state.md
      ADR-003-atomic-design.md
  src/
    api/              (client.ts, websocket.ts, endpoints.ts)
    domain/           (block.ts, transaction.ts, validation.ts, node.ts)
    stores/           (chain.ts, mempool.ts, nodes.ts, metrics.ts)
    composables/      (useBlockchainWs.ts, useMining.ts, useToast.ts)
    components/
      atoms/
      molecules/
      organisms/
    views/
    router/
    config/
    App.vue
    main.ts
  tests/
    unit/
    component/
  public/
  .env.example
  vite.config.ts
  tsconfig.json
  package.json
  README.md
```

---

## 13. References

- Backend architecture: `../../basic-blockchain-simulator/docs/architecture.md`
- Backend API reference: `../../basic-blockchain-simulator/docs/api-reference.md`
- Backend business rules: `../../basic-blockchain-simulator/docs/business-rules.md`
- Vue 3: https://vuejs.org/
- Pinia: https://pinia.vuejs.org/
- VueUse: https://vueuse.org/
- PrimeVue: https://primevue.org/
