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
const MARKETS: Partial<Record<number, { asset: Stablecoin; decimals: number; params: MarketParams; label: string; curator?: string }[]>> = {
  [mainnet.id]: [
    // ── USDC markets ─────────────────────────────────────────────────────────
    { asset: "USDC", decimals: 6, label: "USDC/cbBTC 86%",   curator: "Gauntlet",   params: { loanToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", collateralToken: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", oracle: "0xA6D6950c9F177F1De7f7757FB33539e3Ec60182a", irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC", lltv: 860000000000000000n } }, // $422M
    { asset: "USDC", decimals: 6, label: "USDC/wBTC 86%",    curator: "Gauntlet",   params: { loanToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", collateralToken: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", oracle: "0xDddd770BADd886dF3864029e4B377B5F6a2B6b83", irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC", lltv: 860000000000000000n } }, // $89M
    { asset: "USDC", decimals: 6, label: "USDC/wstETH 86%",  curator: "Steakhouse", params: { loanToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", collateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", oracle: "0x48F7E36EB6B826B2dF4B2E630B62Cd25e89E40e2", irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC", lltv: 860000000000000000n } }, // $77M
    { asset: "USDC", decimals: 6, label: "USDC/stUSDS 86%",  curator: undefined,    params: { loanToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", collateralToken: "0x99CD4Ec3f88A45940936F469E4bB72A2A701EEB9", oracle: "0xba3D2Dc1670763c6729CC923A922C7513C0f9DD0", irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC", lltv: 860000000000000000n } }, // $44M
    // ── USDT markets ─────────────────────────────────────────────────────────
    { asset: "USDT", decimals: 6, label: "USDT/sUSDS 96.5%", curator: "Steakhouse", params: { loanToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7", collateralToken: "0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD", oracle: "0x0C426d174FC88B7A25d59945Ab2F7274Bf7B4C79", irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC", lltv: 965000000000000000n } }, // $284M
    { asset: "USDT", decimals: 6, label: "USDT/wstETH 86%",  curator: "Steakhouse", params: { loanToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7", collateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", oracle: "0x95DB30fAb9A3754e42423000DF27732CB2396992", irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC", lltv: 860000000000000000n } }, // $65M
    { asset: "USDT", decimals: 6, label: "USDT/wBTC 86%",    curator: "Gauntlet",   params: { loanToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7", collateralToken: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", oracle: "0x008bF4B1cDA0cc9f0e882E0697f036667652E1ef", irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC", lltv: 860000000000000000n } }, // $62M
    { asset: "USDT", decimals: 6, label: "USDT/stUSDS 86%",  curator: undefined,    params: { loanToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7", collateralToken: "0x99CD4Ec3f88A45940936F469E4bB72A2A701EEB9", oracle: "0x9C56D403d26C0aE00FA2e767e12F6b588c203B3c", irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC", lltv: 860000000000000000n } }, // $34M
    { asset: "USDT", decimals: 6, label: "USDT/cbBTC 86%",   curator: "Gauntlet",   params: { loanToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7", collateralToken: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", oracle: "0x0E053750DFA4E809E5f7b119832C799c2aA138ac", irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC", lltv: 860000000000000000n } }, // $15M
    // ── DAI markets ──────────────────────────────────────────────────────────
    { asset: "DAI",  decimals: 18, label: "DAI/sUSDe 86%",   curator: "SparkDAO",   params: { loanToken: "0x6B175474E89094C44Da98b954EedeAC495271d0F", collateralToken: "0x9D39A5DE30e57443BfF2A8307A4256c8797A3497", oracle: "0x5D916980D5Ae1737a8330Bf24dF812b2911Aae25", irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC", lltv: 860000000000000000n } }, // $2.8M
    // ── USDS markets ─────────────────────────────────────────────────────────
    { asset: "USDS", decimals: 18, label: "USDS/stUSDS 86%", curator: "SparkDAO",   params: { loanToken: "0xdC035D45d973E3EC169d2276DDab16f1e407384F", collateralToken: "0x99CD4Ec3f88A45940936F469E4bB72A2A701EEB9", oracle: "0x0A976226d113B67Bd42D672Ac9f83f92B44b454C", irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC", lltv: 860000000000000000n } }, // $7.6M
    { asset: "USDS", decimals: 18, label: "USDS/wstETH 86%", curator: "SparkDAO",   params: { loanToken: "0xdC035D45d973E3EC169d2276DDab16f1e407384F", collateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", oracle: "0xc9A9440d1545047b2Ce3624DB425410cF2EAE292", irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC", lltv: 860000000000000000n } }, // $2.6M
    { asset: "USDS", decimals: 18, label: "USDS/cbBTC 86%",  curator: "SparkDAO",   params: { loanToken: "0xdC035D45d973E3EC169d2276DDab16f1e407384F", collateralToken: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", oracle: "0xA5AEb90F9f122989fE69Ae6224Ed923A0caF33B4", irm: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC", lltv: 860000000000000000n } }, // $2.6M
  ],
  [base.id]: [
    // ── USDC markets ─────────────────────────────────────────────────────────
    { asset: "USDC", decimals: 6, label: "USDC/cbBTC 86%",  curator: "Gauntlet", params: { loanToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", collateralToken: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", oracle: "0x663BECd10daE6C4A3Dcd89F1d76c1174199639B9", irm: "0x46415998764C29aB2a25CbeA6254146D50D22687", lltv: 860000000000000000n } }, // $1.1B
    { asset: "USDC", decimals: 6, label: "USDC/WETH 86%",   curator: "Gauntlet", params: { loanToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", collateralToken: "0x4200000000000000000000000000000000000006", oracle: "0xFEa2D58cEfCb9fcb597723c6bAE66fFE4193aFE4", irm: "0x46415998764C29aB2a25CbeA6254146D50D22687", lltv: 860000000000000000n } }, // $55M
    { asset: "USDC", decimals: 6, label: "USDC/cbXRP 62.5%", curator: undefined, params: { loanToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", collateralToken: "0xcb585250f852C6c6bf90434AB21A00f02833a4af", oracle: "0x031b2EFC8d70042Ac8d9f5c793c4149eC4b60fdE", irm: "0x46415998764C29aB2a25CbeA6254146D50D22687", lltv: 625000000000000000n } }, // $9.8M
    { asset: "USDC", decimals: 6, label: "USDC/cbETH 86%",  curator: "Gauntlet", params: { loanToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", collateralToken: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", oracle: "0xb40d93F44411D8C09aD17d7F88195eF9b05cCD96", irm: "0x46415998764C29aB2a25CbeA6254146D50D22687", lltv: 860000000000000000n } }, // $1.8M
    { asset: "USDC", decimals: 6, label: "USDC/cbETH 77%",  curator: undefined,  params: { loanToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", collateralToken: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", oracle: "0x97FF9CbD7E77348b2B8FfBB883bF29452aD18295", irm: "0x46415998764C29aB2a25CbeA6254146D50D22687", lltv: 770000000000000000n } }, // $1.2M
    { asset: "USDC", decimals: 6, label: "USDC/wstETH 86%", curator: undefined,  params: { loanToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", collateralToken: "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452", oracle: "0xD7A1abA119a236Fea5BBC5cAC6836465cbe9289A", irm: "0x46415998764C29aB2a25CbeA6254146D50D22687", lltv: 860000000000000000n } }, // $1.1M
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

    for (const { asset, decimals, label, curator, params } of markets) {
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

        results.push({ protocol: "morpho", chainId, asset, label, curator, supplyApy, borrowApy, totalSupplyUsd, totalBorrowUsd, utilizationRate, updatedAt: new Date() });
      } catch {
        // Skip markets that fail
      }
    }

    return results;
  },
};
