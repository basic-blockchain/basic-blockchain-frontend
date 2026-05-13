# User Guide

Status: draft
Last updated: 2026-05-08

## 1. Start the application

1. Open a terminal in the frontend project.
2. Install dependencies if needed:
   - npm install
3. Start the development server:
   - npm run dev
4. Open the local URL shown by Vite.

## 2. Authentication (first time)

1. Go to Register and create a username + display name.
2. Copy the activation code returned by the backend.
3. Open Activate and set your initial password.
4. Login with username + password to reach Wallet.

## 3. Wallets and signed transfers

1. Open Wallet.
2. Click New wallet to create a wallet.
3. Save the 12-word recovery phrase shown in the modal.
4. Review wallet balances and frozen status.
5. Submit a signed transfer:
   - Select sender wallet.
   - Enter receiver wallet ID, amount, nonce, and recovery phrase.
   - Submit to place the transaction in the mempool.

## 4. Dashboard flow

1. Go to Dashboard from the left menu.
2. Review top metrics:
   - Chain Height
   - Pending Transactions
   - Avg Mine Time
   - Node Status
   - Database
3. Review recent blocks and pending transactions.
4. Click Mine Block to mine a block and refresh metrics.

## 5. Chain flow

1. Open Chain from the left menu.
2. Verify the total number of blocks with the counter beside the title.
3. Read Mine Time chart to detect mining anomalies.
4. Inspect All Blocks list from latest to oldest.

## 6. Mempool flow

1. Open Mempool.
2. Review Pending Transactions (unconfirmed).
3. Review Transaction History (confirmed, mined).
4. Mine a block to confirm pending transactions.

## 7. Nodes flow

1. Open Nodes.
2. Inspect registered peers and total count.
3. Register a new peer URL.
4. Run Resolve Consensus to synchronize with peers.

## 8. Validation Center flow

1. Open Validation from the sidebar.
2. Chain validation:
   - Click Validate Chain to run backend chain integrity check.
   - Confirm message indicates valid chain status.
3. Block validation:
   - Enter block index and validate basic integrity rules:
     - index exists
     - valid timestamp
     - positive proof
     - genesis previous hash
4. Node validation:
   - Enter node URL and verify format and registration state.
5. Transaction validation:
   - Enter sender, receiver, amount and review rule-by-rule validation.
6. Export validation history as JSON if needed.

## 9. Admin flows (ADMIN only)

1. Open Admin to mint tokens to a wallet.
2. Open Admin Users to edit display names, ban/restore, and manage roles.
3. Open Admin Wallets to freeze/unfreeze wallets.

## 10. Health flow

1. Open Health.
2. Validate service state and database state badges.
3. Confirm chain height in node details.
4. Click Refresh for a new metrics snapshot.

## 11. Recommended end-to-end operator sequence

1. Login and open Wallet to confirm balances.
2. Health check before actions.
3. Nodes check and consensus synchronization.
4. Validate chain and review recent blocks.
5. Submit transfer (if needed) and mine a block.
6. Review Dashboard, Mempool, and Health for final verification.

## 12. Common troubleshooting

1. Empty views: verify backend is running and API base URL is correct.
2. Login loops or 401s: clear `bb_auth` from localStorage and retry.
3. WS status stuck in Connecting: verify `/api/v1/ws` endpoint and network access.
4. Transfer rejected: check wallet IDs, nonce, and recovery phrase.
5. Consensus not resolving: verify peer URL and peer availability.
