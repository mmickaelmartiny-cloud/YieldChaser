"use client";

import { CHAIN_CONFIG } from "@/lib/chains";
import type { Protocol, Stablecoin } from "@/types";

const PROTOCOLS: Protocol[] = ["aave", "morpho", "euler", "compound"];
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
      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
        active
          ? "text-white border-transparent"
          : "bg-transparent border-border text-muted-foreground hover:text-foreground"
      }`}
      style={active && color ? { backgroundColor: color } : undefined}
    >
      {label}
    </button>
  );
}

function toggle<T>(set: Set<T>, value: T, all: T[]): Set<T> {
  const next = new Set(set);
  if (next.has(value)) {
    // Don't deselect the last item
    if (next.size === 1) return set;
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

const PROTOCOL_COLORS: Record<Protocol, string> = {
  aave: "#B6509E",
  morpho: "#2470FF",
  euler: "#E0621A",
  compound: "#00D395",
};

export function FilterBar({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium w-16 shrink-0">Protocol</span>
        <div className="flex flex-wrap gap-1.5">
          {PROTOCOLS.map((p) => (
            <Chip
              key={p}
              label={p.charAt(0).toUpperCase() + p.slice(1)}
              active={filters.protocols.has(p)}
              color={PROTOCOL_COLORS[p]}
              onClick={() => onChange({ ...filters, protocols: toggle(filters.protocols, p, PROTOCOLS) })}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium w-16 shrink-0">Chain</span>
        <div className="flex flex-wrap gap-1.5">
          {CHAIN_IDS.map((id) => {
            const chain = CHAIN_CONFIG[id];
            return (
              <Chip
                key={id}
                label={chain?.shortName ?? String(id)}
                active={filters.chains.has(id)}
                color={chain?.color}
                onClick={() => onChange({ ...filters, chains: toggle(filters.chains, id, CHAIN_IDS) })}
              />
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium w-16 shrink-0">Asset</span>
        <div className="flex flex-wrap gap-1.5">
          {ASSETS.map((a) => (
            <Chip
              key={a}
              label={a}
              active={filters.assets.has(a)}
              onClick={() => onChange({ ...filters, assets: toggle(filters.assets, a, ASSETS) })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
