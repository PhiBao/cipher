# Agent Context: Cipher

## Project

- **Name:** Cipher
- **Tagline:** Confidential credit. Built on FHE.
- **Type:** Privacy-preserving on-chain credit scoring + micro-lending dApp
- **Target:** Zama Developer Program (Builder Track, Mainnet Season 2)
- **Deadline:** May 10, 2026

## Contract (Sepolia)

- **Address:** `0x6A0846cAFC2344Fc6fECbc45eB0257fc3a448d62`
- **Verified:** https://sepolia.etherscan.io/address/0x6A0846cAFC2344Fc6fECbc45eB0257fc3a448d62
- **Previous addresses (DO NOT USE):**
  - `0x199925101D489531B3ebD9a429345D909d056e1d` (v1)
  - `0x8FFb89F8363f395F96Bd266Cac6bA46ECF3FA9AC` (v2)

## Tech Stack

- **Contracts:** Foundry, Solidity 0.8.27, `@fhevm/solidity` 0.11.1, `forge-fhevm`
- **Frontend:** Next.js 15, React 19, Tailwind CSS v4, wagmi, viem, RainbowKit
- **FHE SDK:** `@zama-fhe/react-sdk` v3, `@zama-fhe/sdk` v3, `RelayerWeb` + `SepoliaConfig`
- **Network:** Sepolia only (no localhost, no hardhat)

## Key Files

- `packages/foundry/src/CipherProtocol.sol` — main contract
- `packages/foundry/test/CipherProtocol.t.sol` — Foundry tests
- `packages/nextjs/contracts/CipherProtocol.ts` — hardcoded ABI + address
- `packages/nextjs/hooks/useCipherProtocolWagmi.tsx` — main FHE interaction hook
- `packages/nextjs/hooks/useWalletHistory.ts` — Alchemy wallet scanner
- `packages/nextjs/app/page.tsx` — dashboard UI
- `packages/nextjs/next.config.ts` — Next.js config (NO COOP/COEP headers — breaks Coinbase Wallet)

## Critical Implementation Details

### FHE Reads Need `account: address`

`getEncryptedScore()` and `getEncryptedTier()` use `msg.sender`. Without `account: address` in the wagmi `useReadContract` config, `msg.sender` defaults to `address(0)` and reads return zero handles.

### Wagmi Cache Staleness

After `applyForScore`, wagmi's cache may not update for `msg.sender`-dependent reads. The hook uses `publicClient.readContract` in a polling loop with `account: address` to bypass the cache. Results are stored in local state (`polledScoreHandle`, `polledTierHandle`).

### Encryption Overflow

`parseEther` can exceed `euint64` max (`2^64-1 ≈ 18.44 ETH`). The hook clamps `totalVolumeWei` to `MAX_EUINT64` before encryption. `txCount` and `age` are clamped to `MAX_EUINT32`.

### Wallet Rejection Handling

All write functions in the hook use a `formatError()` helper that detects user rejection patterns (`"user rejected"`, `"request denied"`, `"cancelled"`) and surfaces clean messages instead of raw stack traces.

### Defaults Are On-Chain

The contract reads `defaultCount[msg.sender]` inside `applyForScore` via `FHE.asEuint32(defaultCount[msg.sender])`. The frontend does NOT pass defaults as an encrypted input.

### DeFi Model

- **Origination fee:** 2.5% (`BORROW_FEE_BPS = 250`)
- **Interest:** 5% (`INTEREST_BPS = 500`)
- **Yield:** Pro-rata depositor shares
- **Liquidation:** 30-day grace period (`LOAN_DURATION = 30 days`)

### Alchemy Integration

`useWalletHistory.ts` calls `alchemy_getAssetTransfers` for sent + received external transfers. Returns decimal ETH values. Uses `parseEther` from viem (not manual `BigInt(Number(val) * 1e18)`) to avoid float precision crashes.

## Design System

- Apple-inspired from `DESIGN.md`
- Single accent: `#0066cc`
- Font: Inter
- Dark tiles: `#272729`, light tiles: `#ffffff` / `#f5f5f7`
- Pill CTAs, `active:scale-95`, no card shadows

## Build Commands

```bash
# Foundry
cd packages/foundry
source ../../.env.local && forge build
source ../../.env.local && forge test
source ../../.env.local && forge script script/DeployCipherProtocol.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY

# Frontend
cd packages/nextjs
pnpm run check-types
pnpm run build
```

## Env Files

- Root `.env.local`: `DEPLOYER_PRIVATE_KEY`, `SEPOLIA_RPC_URL`, `ETHERSCAN_API_KEY`
- `packages/nextjs/.env.local`: `NEXT_PUBLIC_ALCHEMY_API_KEY`, `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`

## Known Issues & Decisions

- **No COOP/COEP headers:** Required for Coinbase Wallet SDK. Zama WASM may run single-threaded but still functional.
- **Self-reported tier revelation:** For hackathon only. Production would use ZK-proof or gateway callback.
- **No collateral:** Loans are uncollateralized for demo. Production would require overcollateralization or off-chain underwriting.
- **Flat interest rate:** Variable rate curves are out of scope for the hackathon timeline.
