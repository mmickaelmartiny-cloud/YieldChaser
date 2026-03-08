"use client";

import { useMemo, useState } from "react";
import { useYieldRates } from "@/hooks/useYieldRates";
import { YieldTable } from "@/components/YieldTable";
import { RateChart } from "@/components/RateChart";
import { FilterBar, defaultFilters } from "@/components/FilterBar";
import type { FilterState } from "@/components/FilterBar";

export function Dashboard() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
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
      {/* Rates section */}
      <section className="space-y-3">
        <div className="flex items-center gap-4">
          <span
            className="text-xs uppercase tracking-widest"
            style={{ color: "var(--muted-foreground)" }}
          >
            ── BEST RATES
          </span>
        </div>
        <FilterBar filters={filters} onChange={setFilters} />
        <YieldTable data={filtered} isLoading={isLoading} error={error} />
      </section>

      {/* Chart section */}
      <section className="space-y-3">
        <span
          className="text-xs uppercase tracking-widest"
          style={{ color: "var(--muted-foreground)" }}
        >
          ── APY HISTORY
        </span>
        <RateChart rates={data} />
      </section>
    </div>
  );
}
