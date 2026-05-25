# Frontend API Reference

Status: Accepted
Last updated: 2026-05-25 (v0.9.0 — Phase 7 closed)
Scope: every HTTP / WebSocket endpoint consumed by
`basic-blockchain-frontend`, mapped to its `src/api/*.ts` module.

This document is the **frontend-side** contract. The authoritative server
contract lives in
[`basic-blockchain-simulator/docs/api-reference.md`](../../basic-blockchain-simulator/docs/api-reference.md);
this file documents only what the SPA actually calls.

---

## 1. Base URL & transport

- HTTP base URL: `import.meta.env.VITE_API_BASE_URL` (defaults to `/api/v1`
  via the Vite dev proxy).
- WebSocket: `import.meta.env.VITE_WS_URL` or
  `${scheme}://${host}/api/v1/ws`.
- All requests carry `X-Request-ID` (UUIDv4) and, when authenticated,
  `Authorization: Bearer <jwt>` (token read from `localStorage['bb_auth']`).
- Default request timeout: `10s`. Exceptions: `/mine_block` (120s),
  `/nodes/resolve` (60s).
- Error envelope: see `src/api/errors.ts` — `BlockchainApiError` with codes
  `UNAUTHORIZED`, `FORBIDDEN`, `RATE_LIMITED`, `BAD_REQUEST`, `NOT_FOUND`,
  `METHOD_NOT_ALLOWED`, `INTERNAL_ERROR`, `TIMEOUT`, `NETWORK_ERROR`,
  plus any server-provided `code`. On `401` the client clears
  `bb_auth` and hard-redirects to `/login`.

---

## 2. Endpoint catalog

### 2.1 Auth — `src/api/auth.ts`

| Method | Path             | Purpose                                    | Auth |
| ------ | ---------------- | ------------------------------------------ | ---- |
| POST   | `/auth/register` | Create a user (optional `country` ISO-2)   | —    |
| POST   | `/auth/activate` | Redeem activation code + set password      | —    |
| POST   | `/auth/login`    | Exchange credentials for JWT               | —    |
| GET    | `/auth/me`       | Current user profile (`kyc_level` exposed) | JWT  |

### 2.2 KYC (self) — `src/api/kyc.ts`

| Method | Path                  | Purpose                          | Auth |
| ------ | --------------------- | -------------------------------- | ---- |
| GET    | `/me/kyc/status`      | Caller's KYC level + docs        | JWT  |
| POST   | `/me/kyc/documents`   | Upload one document (base64)     | JWT  |
| POST   | `/me/kyc/review`      | Submit a target level for review | JWT  |

### 2.3 Wallets (self) — `src/api/wallets.ts`

| Method | Path                    | Purpose                                  | Auth |
| ------ | ----------------------- | ---------------------------------------- | ---- |
| POST   | `/wallets`              | Create wallet (legacy, single-shot)      | JWT  |
| POST   | `/wallets/preview`      | Generate draft + mnemonic (no commit)    | JWT  |
| POST   | `/wallets/confirm`      | Commit a previewed wallet                | JWT  |
| GET    | `/wallets/me`           | List caller's wallets                    | JWT  |
| POST   | `/transactions/signed`  | Submit a signed transfer (Ed25519)       | JWT  |

### 2.4 Mempool & confirmed txs — `src/api/mempool.ts`

| Method | Path                     | Purpose                              | Auth |
| ------ | ------------------------ | ------------------------------------ | ---- |
| GET    | `/transactions/pending`  | Pending transactions in the mempool  | —    |
| POST   | `/transactions`          | Submit an unsigned transaction       | —    |
| GET    | `/transactions`          | Confirmed transaction history        | —    |

### 2.5 Chain & mining — `src/api/chain.ts`, `src/api/mining.ts`

| Method | Path          | Purpose                          | Auth |
| ------ | ------------- | -------------------------------- | ---- |
| GET    | `/chain`      | Full chain snapshot              | —    |
| GET    | `/valid`      | Chain validity report            | —    |
| POST   | `/mine_block` | Trigger PoW mining (120s budget) | JWT  |

