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
  name: string;
  asset: { symbol: string } | null;
  state: {
    totalAssetsUsd: number;
    netApy: number;
    curators: { name: string }[];
    allocation: {
      supplyAssetsUsd: number | null;
      market: {
        state: { supplyAssetsUsd: number | null; borrowAssetsUsd: number | null } | null;
      };
    }[];
  } | null;
};

export const metamorphoAdapter: ProtocolAdapter = {
  protocol: "metamorpho" as Protocol,
  supportedChains: [1, 8453, 42161, 10],
  supportedAssets: ["USDC", "USDT", "DAI", "USDS"],

  async fetchRates(chainId: number, assets: Stablecoin[]): Promise<YieldRate[]> {
    const query = `{
      vaults(
        where: { chainId_in: [${chainId}] }
        first: 100
        orderBy: TotalAssetsUsd
        orderDirection: Desc
      ) {
        items {
          name
          asset { symbol }
          state {
            totalAssetsUsd
            netApy
            curators { name }
            allocation {
              supplyAssetsUsd
              market {
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
    });

    const json = await res.json();
    const items: VaultItem[] = json?.data?.vaults?.items ?? [];
    const results: YieldRate[] = [];

    for (const v of items) {
      const asset = ASSET_MAP[v.asset?.symbol ?? ""];
      if (!asset || !assets.includes(asset)) continue;

      const tvl = v.state?.totalAssetsUsd ?? 0;
      if (tvl < MIN_TVL_USD) continue;

      const netApy = (v.state?.netApy ?? 0) * 100;
      if (netApy > MAX_APY || netApy < 0) continue;

      const curator = v.state?.curators?.[0]?.name;

      // Liquidity = Σ min(vault_allocation_in_market, market_available_liquidity)
      const liquidityUsd = (v.state?.allocation ?? []).reduce((sum, a) => {
        const vaultAlloc = a.supplyAssetsUsd ?? 0;
        const ms = a.market?.state;
        const marketLiq = ms ? (ms.supplyAssetsUsd ?? 0) - (ms.borrowAssetsUsd ?? 0) : 0;
        return sum + Math.min(vaultAlloc, marketLiq);
      }, 0);

      results.push({
        protocol: "metamorpho" as Protocol,
        chainId,
        asset,
        label: v.name,
        curator,
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
