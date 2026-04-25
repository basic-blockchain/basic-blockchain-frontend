---
name: architecture-business-review
description: 'Automated pre-merge code review for this blockchain frontend. Use when reviewing a branch before integration, enforcing architecture rules, GitFlow safeguards, and backend business-rule mirroring (BR-TX, BR-ND, BR-CH).'
argument-hint: 'Optional base branch, e.g. origin/develop'
user-invocable: true
---

# Architecture and Business Review

## When To Use

- Before merging a feature branch into develop.
- When validating compliance with frontend architecture constraints.
- When checking GitFlow automation and branch governance controls.
- When verifying business-rule mirroring against backend rules.

## Inputs

- Optional argument: base branch for diff scope.
- Default base branch: `origin/develop`.

## Procedure

1. Run automated gate checks:
   - `bash ./.github/skills/architecture-business-review/scripts/review.sh origin/develop`
2. Inspect output sections:
   - `QUALITY GATES`
   - `ARCHITECTURE CHECKS`
   - `BUSINESS RULE MIRROR CHECKS`
   - `GITFLOW SAFETY CHECKS`
3. Convert any detected issue into a review finding with severity and file path.
4. If no issues are found, state explicitly that no findings were detected and list residual risks.

## Review Rules Enforced

- Views under `src/views` must not import from `src/api` directly.
- Transaction form flows must keep using `validateTransaction` before submit.
- GitFlow controls should exist and remain tracked:
  - promotion PR workflow
  - merge policy workflow
  - branch sync workflow
  - PR template
  - pre-push local safety hook

## References

- [Architecture summary](./references/architecture-rules.md)
- [Backend business rules map](./references/business-rules-map.md)
- [Review script](./scripts/review.sh)
