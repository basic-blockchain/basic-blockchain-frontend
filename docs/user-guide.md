# User Guide

Status: draft
Last updated: 2026-04-24

## 1. Start the application

1. Open a terminal in the frontend project.
2. Install dependencies if needed:
   - npm install
3. Start the development server:
   - npm run dev
4. Open the local URL shown by Vite.

## 2. Dashboard flow

1. Go to Dashboard from the left menu.
2. Review top metrics:
   - Chain Height
   - Pending Transactions
   - Avg Mine Time
   - Node Status
   - Database
3. Review latest blocks in Recent Blocks.
4. Review pending transactions in the Mempool table.
5. Click Mine Block to mine a block and refresh metrics.

## 3. Chain flow

1. Open Chain from the left menu.
2. Verify the total number of blocks with the counter beside the title.
3. Read Mine Time chart to detect mining anomalies.
4. Inspect All Blocks list from latest to oldest.

## 4. Mempool flow

1. Open Mempool.
2. Submit a new transaction with Sender, Receiver, Amount.
3. Check validation feedback for invalid inputs.
4. Confirm transaction appears in Pending Transactions.
5. Return to Dashboard to check mempool and metrics impact.

## 5. Nodes flow

1. Open Nodes.
2. Inspect registered peers and total count.
3. Register a new peer URL.
4. Run Resolve Consensus to synchronize with peers.

## 6. Validation Center flow

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

## 7. Health flow

1. Open Health.
2. Validate service state and database state badges.
3. Confirm chain height in node details.
4. Click Refresh for a new metrics snapshot.

## 8. Recommended end-to-end operator sequence

1. Health check before actions.
2. Nodes check and consensus synchronization.
3. Mempool transaction creation.
4. Chain validation and block review.
5. Mine block.
6. Dashboard and Health final verification.

## 9. Common troubleshooting

1. Empty views: verify backend is running and API base URL is correct.
2. WS status stuck in Connecting: verify backend websocket endpoint and network access.
3. Transaction rejected: check sender/receiver and amount rules.
4. Consensus not resolving: verify peer URL and peer availability.
