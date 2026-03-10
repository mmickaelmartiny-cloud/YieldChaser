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
import { useMorphoHistory } from "@/hooks/useMorphoHistory";
import { CHAIN_CONFIG } from "@/lib/chains";
import type { Stablecoin, YieldRate } from "@/types";

const ASSETS: Stablecoin[] = ["USDC", "USDT", "DAI", "USDS"];
const PERIODS = ["24h", "7d", "30d"] as const;
type Period = (typeof PERIODS)[number];

const PROTOCOL_COLORS: Record<string, string> = {
  aave: "#C46AAE",
  morpho: "#4D8AFF",
  euler: "#E8743A",
  compound: "#00D395",
};

const VAULT_COLORS = [
  "#4D8AFF", "#C46AAE", "#E8743A", "#00D395", "#FFD166",
  "#06D6A0", "#EF476F", "#118AB2", "#F4A261", "#A8DADC",
];

function formatTime(ms: number, period: Period) {
  const d = new Date(ms);
  if (period === "24h") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface Props {
  rates: YieldRate[] | undefined;
}

export function RateChart({ rates }: Props) {
  const [asset, setAsset] = useState<Stablecoin>("USDC");
  const [period, setPeriod] = useState<Period>("7d");

  // 24h — localStorage time series (all protocols)
  const history = useRateHistory(rates);

  // 7d / 30d — Morpho API historical time series
  const { data: morphoHistory, isLoading: morphoLoading } = useMorphoHistory(period, asset);

  // ── 24h chart ────────────────────────────────────────────────────────────
  const keys24h = new Set<string>();
  for (const entry of history) {
    for (const r of entry.rates) {
      if (r.a === asset) keys24h.add(`${r.p}-${r.c}`);
    }
  }
  const chartData24h = history.map((entry) => {
    const point: Record<string, number | string> = {
      time: new Date(entry.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    for (const r of entry.rates) {
      if (r.a === asset) point[`${r.p}-${r.c}`] = r.s;
    }
    return point;
  });

  // ── 7d / 30d chart (Morpho vaults) ────────────────────────────────────────
  const vaults = (morphoHistory ?? []).filter((v) => v.asset === asset).slice(0, 10);

  // Build unified time series: collect all unique timestamps, merge per-vault APY
  const allTimestamps = [...new Set(vaults.flatMap((v) => v.data.map((p) => p.x)))].sort();
  const chartDataMorpho = allTimestamps.map((ts) => {
    const point: Record<string, number | string> = { time: formatTime(ts, period) };
    for (const v of vaults) {
      const match = v.data.find((p) => p.x === ts);
      if (match !== undefined) point[v.name] = match.y;
    }
    return point;
  });

  // ── shared placeholder ─────────────────────────────────────────────────────
  const isEmpty =
    period === "24h" ? chartData24h.length < 2 : morphoLoading ? false : chartDataMorpho.length < 2;

  return (
    <div className="space-y-3">
      {/* Selectors */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
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
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`col-toggle ${period === p ? "active" : ""}`}
              style={{ borderRadius: "var(--radius)" }}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {morphoLoading && period !== "24h" ? (
        <div
          className="flex items-center justify-center h-44 text-xs uppercase tracking-widest"
          style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--muted-foreground)" }}
        >
          ⟳ loading morpho history…
        </div>
      ) : isEmpty ? (
        <div
          className="flex items-center justify-center h-44 text-xs uppercase tracking-widest"
          style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--muted-foreground)" }}
        >
          {period === "24h" ? "⟳ collecting data — chart appears after a few refreshes" : "no data available"}
        </div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "12px 8px 4px 0" }}>
          <ResponsiveContainer width="100%" height={260}>
            {period === "24h" ? (
              <LineChart data={chartData24h} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(150, 100, 30, 0.15)" horizontal vertical={false} />
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
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "12px", fontFamily: "var(--font-jetbrains)", color: "var(--foreground)" }}
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
                {[...keys24h].map((key) => {
                  const [protocol] = key.split("-");
                  return (
                    <Line key={key} dataKey={key} stroke={PROTOCOL_COLORS[protocol] ?? "#888"} dot={false} strokeWidth={1.5} connectNulls />
                  );
                })}
              </LineChart>
            ) : (
              <LineChart data={chartDataMorpho} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(150, 100, 30, 0.15)" horizontal vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "var(--font-jetbrains)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "var(--font-jetbrains)" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "12px", fontFamily: "var(--font-jetbrains)", color: "var(--foreground)" }}
                  labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }}
                  formatter={(v, key) => [`${Number(v).toFixed(2)}%`, String(key)]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "var(--font-jetbrains)", paddingTop: "8px" }} />
                {vaults.map((v, i) => (
                  <Line
                    key={v.name}
                    dataKey={v.name}
                    stroke={VAULT_COLORS[i % VAULT_COLORS.length]}
                    dot={false}
                    strokeWidth={1.5}
                    connectNulls
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {period !== "24h" && !morphoLoading && vaults.length > 0 && (
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          MetaMorpho vaults · {vaults.length} vault{vaults.length > 1 ? "s" : ""} · source: blue-api.morpho.org
        </p>
      )}
    </div>
  );
}
