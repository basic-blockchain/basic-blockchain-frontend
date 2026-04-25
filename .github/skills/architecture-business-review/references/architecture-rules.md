# Architecture Rules Used In Review

Source: frontend docs architecture.

## Key constraints

- Views in `src/views` must not call `src/api` directly.
- Stores are the integration boundary for views/composables.
- Domain validation should remain pure and reusable.
- Frontend mirrors backend layering for maintainability.

## Mapped check in script

- Regex check for `@/api/` imports under `src/views`.
