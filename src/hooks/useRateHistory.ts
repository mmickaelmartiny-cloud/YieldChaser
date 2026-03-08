"use client";

import { useEffect, useState } from "react";
import type { YieldRate } from "@/types";

const STORAGE_KEY = "yieldchaser_history";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEBOUNCE_MS = 30_000; // don't append more than once per 30s

export type HistoryEntry = {
  t: number; // unix ms
  rates: Array<{ p: string; c: number; a: string; s: number }>; // protocol, chainId, asset, supplyApy
};

function load(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export function useRateHistory(rates: YieldRate[] | undefined): HistoryEntry[] {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  // Load persisted history on mount
  useEffect(() => {
    setEntries(load());
  }, []);

  // Append new snapshot whenever rates change
  useEffect(() => {
    if (!rates?.length) return;
    const now = Date.now();
    setEntries((prev) => {
      // Debounce: skip if last snapshot is too recent
      if (prev.length && now - prev[prev.length - 1].t < DEBOUNCE_MS) return prev;
      const pruned = prev.filter((e) => now - e.t < MAX_AGE_MS);
      const next = [
        ...pruned,
        { t: now, rates: rates.map((r) => ({ p: r.protocol, c: r.chainId, a: r.asset, s: r.supplyApy })) },
      ];
      save(next);
      return next;
    });
  }, [rates]);

  return entries;
}
