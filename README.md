# Cipher — Confidential Credit on FHE

> **The privacy-preserving on-chain credit scoring and micro-lending protocol built with Zama's Fully Homomorphic Encryption.**

[![Zama FHEVM](https://img.shields.io/badge/Built%20with-Zama%20FHEVM-blue)](https://docs.zama.ai)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.27-black)](https://soliditylang.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)

---

## Table of Contents

1. [Demo](#demo)
2. [Problem & Opportunity](#problem--opportunity)
3. [Product-Market Fit](#product-market-fit)
4. [Architecture](#architecture)
5. [Smart Contracts](#smart-contracts)
6. [Frontend](#frontend)
7. [Design System](#design-system)
8. [Deployment](#deployment)
9. [Team & Credits](#team--credits)

---

## Demo

**Live Demo:** [https://cipher-fhe.vercel.app](https://cipher-fhe.vercel.app)

**Contract (Sepolia):** [`0x6A0846cAFC2344Fc6fECbc45eB0257fc3a448d62`](https://sepolia.etherscan.io/address/0x6A0846cAFC2344Fc6fECbc45eB0257fc3a448d62)

**What you can do:**

1. Connect your wallet on Sepolia
2. Submit encrypted financial metrics (tx count, volume, wallet age)
3. Watch the smart contract compute your credit score **entirely on encrypted data**
4. Decrypt your score and tier locally — only you ever see the number
5. Reveal your tier to access tiered micro-loans from the community pool
6. Borrow with a 2.5% origination fee and 5% interest
7. Deposit liquidity to earn pro-rata yield from borrower fees and interest
8. Withdraw your principal + accrued yield at any time

---

## Problem & Opportunity

### The Privacy Paradox in DeFi Lending

Existing DeFi lending protocols (Aave, Compound, Morpho) are **transparent by design**. Every wallet's collateral, debt, and liquidation price is publicly visible. This creates three critical problems:

1. **Financial surveillance** — whales, competitors, and analytics firms can monitor and front-run large positions
2. **Social stigma** — borrowers don't want their community to see they're leveraged or in debt
3. **Exclusion of underbanked** — 1.4 billion people lack traditional credit history. On-chain credit scoring could help, but nobody wants their entire transaction history published to the world

### Why FHE — Not ZK, Not MPC

| Approach                         | Can compute on encrypted data?          | Composability               | On-chain verification |
| -------------------------------- | --------------------------------------- | --------------------------- | --------------------- |
| Zero-Knowledge Proofs            | ❌ (proves statements, doesn't compute) | ✅                          | ✅                    |
| Multi-Party Compute              | ✅                                      | ❌ (off-chain coordination) | ❌                    |
| **Fully Homomorphic Encryption** | **✅**                                  | **✅**                      | **✅**                |

FHE is the **only** technology that allows a smart contract to run arbitrary arithmetic on encrypted inputs, store encrypted state, and let only authorized parties decrypt the result. Zama's FHEVM makes this practical on Ethereum.

### Why Now?

- Zama FHEVM is live on Sepolia and mainnet
- ERC-7984 (Confidential Token Standard) is gaining traction
- Institutional DeFi demands privacy for compliance and competitive reasons
- The "Confidential Finance" narrative is the next frontier (per Zama's own Season 2 positioning)

---

## Product-Market Fit

### Who Needs This?

| Segment                     | Pain Point                                            | How Cipher Helps                            |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------- |
| **Crypto-native borrowers** | Don't want collateral/debt positions visible          | Confidential score + private borrowing      |
| **Emerging market users**   | No traditional credit file, but have on-chain history | Wallet-based credit scoring without doxxing |
| **DAOs & treasuries**       | Need to lend to contributors privately                | Tier-based access with encrypted terms      |
| **Fintechs / Neobanks**     | Compliance requires data privacy; want DeFi yields    | White-label confidential credit layer       |
| **Privacy advocates**       | Refuse to use transparent DeFi                        | End-to-end encrypted financial operations   |

### Competitive Landscape

| Project    | Privacy Tech          | Credit Scoring? | On-chain? | Unique vs Cipher                     |
| ---------- | --------------------- | --------------- | --------- | ------------------------------------ |
| Aave       | None                  | ❌              | ✅        | Transparent, no credit scoring       |
| Teller     | ZK (off-chain oracle) | ✅              | ❌        | Oracle-dependent, not fully on-chain |
| Spectral   | Public ML             | ✅              | ✅        | Scores are public                    |
| **Cipher** | **FHE**               | **✅**          | **✅**    | **Fully confidential, end-to-end**   |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  Next.js    │  │ Zama SDK     │  │  RainbowKit Wallet  │ │
│  │  React UI   │  │ (encrypt/    │  │  (MetaMask, etc.)   │ │
│  │             │  │  decrypt)    │  │                     │ │
│  └──────┬──────┘  └──────┬───────┘  └─────────────────────┘ │
└─────────┼────────────────┼──────────────────────────────────┘
          │                │
          │  encrypted txs │
          ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│              Ethereum / Sepolia (EVM)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           CipherProtocol.sol (FHEVM)                   │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │  │
│  │  │ applyForScore│  │   borrow     │  │ repayLoan    │ │  │
│  │  │ (FHE compute)│  │ (tier-based) │  │ (track repay)│ │  │
│  │  └─────────────┘  └──────────────┘  └──────────────┘ │  │
│  │                                                        │  │
│  │  Encrypted state: encryptedScores[user] → euint32      │  │
│  │                     encryptedTiers[user]  → euint32    │  │
│  │                     loans[user]           → Loan       │  │
│  └───────────────────────────────────────────────────────┘  │
│                         ▲                                   │
│                         │ FHE ops (add, mul, div, ge, select)│
│                         ▼                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Zama FHEVM Executor                       │  │
│  │         (KMS + Threshold Decryption)                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### FHE Operations Used

The scoring formula demonstrates **7 distinct FHE operation types**:

```solidity
// 1. Multiplication (encrypted * plaintext)
euint32 weightedTxCount = FHE.mul(txCount, FHE.asEuint32(5));

// 2. Division (encrypted / plaintext)
euint64 volumeDiv = FHE.div(totalVolume, uint64(1e15));

// 3. Addition (encrypted + encrypted)
euint32 positiveScore = FHE.add(weightedTxCount, volumeScore);

// 4. Subtraction (encrypted - encrypted)
euint32 rawScore = FHE.sub(positiveScore, weightedDefaults);

// 5. Greater-than (encrypted > encrypted)
ebool negativeLarger = FHE.gt(weightedDefaults, positiveScore);

// 6. Less-than (encrypted < plaintext)
ebool isTierC = FHE.and(isC, FHE.lt(score, FHE.asEuint32(650)));

// 7. Select (encrypted ternary)
score = FHE.select(aboveMax, FHE.asEuint32(850), score);
```

---

## Smart Contracts

### `CipherProtocol.sol`

**Location:** `packages/foundry/src/CipherProtocol.sol`

**Deployed Address (Sepolia):** `0x6A0846cAFC2344Fc6fECbc45eB0257fc3a448d62`

**Core Functions:**

| Function            | Description                                                                          | Gas (approx) |
| ------------------- | ------------------------------------------------------------------------------------ | ------------ |
| `applyForScore`     | Accepts 3 encrypted inputs, reads defaults on-chain, computes weighted score via FHE | ~1.9M        |
| `getEncryptedScore` | Returns user's encrypted score handle (view)                                         | ~0           |
| `getEncryptedTier`  | Returns user's encrypted tier handle (view)                                          | ~0           |
| `revealTier`        | User reveals decrypted tier for on-chain borrowing                                   | ~30K         |
| `borrow`            | Borrow ETH up to tier limit. 2.5% origination fee retained by pool.                  | ~120K        |
| `repayLoan`         | Repay active loan. Principal + 5% interest due to close.                             | ~40K         |
| `depositLiquidity`  | Deposit ETH to lending pool. Earn pro-rata yield.                                    | ~25K         |
| `withdrawLiquidity` | Withdraw ETH + accrued yield proportional to deposit share                           | ~30K         |
| `liquidate`         | Anyone can liquidate an overdue loan (>30 days). Records default on-chain.           | ~25K         |

**DeFi Economics:**

- **Origination Fee:** 2.5% flat fee on every borrow (retained by pool immediately)
- **Interest Rate:** 5% due on repayment (stays in pool)
- **Yield Distribution:** Pro-rata based on deposit share
- **Liquidation:** Bad debt is written off from `totalBorrows`, absorbed by depositors proportionally

**Security Notes:**

- `revealTier` is self-reported for the hackathon demo. In production, this would be replaced by:
  - A ZK-proof that the claimed tier matches the encrypted score, OR
  - A Zama Gateway decryption callback that verifies the tier on-chain
- The contract uses `FHE.allowThis()` and `FHE.allow()` to enforce ACL on every encrypted handle
- No reentrancy risk: borrowing uses `.call{value:...}` with checks-effects-interactions pattern

### Tests

**Location:** `packages/foundry/test/CipherProtocol.t.sol`

```bash
pnpm contracts:test
```

Tests cover:

- Encrypted score computation and decryption
- Encrypted tier computation and decryption
- Full borrow/repay flow with fees and interest
- Liquidation and default recording
- Depositor yield from fees and interest
- Partial withdrawals

---

## Frontend

**Stack:**

- Next.js 15 (App Router)
- React 19
- Tailwind CSS v4
- wagmi + viem + RainbowKit
- `@zama-fhe/react-sdk` v3

**Design Language:**
The UI follows an **Apple-inspired design system** with:

- Single accent color (`#0066cc` Action Blue)
- SF Pro / Inter typography with tight negative letter-spacing
- Alternating light (`#ffffff`, `#f5f5f7`) and dark (`#272729`) tiles
- Pill-shaped CTAs with `transform: scale(0.95)` press states
- Zero decorative gradients, zero card shadows
- Photography-first whitespace philosophy

**Key Components:**

- `ApplyPanel` — Auto-fills wallet history from Alchemy, read-only fields, submit encrypted application
- `ScorePanel` — Encrypted score display + decrypt CTA with step indicator
- `LoanPanel` — Borrow calculator with fee preview, repay with interest breakdown
- `PoolPanel` — Liquidity deposit/withdraw, utilization bar, pool stats

---

## Design System

The Cipher frontend follows an **Apple-inspired design language** documented in `DESIGN.md` (see project root). Key principles:

- **Single accent color:** `#0066cc` Action Blue carries every interactive element
- **Typography:** Inter (open-source SF Pro equivalent) with negative letter-spacing at display sizes
- **Surface rhythm:** Alternating light (`#ffffff`, `#f5f5f7`) and dark (`#272729`) tiles create visual pulse without borders or shadows
- **Button grammar:** Pill-shaped CTAs (`border-radius: 9999px`) for primary actions; compact rectangles (`border-radius: 8px`) for utilities
- **Shadow philosophy:** Exactly one drop-shadow exists in the system — `rgba(0,0,0,0.22) 3px 5px 30px` — reserved for product imagery, never UI chrome
- **Press state:** `transform: scale(0.95)` on every button
- **Whitespace:** Sections use 80px vertical padding; tiles stack edge-to-edge with color change as the divider

---

## Deployment

### Sepolia (Live)

- **Contract:** `0x6A0846cAFC2344Fc6fECbc45eB0257fc3a448d62`
- **Etherscan:** https://sepolia.etherscan.io/address/0x6A0846cAFC2344Fc6fECbc45eB0257fc3a448d62
- **Network:** Sepolia Testnet (Chain ID: 11155111)
- **Verified:** ✅

### Environment Variables

Create `packages/nextjs/.env.local`:

```bash
NEXT_PUBLIC_ALCHEMY_API_KEY=...
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=...
```

Create root `.env.local` (for contract deployment):

```bash
DEPLOYER_PRIVATE_KEY=0x...
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
ETHERSCAN_API_KEY=...
```

### Build & Deploy Frontend

```bash
pnpm install
pnpm next:build
# Deploy .next/ folder to Vercel
```

---

## Team & Credits

**Built for:** Zama Developer Program — Builder Track (Mainnet Season 2)

**Tech Stack:**

- [Zama FHEVM](https://docs.zama.ai) — Fully Homomorphic Encryption for EVM
- [OpenZeppelin Confidential Contracts](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts) — ERC-7984 standards
- [Foundry](https://book.getfoundry.sh) — Ethereum development toolkit
- [Next.js](https://nextjs.org) — React framework
- [RainbowKit](https://rainbowkit.com) — Wallet connection

**License:** BSD-3-Clause-Clear (per Zama template)

---

## Acknowledgments

- Zama team for the FHEVM protocol and developer tooling
- OpenZeppelin for confidential contract standards
- The FHEVM React Template maintainers

---

_Cipher — Privacy is the default._
