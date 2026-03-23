import type { Protocol, ProtocolAdapter, Stablecoin, YieldRate } from "@/types";

const MORPHO_API = "https://blue-api.morpho.org/graphql";
const MIN_TVL_USD = 1_000_000;
const MAX_APY = 100;

const ASSET_MAP: Partial<Record<string, Stablecoin>> = {
  USDC: "USDC",
  USDT: "USDT",
  DAI: "DAI",
  USDS: "USDS",
};

type VaultItem = {
  address: string;
  name: string;
  asset: { symbol: string } | null;
  state: {
    totalAssetsUsd: number;
    netApy: number;
    curators: { name: string }[];
    rewards: { supplyApr: number | null; asset: { symbol: string } | null }[];
    allocation: {
      supplyAssetsUsd: number | null;
      market: {
        collateralAsset: { symbol: string } | null;
        state: { supplyAssetsUsd: number | null; borrowAssetsUsd: number | null } | null;
      };
    }[];
  } | null;
};

export const metamorphoAdapter: ProtocolAdapter = {
  protocol: "metamorpho" as Protocol,
  supportedChains: [1, 8453, 42161, 10, 999],
  supportedAssets: ["USDC", "USDT", "DAI", "USDS"],

  async fetchRates(chainId: number, assets: Stablecoin[]): Promise<YieldRate[]> {
    const query = `{
      vaults(
        where: { chainId_in: [${chainId}], whitelisted: true }
        first: 100
        orderBy: TotalAssetsUsd
        orderDirection: Desc
      ) {
        items {
          address
          name
          asset { symbol }
          state {
            totalAssetsUsd
            netApy
            curators { name }
            rewards { supplyApr asset { symbol } }
            allocation {
              supplyAssetsUsd
              market {
                collateralAsset { symbol }
                state { supplyAssetsUsd borrowAssetsUsd }
              }
            }
          }
        }
      }
    }`;

    const res = await fetch(MORPHO_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(10_000),
    });

    const json = await res.json();
    const items: VaultItem[] = json?.data?.vaults?.items ?? [];
    const results: YieldRate[] = [];

    for (const v of items) {
      const asset = ASSET_MAP[v.asset?.symbol ?? ""];
      if (!asset || !assets.includes(asset)) continue;

      const tvl = v.state?.totalAssetsUsd ?? 0;
      if (tvl < MIN_TVL_USD) continue;

      const baseApy = (v.state?.netApy ?? 0) * 100;
      const rewardsApr = (v.state?.rewards ?? []).reduce((sum, r) => sum + ((r.supplyApr ?? 0) * 100), 0);
      const netApy = baseApy + rewardsApr;
      if (netApy > MAX_APY || netApy < 0) continue;

      const curator = v.state?.curators?.[0]?.name;

      const allocation = v.state?.allocation ?? [];

      // Liquidity = Σ min(vault_allocation_in_market, market_available_liquidity)
      const liquidityUsd = allocation.reduce((sum, a) => {
        const vaultAlloc = a.supplyAssetsUsd ?? 0;
        const ms = a.market?.state;
        const marketLiq = ms ? (ms.supplyAssetsUsd ?? 0) - (ms.borrowAssetsUsd ?? 0) : 0;
        return sum + Math.min(vaultAlloc, marketLiq);
      }, 0);

      // Exposure = top 3 collaterals by allocated USD, with % of total vault TVL
      const collateralUsd = new Map<string, number>();
      for (const a of allocation) {
        const symbol = a.market?.collateralAsset?.symbol;
        if (!symbol) continue; // skip idle markets
        collateralUsd.set(symbol, (collateralUsd.get(symbol) ?? 0) + (a.supplyAssetsUsd ?? 0));
      }
      const totalAllocated = [...collateralUsd.values()].reduce((s, v) => s + v, 0);
      const exposure = totalAllocated > 0
        ? [...collateralUsd.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([symbol, usd]) => ({ symbol, pct: Math.round((usd / totalAllocated) * 100) }))
            .filter((e) => e.pct > 0)
            .slice(0, 3)
        : undefined;

      results.push({
        protocol: "metamorpho" as Protocol,
        chainId,
        address: v.address,
        asset,
        label: v.name,
        curator,
        exposure: exposure && exposure.length > 0 ? exposure : undefined,
        supplyApy: netApy,
        borrowApy: 0,
        totalSupplyUsd: tvl,
        totalBorrowUsd: tvl - liquidityUsd,
        utilizationRate: tvl > 0 ? (tvl - liquidityUsd) / tvl : 0,
        updatedAt: new Date(),
      });
    }

    return results;
  },
};
