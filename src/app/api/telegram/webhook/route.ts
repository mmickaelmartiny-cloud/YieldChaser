import { NextRequest, NextResponse } from "next/server";
import { sendTopRates, DEFAULT_PROTOCOLS, DEFAULT_ASSETS } from "@/lib/notifications/notify";
import { sendTelegramMessage } from "@/lib/notifications/telegram";
import type { Protocol, Stablecoin } from "@/types";
import type { RiskLevel } from "@/lib/risk";

const HELP = `<b>Commandes disponibles :</b>

/top — top 10 par défaut
/top 5 — top N

<b>Filtres (optionnels) :</b>
protocols=aave,euler,morpho
chains=1,8453,42161,10
assets=USDC,USDT,DAI
maxRisk=low|medium|high

<b>Exemples :</b>
/top protocols=aave maxRisk=low
/top 5 chains=1 assets=USDC
/top protocols=morpho,euler top=10`;

function parseCommand(text: string) {
  const parts = text.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();

  const opts: Record<string, string> = {};
  let top = 10;

  for (const part of parts.slice(1)) {
    if (/^\d+$/.test(part)) {
      top = parseInt(part);
    } else if (part.includes("=")) {
      const [key, val] = part.split("=");
      opts[key] = val;
    }
  }

  if (opts.top) top = parseInt(opts.top);

  return { cmd, top, opts };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = body?.message;
  if (!message?.text) return NextResponse.json({ ok: true });

  const text: string = message.text;

  if (text.startsWith("/start") || text.startsWith("/help")) {
    await sendTelegramMessage(HELP);
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith("/top") || text.startsWith("/notify")) {
    const { top, opts } = parseCommand(text);

    try {
      await sendTopRates({
        protocols: opts.protocols
          ? (opts.protocols.split(",").map((p) => p === "morpho" ? "metamorpho" : p) as Protocol[])
          : DEFAULT_PROTOCOLS,
        chainIds: opts.chains ? opts.chains.split(",").map(Number) : null,
        assets: opts.assets ? (opts.assets.split(",") as Stablecoin[]) : DEFAULT_ASSETS,
        maxRisk: (opts.maxRisk ?? null) as RiskLevel | null,
        top,
      });
    } catch (e) {
      await sendTelegramMessage(`❌ Erreur : ${e instanceof Error ? e.message : String(e)}`);
    }

    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(HELP);
  return NextResponse.json({ ok: true });
}
