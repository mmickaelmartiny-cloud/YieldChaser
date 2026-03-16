import type { YieldRate } from "@/types";

export type RiskLevel = "low" | "medium" | "high";

export const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

const COLLATERAL_RISK: Record<string, RiskLevel> = {
  sUSDe: "low", stUSDS: "low", sUSDS: "low", USDS: "low", DAI: "low", USDC: "low", USDT: "low",
  wstETH: "low", cbETH: "low", rETH: "low", stETH: "low", WETH: "low", superOETHb: "low",
  WHYPE: "low", kHYPE: "low", wstHYPE: "low",
  wBTC: "low", cbBTC: "low", WBTC: "low",
  xAUT: "low", cbXRP: "low",
  yoUSD: "medium", yoUSd: "medium", THBILL: "medium", thBILL: "medium",
  syrupUSDC: "medium", syrupUSDT: "medium",
  sUSDAI: "medium", "PT-USDAI": "medium", "PT-sUSDAI": "medium",
};

function getExposureRisk(exposure: { symbol: string; pct: number }[] | undefined): RiskLevel | null {
  if (!exposure || exposure.length === 0) return null;
  const hasHigh = exposure.some(({ symbol }) => (COLLATERAL_RISK[symbol] ?? "high") === "high");
  if (hasHigh) {
    const safePct = exposure
      .filter(({ symbol }) => RISK_RANK[COLLATERAL_RISK[symbol] ?? "high"] < RISK_RANK["high"])
      .reduce((sum, { pct }) => sum + pct, 0);
    return safePct > 90 ? "medium" : "high";
  }
  return exposure.reduce<RiskLevel>((acc, { symbol }) => {
    const risk = COLLATERAL_RISK[symbol] ?? "high";
    return RISK_RANK[risk] > RISK_RANK[acc] ? risk : acc;
  }, "low");
}

export function computeRisk(rate: YieldRate): RiskLevel | null {
  return rate.utilizationRate > 0.9 ? "high" : getExposureRisk(rate.exposure);
}
