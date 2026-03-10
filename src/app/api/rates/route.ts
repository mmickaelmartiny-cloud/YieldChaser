import { NextRequest, NextResponse } from "next/server";
import { protocolAdapters } from "@/lib/protocols";
import type { Protocol, Stablecoin } from "@/types";

const DEFAULT_PROTOCOLS: Protocol[] = ["aave", "euler", "compound", "metamorpho"];
const DEFAULT_ASSETS: Stablecoin[] = ["USDC", "USDT", "DAI", "USDS"];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const protocols = (searchParams.get("protocols")?.split(",") ?? DEFAULT_PROTOCOLS) as Protocol[];
  const chainIds = searchParams.get("chains")?.split(",").map(Number) ?? null;
  const assets = (searchParams.get("assets")?.split(",") ?? DEFAULT_ASSETS) as Stablecoin[];

  const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
    Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

  const results = await Promise.allSettled(
    protocols.flatMap((protocol) => {
      const adapter = protocolAdapters[protocol];
      if (!adapter) return [];
      const chains = chainIds ?? adapter.supportedChains;
      return chains.map((chainId) => withTimeout(adapter.fetchRates(chainId, assets), 15_000));
    })
  );

  const rates = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof protocolAdapters["aave"]["fetchRates"]>>>).value)
    .filter((r) => isFinite(r.supplyApy) && isFinite(r.borrowApy));

  return NextResponse.json(rates);
}
