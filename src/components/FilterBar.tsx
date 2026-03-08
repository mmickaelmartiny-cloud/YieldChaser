"use client";

import { CHAIN_CONFIG } from "@/lib/chains";
import type { Protocol, Stablecoin } from "@/types";

const PROTOCOLS: Protocol[] = ["aave", "euler", "compound", "metamorpho"];
const CHAIN_IDS = [1, 8453, 42161, 10];
const ASSETS: Stablecoin[] = ["USDC", "USDT", "DAI", "USDS"];

export interface FilterState {
  protocols: Set<Protocol>;
  chains: Set<number>;
  assets: Set<Stablecoin>;
}

export function defaultFilters(): FilterState {
  return {
    protocols: new Set(PROTOCOLS),
    chains: new Set(CHAIN_IDS),
    assets: new Set(ASSETS),
  };
}

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const PROTOCOL_LABELS: Record<Protocol, string> = {
  aave: "AAVE",
  morpho: "Morpho",
  euler: "Euler",
  compound: "Compound",
  metamorpho: "Vaults",
};

const PROTOCOL_COLORS: Record<Protocol, string> = {
  aave: "#C46AAE",
  morpho: "#4D8AFF",
  euler: "#E8743A",
  compound: "#00D395",
  metamorpho: "#4D8AFF",
};

function Chip({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="filter-chip"
      style={{
        borderRadius: "var(--radius)",
        ...(active && color
          ? { backgroundColor: color, borderColor: color, color: "white" }
          : active
          ? { borderColor: "var(--primary)", color: "var(--amber-bright)" }
          : {}),
      }}
    >
      {active ? "◆ " : "◇ "}
      {label}
    </button>
  );
}

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) {
    if (next.size === 1) return set;
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

export function FilterBar({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-2">
      {/* Protocol */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs uppercase tracking-widest shrink-0 w-16"
          style={{ color: "var(--muted-foreground)" }}
        >
          Protocol
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PROTOCOLS.map((p) => (
            <Chip
              key={p}
              label={PROTOCOL_LABELS[p]}
              active={filters.protocols.has(p)}
              color={PROTOCOL_COLORS[p]}
              onClick={() => onChange({ ...filters, protocols: toggle(filters.protocols, p) })}
            />
          ))}
        </div>
      </div>

      {/* Chain */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs uppercase tracking-widest shrink-0 w-16"
          style={{ color: "var(--muted-foreground)" }}
        >
          Chain
        </span>
        <div className="flex flex-wrap gap-1.5">
          {CHAIN_IDS.map((id) => {
            const chain = CHAIN_CONFIG[id];
            return (
              <Chip
                key={id}
                label={chain?.shortName ?? String(id)}
                active={filters.chains.has(id)}
                color={chain?.color}
                onClick={() => onChange({ ...filters, chains: toggle(filters.chains, id) })}
              />
            );
          })}
        </div>
      </div>

      {/* Asset */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs uppercase tracking-widest shrink-0 w-16"
          style={{ color: "var(--muted-foreground)" }}
        >
          Asset
        </span>
        <div className="flex flex-wrap gap-1.5">
          {ASSETS.map((a) => (
            <Chip
              key={a}
              label={a}
              active={filters.assets.has(a)}
              onClick={() => onChange({ ...filters, assets: toggle(filters.assets, a) })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