### 2.6 Nodes / consensus — `src/api/nodes.ts`

| Method | Path              | Purpose                                    | Auth |
| ------ | ----------------- | ------------------------------------------ | ---- |
| GET    | `/nodes`          | Registered peer nodes                      | —    |
| POST   | `/nodes/register` | Register one or more peer URLs             | JWT  |
| GET    | `/nodes/resolve`  | Run consensus (longest-chain, 60s budget)  | JWT  |

### 2.7 Currencies (public) — `src/api/wallets.ts::listCurrencies`

| Method | Path           | Purpose                       | Auth |
| ------ | -------------- | ----------------------------- | ---- |
| GET    | `/currencies`  | List currencies (`active=true` default) | — |

### 2.8 Health & metrics — `src/api/health.ts`

| Method | Path       | Purpose                                | Auth |
| ------ | ---------- | -------------------------------------- | ---- |
| GET    | `/health`  | `{status, db, chain_height}`           | —    |
| GET    | `/metrics` | `{chain_height, pending, avg_mine_s}`  | —    |

### 2.9 Admin — users (`src/api/admin.ts`)

| Method | Path                                       | Purpose                                  | Auth + role |
| ------ | ------------------------------------------ | ---------------------------------------- | ----------- |
| GET    | `/admin/users`                             | List users (enriched: KYC, country, …)   | ADMIN       |
| POST   | `/admin/users/:userId/roles`               | `{action: 'grant'\|'revoke', role}`      | ADMIN       |
| POST   | `/admin/users/:userId/ban`                 | Ban user                                 | ADMIN       |
| POST   | `/admin/users/:userId/unban`               | Unban user                               | ADMIN       |
| POST   | `/admin/users/:userId/permissions`         | `{action: 'grant'\|'revoke', permission}`| ADMIN       |
| PATCH  | `/admin/users/:userId`                     | Update `display_name` / `email`          | ADMIN       |
| DELETE | `/admin/users/:userId`                     | Soft-delete (freezes wallets)            | ADMIN       |
| POST   | `/admin/users/:userId/restore`             | `{unfreeze_wallets: bool}` (default true)| ADMIN       |

### 2.10 Admin — wallets

| Method | Path                                  | Purpose                              | Auth + role |
| ------ | ------------------------------------- | ------------------------------------ | ----------- |
| GET    | `/admin/wallets`                      | All wallets + USD aggregation        | ADMIN       |
| POST   | `/admin/wallets/:walletId/freeze`     | Freeze a wallet                      | ADMIN       |
| POST   | `/admin/wallets/:walletId/unfreeze`   | Unfreeze a wallet                    | ADMIN       |
| POST   | `/admin/mint`                         | Mint into a wallet (legacy single-sign) | ADMIN    |

### 2.11 Admin — currencies & treasury

| Method | Path                                            | Purpose                                       | Auth + role |
| ------ | ----------------------------------------------- | --------------------------------------------- | ----------- |
| GET    | `/admin/currencies`                             | List currencies (`?active=true`)              | ADMIN       |
| POST   | `/admin/currencies`                             | Create currency                               | ADMIN       |
| POST   | `/admin/treasury`                               | Create a treasury wallet for a currency       | ADMIN       |
| POST   | `/admin/treasury/distribute`                    | **Initiate** dual-sign treasury distribution  | ADMIN       |
| POST   | `/admin/treasury/distribute/:opId/approve`      | **Approve** (second signer) — executes ops    | ADMIN       |
| POST   | `/admin/treasury/distribute/:opId/cancel`       | **Cancel** a pending distribution             | ADMIN       |

> Treasury distribution + dual-sign mint are wired through
> `TreasuryApprovalFlow` (Phase 7.8). The flow stays in `pending_approval`
> until a second admin approves; either admin can cancel.

### 2.12 Admin — exchange rates

