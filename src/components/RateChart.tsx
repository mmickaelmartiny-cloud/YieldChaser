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
import { useRateHistory } from "@/hooks/useRateHistory";
import { CHAIN_CONFIG } from "@/lib/chains";
import type { Stablecoin, YieldRate } from "@/types";

const ASSETS: Stablecoin[] = ["USDC", "USDT", "DAI", "USDS"];

const PROTOCOL_COLORS: Record<string, string> = {
  aave: "#C46AAE",
  morpho: "#4D8AFF",
  euler: "#E8743A",
  compound: "#00D395",
};

interface Props {
  rates: YieldRate[] | undefined;
}

export function RateChart({ rates }: Props) {
  const [asset, setAsset] = useState<Stablecoin>("USDC");
  const history = useRateHistory(rates);

  const keys = new Set<string>();
  for (const entry of history) {
    for (const r of entry.rates) {
      if (r.a === asset) keys.add(`${r.p}-${r.c}`);
    }
  }

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
    <div className="space-y-3">
      {/* Asset selector */}
      <div className="flex gap-2">
        {ASSETS.map((a) => (
          <button
            key={a}
            onClick={() => setAsset(a)}
            className={`col-toggle ${asset === a ? "active" : ""}`}
            style={{ borderRadius: "var(--radius)" }}
          >
            {a}
          </button>
        ))}
      </div>

      {chartData.length < 2 ? (
        <div
          className="flex items-center justify-center h-44 text-xs uppercase tracking-widest"
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--muted-foreground)",
          }}
        >
          ⟳ collecting data — chart appears after a few refreshes
        </div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "12px 8px 4px 0" }}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="rgba(150, 100, 30, 0.15)"
                horizontal
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "var(--font-jetbrains)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "var(--font-jetbrains)" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: "12px",
                  fontFamily: "var(--font-jetbrains)",
                  color: "var(--foreground)",
                }}
                labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }}
                formatter={(v, key) => {
                  const [protocol, chainId] = String(key).split("-");
                  const chain = CHAIN_CONFIG[Number(chainId)];
                  return [`${Number(v).toFixed(2)}%`, `${protocol} ${chain?.shortName ?? chainId}`];
                }}
                labelFormatter={(label) => `⟳ ${label}`}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", fontFamily: "var(--font-jetbrains)", paddingTop: "8px" }}
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
                    strokeWidth={1.5}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
