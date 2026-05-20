# Phase 7.9 closeout

**Status:** Done — 2026-05-20.
**Scope:** Long tail admin views in the frontend.
**Related roadmap:** [ROADMAP.md](../ROADMAP.md#L325)

## What was added

- `AdminAuditView` migrated to `BaseCard`, `BaseTable`, `BaseBadge`, and `BaseButton`.
- `AdminComplianceView` migrated to the shared Phase 7.1 atoms.
- `AdminMovementsView` migrated to the shared Phase 7.1 atoms.
- `AdminSendsView` migrated to the shared Phase 7.1 atoms.
- `AdminSettingsView` migrated to `BaseCard` and `BaseButton` where applicable.
- `AdminCurrenciesView` migrated to `BaseCard`, `BaseTable`, `BaseBadge`, and `BaseButton`.
- `AdminExchangeRatesView` migrated to `BaseCard`, `BaseTable`, `BaseBadge`, and `BaseButton`.
- `ValidationView` now uses `BaseCard` header slots for section titles and removes the legacy panel header/body wrappers.
- Phase 7.9 closure notes were added so the remaining work is explicit instead of implied.

## What is still missing

There are no mandatory functional blockers left in Phase 7.9.

Optional follow-ups still called out by the specs are:

- Evolve the validation history list to `BaseTable` if the history grows.
- Add CSV export for validation history if JSON export is no longer enough.
- Re-evaluate `TabGroup` extraction only if another tab-strip consumer appears.

## Verification

- `npm run build` succeeded after the `ValidationView` cleanup.

## Outcome

Phase 7.9 is considered closed from an implementation perspective. The remaining items are follow-ups, not blockers.
