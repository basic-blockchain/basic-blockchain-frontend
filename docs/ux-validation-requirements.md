# UX and Validation Requirements

Status: proposed
Last updated: 2026-04-24

## Objective

Improve readability, visual harmony, and validation capabilities while preserving current behavior and API compatibility.

## 1. Visual requirements

### 1.1 Color system

Adopt the approved blockchain dark palette:

- Background: #0d0e1a
- Sidebar: #121324
- Surface panel: #1a1b2e
- Elevated surface: #202237
- Border: #2d2f4a
- Accent primary: #7D56FE
- Accent secondary: #4198FF
- Accent glow: #B4A9E6
- Text primary: #FDFDFD
- Text secondary: #A0A8C0
- Text muted: #6D7382
- Success: #22c55e
- Warning: #eab308
- Error: #ef4444

### 1.2 Typography and hierarchy

- Use strong visual distinction between h1, h2, and body text.
- Ensure title contrast ratio is readable against dark backgrounds.
- Keep numeric metrics in tabular style for quick scanning.

### 1.3 Component consistency

- Unify panel styles, radii, borders, and elevation.
- Align badge styles for counters and statuses.
- Ensure DataTable header, rows, and empty state are readable.
- Keep spacing rhythm consistent across all pages.

### 1.4 Responsive behavior

- Sidebar must collapse to stacked layout on mobile.
- Forms should switch from horizontal to vertical layout on narrow viewports.
- Validation and metrics cards must remain readable on small screens.

## 2. Validation feature requirements

### 2.1 Chain validation

- Provide explicit action to validate chain integrity through backend endpoint.
- Display backend message and pass/fail state.

### 2.2 Block validation

- Validate selected block by index against local chain snapshot.
- Rules:
  - block exists in chain
  - proof is positive integer
  - timestamp parseable
  - genesis previous hash equals 0

### 2.3 Node validation

- Validate node URL format (http/https).
- Show whether node is currently registered.

### 2.4 Transaction validation

- Validate sender, receiver, amount with rule-level status.
- Show immediate feedback without submitting transaction.

## 3. Accessibility requirements

- Minimum readable contrast for all text on dark surfaces.
- Do not rely only on color for status; include icon/text labels.
- Ensure keyboard navigability for forms and action buttons.

## 4. Suggested implementation phases

1. Theme foundation and global token migration.
2. Cross-view contrast and typography normalization.
3. Validation Center rollout (chain, block, node, transaction).
4. Accessibility pass and responsive QA.
5. Optional enhancements:
   - historical validation logs
   - exportable validation report
   - server-side block and node validation endpoints
