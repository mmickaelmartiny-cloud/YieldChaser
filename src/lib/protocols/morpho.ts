import { keccak256, encodeAbiParameters, parseAbiParameters } from "viem";
import { mainnet, base } from "viem/chains";
import type { Protocol, ProtocolAdapter, Stablecoin, YieldRate } from "@/types";

// Morpho Blue singleton — same address on all supported chains
const MORPHO_BLUE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb" as const;

// AdaptiveCurveIrm addresses per chain
const IRM: Partial<Record<number, `0x${string}`>> = {
  [mainnet.id]: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC",
  [base.id]: "0x46415998764C29aB2a25CbeA6254146D50D22687",
};

const MORPHO_BLUE_ABI = [
  {
    name: "market",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      { name: "totalSupplyAssets", type: "uint128" },
      { name: "totalSupplyShares", type: "uint128" },
      { name: "totalBorrowAssets", type: "uint128" },
      { name: "totalBorrowShares", type: "uint128" },
      { name: "lastUpdate", type: "uint128" },
      { name: "fee", type: "uint128" },
    ],
  },
] as const;

const IRM_ABI = [
  {
    name: "borrowRateView",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
      {
        name: "market",
        type: "tuple",
        components: [
          { name: "totalSupplyAssets", type: "uint128" },
          { name: "totalSupplyShares", type: "uint128" },
          { name: "totalBorrowAssets", type: "uint128" },
          { name: "totalBorrowShares", type: "uint128" },
          { name: "lastUpdate", type: "uint128" },
          { name: "fee", type: "uint128" },
        ],
      },
    ],
    outputs: [{ name: "borrowRate", type: "uint256" }],
  },
] as const;

interface MarketParams {
  loanToken: `0x${string}`;
  collateralToken: `0x${string}`;
  oracle: `0x${string}`;
  irm: `0x${string}`;
  lltv: bigint;
}

function computeMarketId(params: MarketParams): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("address, address, address, address, uint256"),
      [params.loanToken, params.collateralToken, params.oracle, params.irm, params.lltv]
    )
  );
}

// WAD = 1e18 (Morpho uses WAD precision for rates)
const WAD = BigInt("1000000000000000000");
const SECONDS_PER_YEAR = 365 * 24 * 3600;

function wadRateToApy(ratePerSecond: bigint): number {
  const r = Number(ratePerSecond) / Number(WAD);
  return (Math.pow(1 + r, SECONDS_PER_YEAR) - 1) * 100;
}

// Well-known Morpho Blue markets for stablecoins.
// Each entry maps to a specific market (loan token + collateral + oracle + irm + lltv).
// Oracle addresses can be verified at https://app.morpho.org or via on-chain events.
const MARKETS: Partial<Record<number, { asset: Stablecoin; decimals: number; params: MarketParams; label: string }[]>> = {
  [mainnet.id]: [
    // USDC / wstETH — flagship market, allocated by steakUSDC vault
    {
      asset: "USDC",
      decimals: 6,
      label: "USDC/wstETH 86%",
      params: {
        loanToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",    // USDC
        collateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH
        oracle: "0x48F7E36EB6B826B2dF4B2E630B62Cd25e89E40e2",          // Morpho ChainLink wstETH/USDC
        irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC",
        lltv: 860000000000000000n, // 86%
      },
    },
    // USDC / wBTC — high-liquidity market
    {
      asset: "USDC",
      decimals: 6,
      label: "USDC/wBTC 86%",
      params: {
        loanToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",    // USDC
        collateralToken: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // wBTC
        oracle: "0xDddd770BADd886dF3864029e4B377B5F6a2B6b83",          // Morpho ChainLink wBTC/USDC
        irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC",
        lltv: 860000000000000000n, // 86%
      },
    },
    // USDT / wstETH
    {
      asset: "USDT",
      decimals: 6,
      label: "USDT/wstETH 86%",
      params: {
        loanToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7",      // USDT
        collateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH
        oracle: "0x95DB30fAb9A3754e42423000DF27732CB2396992",
        irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC",
        lltv: 860000000000000000n, // 86%
      },
    },
    // DAI / sUSDe — top DAI market by TVL; market ID verified via blue-api.morpho.org
    {
      asset: "DAI",
      decimals: 18,
      label: "DAI/sUSDe 86%",
      params: {
        loanToken: "0x6B175474E89094C44Da98b954EedeAC495271d0F",      // DAI
        collateralToken: "0x9D39A5DE30e57443BfF2A8307A4256c8797A3497", // sUSDe
        oracle: "0x5D916980D5Ae1737a8330Bf24dF812b2911Aae25",
        irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC",
        lltv: 860000000000000000n, // 86%
      },
    },
    // USDS / stUSDS — largest USDS market by TVL
    {
      asset: "USDS",
      decimals: 18,
      label: "USDS/stUSDS 86%",
      params: {
        loanToken: "0xdC035D45d973E3EC169d2276DDab16f1e407384F",      // USDS
        collateralToken: "0x99CD4Ec3f88A45940936F469E4bB72A2A701EEB9", // stUSDS
        oracle: "0x0A976226d113B67Bd42D672Ac9f83f92B44b454C",
        irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC",
        lltv: 860000000000000000n, // 86%
      },
    },
    // USDS / wstETH
    {
      asset: "USDS",
      decimals: 18,
      label: "USDS/wstETH 86%",
      params: {
        loanToken: "0xdC035D45d973E3EC169d2276DDab16f1e407384F",      // USDS
        collateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH
        oracle: "0xc9A9440d1545047b2Ce3624DB425410cF2EAE292",
        irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC",
        lltv: 860000000000000000n, // 86%
      },
    },
    // USDS / cbBTC
    {
      asset: "USDS",
      decimals: 18,
      label: "USDS/cbBTC 86%",
      params: {
        loanToken: "0xdC035D45d973E3EC169d2276DDab16f1e407384F",      // USDS
        collateralToken: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", // cbBTC
        oracle: "0xA5AEb90F9f122989fE69Ae6224Ed923A0caF33B4",
        irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC",
        lltv: 860000000000000000n, // 86%
      },
    },
  ],
  [base.id]: [
    // USDC / cbETH on Base
    {
      asset: "USDC",
      decimals: 6,
      label: "USDC/cbETH 86%",
      params: {
        loanToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",    // USDC (Base)
        collateralToken: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", // cbETH
        oracle: "0xb40d93F44411D8C09aD17d7F88195eF9b05cCD96",
        irm: "0x46415998764C29aB2a25CbeA6254146D50D22687",
        lltv: 860000000000000000n, // 86%
      },
    },
  ],
};

