import { protocolAdapters } from "@/lib/protocols";
import { CHAIN_CONFIG } from "@/lib/chains";
import { sendTelegramMessage } from "@/lib/notifications/telegram";
import { computeRisk, RISK_RANK, type RiskLevel } from "@/lib/risk";
import type { Protocol, Stablecoin, YieldRate } from "@/types";

export const DEFAULT_PROTOCOLS: Protocol[] = ["aave", "euler", "metamorpho"];
export const DEFAULT_ASSETS: Stablecoin[] = ["USDC", "USDT", "DAI", "USDS"];

export interface NotifyOptions {
  protocols?: Protocol[];
  chainIds?: number[] | null;
  assets?: Stablecoin[];
  maxRisk?: RiskLevel | null;
  top?: number;
}

const RISK_EMOJI: Record<RiskLevel, string> = { low: "🟢", medium: "🟡", high: "🔴" };

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);

function formatRate(rate: YieldRate): string {
  const chain = CHAIN_CONFIG[rate.chainId]?.shortName ?? `chain:${rate.chainId}`;
  const apy = rate.supplyApy.toFixed(2);
  const risk = computeRisk(rate);
  const riskTag = risk ? ` ${RISK_EMOJI[risk]}` : "";
  const protocolLabel = rate.protocol === "metamorpho" ? "MORPHO" : rate.protocol.toUpperCase();
  return `${protocolLabel} · ${rate.asset} · ${chain}${riskTag} — <b>${apy}% APY</b>`;
}

export async function sendTopRates(opts: NotifyOptions = {}): Promise<{ sent: number; message: string }> {
  const protocols = opts.protocols ?? DEFAULT_PROTOCOLS;
  const chainIds = opts.chainIds ?? null;
  const assets = opts.assets ?? DEFAULT_ASSETS;
  const maxRisk = opts.maxRisk ?? null;
  const top = Math.min(opts.top ?? 10, 20);

  const results = await Promise.allSettled(
    protocols.flatMap((protocol) => {
      const adapter = protocolAdapters[protocol];
      if (!adapter) return [];
      const chains = chainIds ?? adapter.supportedChains;
      return chains.map((chainId) =>
        withTimeout(adapter.fetchRates(chainId, assets), 15_000)
      );
    })
  );

  let rates = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<YieldRate[]>).value)
    .filter((r) => isFinite(r.supplyApy) && r.supplyApy > 0 && r.supplyApy < 50);

  if (maxRisk) {
    rates = rates.filter((r) => {
      const risk = computeRisk(r) ?? "high";
      return RISK_RANK[risk] <= RISK_RANK[maxRisk];
    });
  }

  rates = rates.sort((a, b) => b.supplyApy - a.supplyApy).slice(0, top);

  if (rates.length === 0) {
    const msg = "Aucun rendement disponible avec ces filtres.";
    await sendTelegramMessage(msg);
    return { sent: 0, message: msg };
  }

  const now = new Date().toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const filterDesc = [
    protocols.map((p) => (p === "metamorpho" ? "morpho" : p)).join(", "),
    chainIds ? chainIds.map((id) => CHAIN_CONFIG[id]?.shortName ?? id).join(", ") : "toutes chains",
    maxRisk ? `risk ≤ ${maxRisk}` : null,
  ].filter(Boolean).join(" · ");

  const lines = [
    `🏆 <b>Top ${top} rendements DeFi</b>`,
    `<i>${filterDesc}</i>`,
    "",
    ...rates.map((r, i) => `${i + 1}. ${formatRate(r)}`),
    "",
    `🕐 ${now}`,
  ];

  const message = lines.join("\n");
  await sendTelegramMessage(message);
  return { sent: rates.length, message };
}
