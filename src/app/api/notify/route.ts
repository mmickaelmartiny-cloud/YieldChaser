import { NextRequest, NextResponse } from "next/server";
import { sendTopRates, DEFAULT_PROTOCOLS, DEFAULT_ASSETS } from "@/lib/notifications/notify";
import type { Protocol, Stablecoin } from "@/types";
import type { RiskLevel } from "@/lib/risk";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  try {
    const result = await sendTopRates({
      protocols: (searchParams.get("protocols")?.split(",") ?? DEFAULT_PROTOCOLS) as Protocol[],
      chainIds: searchParams.get("chains")?.split(",").map(Number) ?? null,
      assets: (searchParams.get("assets")?.split(",") ?? DEFAULT_ASSETS) as Stablecoin[],
      maxRisk: (searchParams.get("maxRisk") ?? null) as RiskLevel | null,
      top: Math.min(parseInt(searchParams.get("top") ?? "10"), 20),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