| Method | Path                                         | Purpose                                  | Auth + role |
| ------ | -------------------------------------------- | ---------------------------------------- | ----------- |
| GET    | `/admin/exchange-rates`                      | List rates (`from`, `to`, `limit` params)| ADMIN       |
| PUT    | `/admin/exchange-rates/:from/:to`            | Upsert a rate (`{rate, fee_rate?}`)      | ADMIN       |
| POST   | `/admin/exchange-rates/sync`                 | Pull rates from provider (Binance, …)    | ADMIN       |

### 2.13 Admin — audit log

| Method | Path             | Purpose                                                                                       | Auth + role |
| ------ | ---------------- | --------------------------------------------------------------------------------------------- | ----------- |
| GET    | `/admin/audit`   | Audit entries (`limit`, `action`, `actor_id`, `target_id`, `severity`, `since=1h\|24h\|7d\|30d`) | ADMIN       |

Server returns canonical `severity ∈ {critical, warning, info}` (BR-AD-10).

### 2.14 Admin — dashboard (Phase 6e)

| Method | Path                     | Purpose                                                                             | Auth + role |
| ------ | ------------------------ | ----------------------------------------------------------------------------------- | ----------- |
| GET    | `/admin/stats`           | Platform stats; `?compare=7d\|30d` returns `{current, previous, delta_abs, delta_pct}` | ADMIN    |
| GET    | `/admin/volume`          | `?range=30d\|90d\|1y`, optional `bucket=day\|week` — USD volume series              | ADMIN       |
| GET    | `/admin/movements/top`   | `?range=24h\|7d\|30d`, `limit ∈ [1,50]` — top movements by USD                       | ADMIN       |

### 2.15 Admin — KYC review (Phase 6g-admin)

| Method | Path                                                       | Purpose                            | Auth + permission |
| ------ | ---------------------------------------------------------- | ---------------------------------- | ----------------- |
| GET    | `/admin/kyc/pending`                                       | Pending-review queue, oldest first | `REVIEW_KYC`      |
| POST   | `/admin/kyc/users/:userId/documents/:docKey/approve`       | Approve one document               | `REVIEW_KYC`      |
| POST   | `/admin/kyc/users/:userId/documents/:docKey/reject`        | Reject + `{reason}`; aborts review | `REVIEW_KYC`      |
| POST   | `/admin/kyc/users/:userId/promote`                         | Promote to current pending target  | `REVIEW_KYC`      |

`docKey ∈ {dni, selfie, address, funds}`.

---

## 3. WebSocket — `src/api/websocket.ts`

`GET /api/v1/ws` — single channel, JSON frames. Today the frontend only
parses the `block_mined` event:

```json
{
  "event": "block_mined",
  "block": { "index": 42, "timestamp": "...", "transactions": [...],
             "proof": 12345, "previous_hash": "...", "merkle_root": "..." }
}
```

Reconnection: VueUse `useWebSocket` with 10 retries × 3000ms. Parse errors
are surfaced through `lastError` in `useBlockchainWebSocket`.

---

## 4. Auth & permission matrix (frontend perspective)

| Role     | What unlocks                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------- |
| (none)   | `/auth/*`, public `/chain`, `/transactions*`, `/health`, `/metrics`, `/currencies`, `/nodes`    |
| USER     | All above + `/wallets/*`, `/me/kyc/*`, `/mine_block`, signed transfers                          |
| OPERATOR | USER + audit / dashboard reads (subset of `/admin/*` reads — gated by permission, not role)     |
| ADMIN    | Everything above + every `/admin/*` route                                                       |

Permissions (e.g. `REVIEW_KYC`) are orthogonal to roles and granted per-user
via `/admin/users/:userId/permissions`.

---

## 5. See also

- Postman: [`postman/basic-blockchain.postman_collection.json`](postman/basic-blockchain.postman_collection.json)
- Postman environments: [`postman/local.postman_environment.json`](postman/local.postman_environment.json),
  [`postman/staging.postman_environment.json`](postman/staging.postman_environment.json)
- Backend contract: [`../../basic-blockchain-simulator/docs/api-reference.md`](../../basic-blockchain-simulator/docs/api-reference.md)
- Architecture: [`architecture.md`](architecture.md) — HTTP / WS lifecycle, error mapping, store wiring.