export const morphoAdapter: ProtocolAdapter = {
  protocol: "morpho" as Protocol,
  supportedChains: [mainnet.id, base.id],
  supportedAssets: ["USDC", "USDT", "DAI", "USDS"],

  async fetchRates(chainId: number, assets: Stablecoin[]): Promise<YieldRate[]> {
    const { getClient } = await import("@/lib/rpc/clients");
    const markets = MARKETS[chainId];
    const irmAddress = IRM[chainId];
    if (!markets || !irmAddress) return [];

    const client = getClient(chainId);
    const results: YieldRate[] = [];

    // Group markets by asset, then pick the best supply APY per asset
    const byAsset = new Map<Stablecoin, { supplyApy: number; borrowApy: number; totalSupplyUsd: number; totalBorrowUsd: number; utilizationRate: number }>();

    for (const { asset, decimals, params } of markets) {
      if (!assets.includes(asset)) continue;

      try {
        const marketId = computeMarketId(params);

        const marketState = await client.readContract({
          address: MORPHO_BLUE,
          abi: MORPHO_BLUE_ABI,
          functionName: "market",
          args: [marketId],
        });

        const [totalSupplyAssets, , totalBorrowAssets, , , fee] = marketState;
        if (totalSupplyAssets === 0n) continue;

        const borrowRatePerSecond = await client.readContract({
          address: irmAddress,
          abi: IRM_ABI,
          functionName: "borrowRateView",
          args: [
            { loanToken: params.loanToken, collateralToken: params.collateralToken, oracle: params.oracle, irm: params.irm, lltv: params.lltv },
            { totalSupplyAssets, totalSupplyShares: marketState[1], totalBorrowAssets, totalBorrowShares: marketState[3], lastUpdate: marketState[4], fee },
          ],
        });

        const utilizationRate = Number(totalBorrowAssets) / Number(totalSupplyAssets);
        const feeScalar = 1 - Number(fee) / Number(WAD);
        const supplyRatePerSecond = (borrowRatePerSecond * totalBorrowAssets * BigInt(Math.floor(feeScalar * 1e9))) / (totalSupplyAssets * BigInt(1e9));

        const supplyApy = wadRateToApy(supplyRatePerSecond);
        const borrowApy = wadRateToApy(borrowRatePerSecond);

        const scale = Math.pow(10, decimals);
        const totalSupplyUsd = Number(totalSupplyAssets) / scale;
        const totalBorrowUsd = Number(totalBorrowAssets) / scale;

        const existing = byAsset.get(asset);
        if (!existing || supplyApy > existing.supplyApy) {
          byAsset.set(asset, { supplyApy, borrowApy, totalSupplyUsd, totalBorrowUsd, utilizationRate });
        }
      } catch {
        // Skip markets that fail (e.g. wrong oracle address — check TODO comments above)
      }
    }

    for (const [asset, data] of byAsset) {
      results.push({ protocol: "morpho", chainId, asset, updatedAt: new Date(), ...data });
    }

    return results;
  },
};
