# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Always prefix commands with the full PATH (Homebrew not on default PATH in this environment)
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

pnpm dev          # start dev server (localhost:3000)
pnpm build        # production build
pnpm lint         # run ESLint
```

## Project Overview

YieldChaser is a Next.js 16 dashboard that aggregates and compares stablecoin (USDC, USDT, DAI) lending/borrowing APYs across DeFi protocols (AAVE, Morpho, Euler) on multiple chains.

**Supported chains:** Ethereum, Base, Arbitrum, Optimism, Plasma (L1 focused on USDT payments — chain ID and RPC URL are placeholders in `src/lib/chains/index.ts`, update when known)

## Architecture

### Data Flow
```
Browser → useYieldRates (TanStack Query) → GET /api/rates → ProtocolAdapter.fetchRates() → viem RPC calls
```

Data refreshes every 60 seconds client-side. The API route fans out to all protocol adapters in parallel and filters out non-finite APY values before returning.

### Key Files
- `src/types/index.ts` — shared types: `YieldRate`, `ProtocolAdapter`, `Protocol`, `Stablecoin`
- `src/lib/chains/index.ts` — chain definitions (viem) + `CHAIN_CONFIG` for display metadata. **Update Plasma chain ID and RPC URL here.**
- `src/lib/rpc/clients.ts` — viem `PublicClient` per chain. Defaults to publicnode.com endpoints; override via `RPC_MAINNET`, `RPC_BASE`, `RPC_ARBITRUM`, `RPC_OPTIMISM` env vars.
- `src/lib/protocols/aave.ts` — AAVE V3 adapter
- `src/lib/protocols/morpho.ts` — Morpho Blue adapter
- `src/lib/protocols/euler.ts` — Euler v2 EVault adapter
- `src/lib/protocols/index.ts` — protocol adapter registry (Compound is a placeholder stub)
- `src/lib/graph/queries.ts` — GraphQL queries + subgraph URL map (URLs are TODO)
- `src/app/api/rates/route.ts` — Next.js API route that fans out to all adapters
- `src/hooks/useYieldRates.ts` — TanStack Query hook used by UI components
- `src/components/YieldTable.tsx` — main data table, sorted by supply APY descending

### Protocol Adapter Details

**AAVE (`aave.ts`)**
- Reads from the `AaveProtocolDataProvider` contract per chain via `getReserveData(asset)`
- `liquidityRate` / `variableBorrowRate` are **annual** rates in RAY (1e27) — divide by `SECONDS_PER_YEAR` before compounding
- Pool Data Provider addresses were resolved on-chain via `Pool.ADDRESSES_PROVIDER → getPoolDataProvider()`
- DAI uses 18 decimals; USDC/USDT use 6 — see `ASSET_DECIMALS` map

**Morpho (`morpho.ts`)**
- Uses the Morpho Blue singleton (`0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb`, same on all chains)
- Market IDs are computed as `keccak256(abi.encode(loanToken, collateralToken, oracle, irm, lltv))`
- Borrow rate comes from `IRM.borrowRateView()` in WAD (1e18) per second
- Oracle addresses were verified via the Morpho Blue API (`blue-api.morpho.org/graphql`) and confirmed by matching computed market IDs against API-reported IDs
- Per-asset result is the **best supply APY** across all known markets for that asset

**Euler (`euler.ts`)**
- Each EVault is self-contained — reads `totalAssets`, `totalBorrows`, `interestRate`, `interestFee` in one `Promise.all`
- `interestRate()` returns borrow rate per second in RAY (1e27)
- `interestFee()` returns fee in basis points with `CONFIG_SCALE = 10_000`
- Vault addresses were enumerated from `EVaultFactory` (`0x29a56a1b8214D9Cf7c5561811750D5cBDb45CC8e`) using multicall via publicnode RPC
- Per-asset result is the **best supply APY** across all listed vaults

### Adding a New Protocol
1. Create `src/lib/protocols/<name>.ts` implementing `ProtocolAdapter`
2. Register it in `src/lib/protocols/index.ts`
3. Add supported chain/asset addresses in the adapter

### Adding a New Chain
1. Add chain definition in `src/lib/chains/index.ts` (use `defineChain` from viem if not in viem/chains)
2. Add a viem client in `src/lib/rpc/clients.ts`
3. Add asset addresses to protocol adapters that support it

### RPC Notes
- The default free public RPC (`eth.merkle.io`) is too rate-limited for multicall or log queries; use `publicnode.com` or set private RPC URLs via env vars
- `eth_getLogs` on the default RPC is limited to 1k blocks per request
- To verify contract addresses on-chain (e.g. AAVE Pool Data Provider): call `Pool.ADDRESSES_PROVIDER()` then `provider.getPoolDataProvider()`
- To find Morpho oracle addresses: query `blue-api.morpho.org/graphql` or read `supplyQueue` + `idToMarketParams` from MetaMorpho vaults

## Stack
- **Next.js 16** (App Router, Turbopack)
- **viem** for on-chain RPC reads
- **TanStack Query** for client-side data fetching/caching
- **urql + graphql** for The Graph subgraph queries (graph integration not yet wired — see `src/lib/graph/`)
- **Tailwind CSS v4 + shadcn/ui**
- **Recharts** (installed, not yet used — for APY history charts)
