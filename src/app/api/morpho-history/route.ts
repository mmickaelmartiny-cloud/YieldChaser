import { NextRequest, NextResponse } from "next/server";

const MORPHO_API = "https://blue-api.morpho.org/graphql";
const MIN_TVL_USD = 1_000_000;

type Interval = "HOUR" | "DAY";

function periodToOptions(period: string): { interval: Interval; startTimestamp: number } {
  const now = Math.floor(Date.now() / 1000);
  if (period === "30d") return { interval: "DAY", startTimestamp: now - 30 * 86400 };
  if (period === "7d") return { interval: "DAY", startTimestamp: now - 7 * 86400 };
  return { interval: "HOUR", startTimestamp: now - 86400 }; // 24h
}

export interface VaultHistory {
  name: string;
  asset: string;
  data: Array<{ x: number; y: number }>; // x = unix ms, y = APY %
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const period = searchParams.get("period") ?? "7d";
  const address = searchParams.get("address");
  const chainId = searchParams.get("chainId");
  const chainIds = chainId ? [Number(chainId)] : [1, 8453, 42161, 10, 999];
  const assets = searchParams.get("assets")?.split(",") ?? ["USDC", "USDT", "DAI", "USDS"];

  const { interval, startTimestamp } = periodToOptions(period);

  // Build where clause: specific vault address, or top vaults for assets
  const whereClause = address && chainId
    ? `address_in: ["${address}"], chainId_in: [${chainId}]`
    : `chainId_in: [${chainIds.join(",")}]`;

  const query = `{
    vaults(
      where: { ${whereClause} }
      first: ${address ? 1 : 100}
      orderBy: TotalAssetsUsd
      orderDirection: Desc
    ) {
      items {
        name
        asset { symbol }
        state { totalAssetsUsd }
        historicalState {
          netApy(options: { interval: ${interval}, startTimestamp: ${startTimestamp} }) {
            x
            y
          }
        }
      }
    }
  }`;

  try {
    const res = await fetch(MORPHO_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(15_000),
    });

    const json = await res.json();
    const items: {
      name: string;
      asset: { symbol: string } | null;
      state: { totalAssetsUsd: number } | null;
      historicalState: { netApy: { x: number; y: number }[] } | null;
    }[] = json?.data?.vaults?.items ?? [];

    const results: VaultHistory[] = items
      .filter((v) => {
        const symbol = v.asset?.symbol ?? "";
        const tvl = v.state?.totalAssetsUsd ?? 0;
        // When querying a specific vault by address, skip TVL filter
        return assets.includes(symbol) && (address ? true : tvl >= MIN_TVL_USD);
      })
      .map((v) => ({
        name: v.name,
        asset: v.asset!.symbol,
        data: (v.historicalState?.netApy ?? []).map((p) => ({
          x: p.x * 1000,
          y: parseFloat((p.y * 100).toFixed(4)),
        })),
      }))
      .filter((v) => v.data.length >= 2);

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
