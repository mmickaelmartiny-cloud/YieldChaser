"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useYieldRates } from "@/hooks/useYieldRates";
import { useRateHistory } from "@/hooks/useRateHistory";
import { CHAIN_CONFIG } from "@/lib/chains";
import type { Stablecoin } from "@/types";

const ASSETS: Stablecoin[] = ["USDC", "USDT", "DAI", "USDS"];

const PROTOCOL_COLORS: Record<string, string> = {
  aave: "#B6509E",
  morpho: "#2470FF",
  euler: "#E0621A",
  compound: "#00D395",
};

export function RateChart() {
  const [asset, setAsset] = useState<Stablecoin>("USDC");
  const { data: rates } = useYieldRates();
  const history = useRateHistory(rates);

  // Collect all unique protocol+chain keys that appear in history for this asset
  const keys = new Set<string>();
  for (const entry of history) {
    for (const r of entry.rates) {
      if (r.a === asset) keys.add(`${r.p}-${r.c}`);
    }
  }

  // Build Recharts data: one object per snapshot
  const chartData = history.map((entry) => {
    const point: Record<string, number | string> = {
      time: new Date(entry.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    for (const r of entry.rates) {
      if (r.a === asset) point[`${r.p}-${r.c}`] = r.s;
    }
    return point;
  });

  return (
    <div>
      {/* Asset selector */}
      <div className="flex gap-2 mb-4">
        {ASSETS.map((a) => (
          <button
            key={a}
            onClick={() => setAsset(a)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              asset === a
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {chartData.length < 2 ? (
        <div className="flex items-center justify-center h-52 text-sm text-muted-foreground border rounded-lg">
          Collecting data — chart will appear after a few refreshes (every 60s)
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 24, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-10" stroke="currentColor" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              tick={{ fontSize: 11 }}
              width={48}
            />
            <Tooltip
              formatter={(v, key) => {
                const [protocol, chainId] = String(key).split("-");
                const chain = CHAIN_CONFIG[Number(chainId)];
                return [`${Number(v).toFixed(2)}%`, `${protocol} ${chain?.shortName ?? chainId}`];
              }}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Legend
              formatter={(key: string) => {
                const [protocol, chainId] = key.split("-");
                const chain = CHAIN_CONFIG[Number(chainId)];
                return `${protocol} ${chain?.shortName ?? chainId}`;
              }}
            />
            {[...keys].map((key) => {
              const [protocol] = key.split("-");
              return (
                <Line
                  key={key}
                  dataKey={key}
                  stroke={PROTOCOL_COLORS[protocol] ?? "#888"}
                  dot={false}
                  strokeWidth={2}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
