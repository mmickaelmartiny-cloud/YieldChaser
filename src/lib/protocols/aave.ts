import { mainnet, base, arbitrum, optimism } from "viem/chains";
import type { Protocol, ProtocolAdapter, Stablecoin, YieldRate } from "@/types";

// AAVE V3 Pool Data Provider ABI (minimal)
const POOL_DATA_PROVIDER_ABI = [
  {
    name: "getReserveData",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [
      { name: "unbacked", type: "uint256" },
      { name: "accruedToTreasuryScaled", type: "uint256" },
      { name: "totalAToken", type: "uint256" },
      { name: "totalStableDebt", type: "uint256" },
      { name: "totalVariableDebt", type: "uint256" },
      { name: "liquidityRate", type: "uint256" },
      { name: "variableBorrowRate", type: "uint256" },
      { name: "stableBorrowRate", type: "uint256" },
      { name: "averageStableBorrowRate", type: "uint256" },
      { name: "liquidityIndex", type: "uint256" },
      { name: "variableBorrowIndex", type: "uint256" },
      { name: "lastUpdateTimestamp", type: "uint40" },
    ],
  },
] as const;

// AAVE V3 Pool Data Provider addresses per chain
const POOL_DATA_PROVIDER: Partial<Record<number, `0x${string}`>> = {
  [mainnet.id]: "0x0a16f2FCC0D44FaE41cc54e079281D84A363bECD",
  [base.id]: "0x0F43731EB8d45A581f4a36DD74F5f358bc90C73A",
  [arbitrum.id]: "0x243Aa95cAC2a25651eda86e80bEe66114413c43b",
  [optimism.id]: "0x243Aa95cAC2a25651eda86e80bEe66114413c43b",
};

const ASSET_DECIMALS: Record<Stablecoin, number> = {
  USDC: 6,
  USDT: 6,
  DAI: 18,
  USDS: 18,
};

// Asset addresses per chain
const ASSET_ADDRESSES: Partial<Record<number, Partial<Record<Stablecoin, `0x${string}`>>>> = {
  [mainnet.id]: {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  },
  [base.id]: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  [arbitrum.id]: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
  },
  [optimism.id]: {
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
  },
};

// RAY = 1e27, used by AAVE for rate precision
const RAY = BigInt("1000000000000000000000000000");

const SECONDS_PER_YEAR = 365 * 24 * 3600;

function rayToApy(ray: bigint): number {
  // AAVE liquidityRate/variableBorrowRate are annual rates in RAY (1e27).
  // Divide by SECONDS_PER_YEAR to get per-second rate before compounding.
  const apr = Number(ray) / Number(RAY);
  return (Math.pow(1 + apr / SECONDS_PER_YEAR, SECONDS_PER_YEAR) - 1) * 100;
}

export const aaveAdapter: ProtocolAdapter = {
  protocol: "aave" as Protocol,
  supportedChains: [mainnet.id, base.id, arbitrum.id, optimism.id],
  supportedAssets: ["USDC", "USDT", "DAI"],

  async fetchRates(chainId: number, assets: Stablecoin[]): Promise<YieldRate[]> {
    const { getClient } = await import("@/lib/rpc/clients");
    const providerAddress = POOL_DATA_PROVIDER[chainId];
    const assetAddresses = ASSET_ADDRESSES[chainId];
    if (!providerAddress || !assetAddresses) return [];

    const client = getClient(chainId);
    const results: YieldRate[] = [];

    for (const asset of assets) {
      const assetAddress = assetAddresses[asset];
      if (!assetAddress) continue;

      try {
        const data = await client.readContract({
          address: providerAddress,
          abi: POOL_DATA_PROVIDER_ABI,
          functionName: "getReserveData",
          args: [assetAddress],
        });

        const [, , totalAToken, , totalVariableDebt, liquidityRate, variableBorrowRate] = data;
        const scale = Math.pow(10, ASSET_DECIMALS[asset]);
        const totalSupplyUsd = Number(totalAToken) / scale;
        const totalBorrowUsd = Number(totalVariableDebt) / scale;

        results.push({
          protocol: "aave",
          chainId,
          asset,
          supplyApy: rayToApy(liquidityRate),
          borrowApy: rayToApy(variableBorrowRate),
          totalSupplyUsd,
          totalBorrowUsd,
          utilizationRate: totalSupplyUsd > 0 ? totalBorrowUsd / totalSupplyUsd : 0,
          updatedAt: new Date(),
        });
      } catch {
        // Skip failed asset on this chain
      }
    }

    return results;
  },
};
