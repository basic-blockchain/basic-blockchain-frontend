# basic-blockchain-frontend

![version](https://img.shields.io/badge/version-v0.1.0-blue)
![node](https://img.shields.io/badge/node-%3E%3D20-green)
![framework](https://img.shields.io/badge/framework-TBD-lightgrey)

Frontend dashboard for the [Blockchain Simulator](https://github.com/basic-blockchain/basic-blockchain-simulator) — real-time chain and mempool visualisation.

> **Framework choice pending — see [docs/frontend-comparison.md](docs/frontend-comparison.md)**
>
> React and Vue are both under evaluation. The scaffold is intentionally framework-agnostic until the decision is finalised.

---

## Requirements

- Node.js >= 20 (use `.nvmrc` with `nvm use`)
- npm >= 10

## Running

```bash
nvm use          # activates Node 20 via .nvmrc
npm install
npm run build
```

## Tests

```bash
npm run test
```

Coverage report is written to `coverage/`.

## CI/CD

All branches are protected. The promotion chain follows the GitFlow model:

```
feature/* → develop → release/* → production → main
                                → staging → qa → develop
```

CI runs on every push and pull request. See `.github/workflows/` for details.
