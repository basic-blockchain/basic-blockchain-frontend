# Business Rules Map For Frontend Review

Source: backend `docs/business-rules.md`.

## Transaction rules mirrored on frontend

- BR-TX-01: amount > 0
- BR-TX-02: sender required
- BR-TX-03: receiver required
- BR-TX-04: sender != receiver

Frontend enforcement points expected:

- `src/domain/transaction.ts` (`validateTransaction`)
- submit flows in mempool and validation UI should call `validateTransaction`

## Node and chain related checks in frontend

- BR-ND-03 awareness: only http/https node URLs are considered valid.
- BR-CH-01 awareness: chain validation should call backend validation endpoint.

These are guardrails for UX-level validation. Backend remains authoritative.
