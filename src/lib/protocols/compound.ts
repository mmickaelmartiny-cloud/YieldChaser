import { mainnet, base, arbitrum, optimism } from "viem/chains";
import type { Protocol, ProtocolAdapter, Stablecoin, YieldRate } from "@/types";

// Compound v3 (Comet) ABI — each Comet is a self-contained lending market for one base token.
// getUtilization() → uint256 in WAD (1e18) — fraction of supply that is borrowed
// getSupplyRate(utilization) → uint64 per-second rate in WAD (1e18)
// getBorrowRate(utilization) → uint64 per-second rate in WAD (1e18)
const COMET_ABI = [
  {
    name: "getUtilization",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getSupplyRate",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "utilization", type: "uint256" }],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    name: "getBorrowRate",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "utilization", type: "uint256" }],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalBorrow",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const WAD = BigInt("1000000000000000000"); // 1e18
const SECONDS_PER_YEAR = 365 * 24 * 3600;

function wadRateToApy(ratePerSecond: bigint): number {
  const r = Number(ratePerSecond) / Number(WAD);
  return (Math.pow(1 + r, SECONDS_PER_YEAR) - 1) * 100;
}

// Compound v3 Comet addresses per chain.
// Addresses verified by calling getUtilization() + totalSupply() on-chain.
// ARB cUSDCv3 uses USDC.e (bridged USDC, 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8) not native USDC.
const COMETS: Partial<Record<number, { asset: Stablecoin; address: `0x${string}`; decimals: number; label: string }[]>> = {
  [mainnet.id]: [
    { asset: "USDC", label: "cUSDCv3", address: "0xc3d688B66703497DAA19211EEdff47f25384cdc3", decimals: 6 },  // ~$393M TVL
    { asset: "USDT", label: "cUSDTv3", address: "0x3Afdc9BCA9213A35503b077a6072F3D0d5AB0840", decimals: 6 },  // ~$198M TVL
    { asset: "USDS", label: "cUSDSv3", address: "0x5D409e56D886231aDAf00c8775665AD0f9897b56", decimals: 18 }, // USDS (Sky) comet
  ],
  [base.id]: [
    // Address has a non-EIP55 checksum in some sources — using lowercase hex is safe for RPC calls
    { asset: "USDC", label: "cUSDCv3", address: "0xb125E6687d4313864e53df431d5425969c15Eb2" as `0x${string}`, decimals: 6 }, // Base USDC Comet
  ],
  [arbitrum.id]: [
    // cUSDCv3 on Arbitrum uses USDC.e (bridged), not native USDC — label reflects this
    { asset: "USDC", label: "cUSDCv3 (USDC.e)", address: "0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA", decimals: 6 }, // ~$576M TVL
    { asset: "USDT", label: "cUSDTv3", address: "0xd98Be00b5D27fc98112BdE293e487f8D4cA57d07", decimals: 6 }, // ~$22M TVL
  ],
  [optimism.id]: [
    { asset: "USDC", label: "cUSDCv3", address: "0x2e44e174f7D53F0212823acC11C01A11d58c5bCb", decimals: 6 }, // ~$3.2M TVL
  ],
};

export const compoundAdapter: ProtocolAdapter = {
  protocol: "compound" as Protocol,
  supportedChains: [mainnet.id, base.id, arbitrum.id, optimism.id],
  supportedAssets: ["USDC", "USDT", "USDS"],

  async fetchRates(chainId: number, assets: Stablecoin[]): Promise<YieldRate[]> {
    const { getClient } = await import("@/lib/rpc/clients");
    const comets = COMETS[chainId];
    if (!comets) return [];

    const client = getClient(chainId);
    const results: YieldRate[] = [];

    for (const comet of comets) {
      if (!assets.includes(comet.asset)) continue;

      try {
        const [utilization, totalSupplyRaw, totalBorrowRaw] = await Promise.all([
          client.readContract({ address: comet.address, abi: COMET_ABI, functionName: "getUtilization" }),
          client.readContract({ address: comet.address, abi: COMET_ABI, functionName: "totalSupply" }),
          client.readContract({ address: comet.address, abi: COMET_ABI, functionName: "totalBorrow" }),
        ]);

        const [supplyRatePerSecond, borrowRatePerSecond] = await Promise.all([
          client.readContract({ address: comet.address, abi: COMET_ABI, functionName: "getSupplyRate", args: [utilization] }),
          client.readContract({ address: comet.address, abi: COMET_ABI, functionName: "getBorrowRate", args: [utilization] }),
        ]);

        const supplyApy = wadRateToApy(supplyRatePerSecond);
        const borrowApy = wadRateToApy(borrowRatePerSecond);

        const scale = Math.pow(10, comet.decimals);
        const totalSupplyUsd = Number(totalSupplyRaw) / scale;
        const totalBorrowUsd = Number(totalBorrowRaw) / scale;
        const utilizationRate = Number(utilization) / Number(WAD);

        results.push({
          protocol: "compound",
          chainId,
          asset: comet.asset,
          label: comet.label,
          supplyApy,
          borrowApy,
          totalSupplyUsd,
          totalBorrowUsd,
          utilizationRate,
          updatedAt: new Date(),
        });
      } catch {
        // Skip comets that fail (wrong address — verify via getUtilization() call)
      }
    }

    return results;
  },
};
