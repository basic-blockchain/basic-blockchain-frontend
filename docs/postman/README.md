# Postman — `basic-blockchain-frontend`

Status: Accepted
Last updated: 2026-05-25 (v0.9.0)

This folder ships the frontend-aligned Postman artifacts so any developer or
QA can hit the same HTTP surface the SPA consumes.

## Files

| File                                          | Purpose                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| `basic-blockchain.postman_collection.json`    | All endpoints from `src/api/*.ts`, grouped by feature.                           |
| `local.postman_environment.json`              | `http://localhost:5000/api/v1` — Vite dev proxy target.                          |
| `staging.postman_environment.json`            | Staging deployment.                                                              |
| `production.postman_environment.json`         | Production deployment.                                                           |

## Import

1. Postman → **Import** → drag `basic-blockchain.postman_collection.json`.
2. Import the environment(s) you need; select one in the environment picker
   (top-right).
3. Run **Auth → POST /auth/login** first. The collection test script copies
   `access_token` into the env `jwt` variable, and the collection's bearer
   auth (`{{jwt}}`) picks it up for every other request.

## Variables

| Variable    | Set by              | Used by                                              |
| ----------- | ------------------- | ---------------------------------------------------- |
| `baseUrl`   | environment         | every request URL                                    |
| `wsUrl`     | environment         | reference for the `/api/v1/ws` WebSocket stream      |
| `username`  | environment         | login request body                                   |
| `password`  | environment (secret)| login request body                                   |
| `jwt`       | login test script   | bearer token (collection-level auth)                 |
| `user_id`   | collection variable | admin user mutations, KYC review                     |
| `wallet_id` | collection variable | admin wallet freeze/unfreeze, mint                   |
| `op_id`     | initiate-distribute test script | treasury approve/cancel                  |

## Coverage

The collection mirrors `docs/api-reference.md` 1:1. If you add a new endpoint
in `src/api/*.ts`, please:

1. Add it to `docs/api-reference.md`.
2. Add a request under the matching folder here.
3. Bump the `Last updated` line on this README.

## Newman (optional CI smoke)

```bash
npx newman run docs/postman/basic-blockchain.postman_collection.json \
  -e docs/postman/local.postman_environment.json \
  --folder "Public catalog"
```

The `Public catalog` folder (health, metrics, currencies) is auth-free and a
reasonable smoke check post-deploy.
