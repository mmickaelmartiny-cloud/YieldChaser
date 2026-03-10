"use client";

import { useMemo, useState } from "react";
import { useYieldRates } from "@/hooks/useYieldRates";
import { YieldTable } from "@/components/YieldTable";
import { RateChart } from "@/components/RateChart";
import { FilterBar, defaultFilters } from "@/components/FilterBar";
import type { FilterState } from "@/components/FilterBar";
import type { YieldRate } from "@/types";

export function Dashboard() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [selectedVault, setSelectedVault] = useState<YieldRate | null>(null);
  const { data, isLoading, error } = useYieldRates();

  const filtered = useMemo(() => {
    if (!data) return data;
    return data.filter(
      (r) =>
        filters.protocols.has(r.protocol) &&
        filters.chains.has(r.chainId) &&
        filters.assets.has(r.asset)
    );
  }, [data, filters]);

  return (
    <div className="space-y-8">
      {/* All rates — markets + vaults */}
      <section className="space-y-3">
        <span className="text-xs uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
          ── BEST RATES
        </span>
        <FilterBar filters={filters} onChange={setFilters} />
        <YieldTable
          data={filtered}
          isLoading={isLoading}
          error={error}
          selectedVault={selectedVault}
          onSelect={setSelectedVault}
        />
      </section>

      {/* APY History */}
      <section className="space-y-3">
        <span className="text-xs uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
          ── APY HISTORY
        </span>
        <RateChart
          rates={data?.filter((r) => r.protocol !== "metamorpho")}
          selectedVault={selectedVault}
        />
      </section>
    </div>
  );
}
