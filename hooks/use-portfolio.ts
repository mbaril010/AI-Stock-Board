"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "./use-local-storage";
import { LS_KEY_PORTFOLIO } from "@/lib/constants";
import type { PortfolioHolding } from "@/lib/types";

export function usePortfolio() {
  const [rawHoldings, setHoldings] = useLocalStorage<PortfolioHolding[]>(
    LS_KEY_PORTFOLIO,
    []
  );

  // Normalize old holdings that lack the currency field (default to USD)
  const holdings = useMemo(
    () => rawHoldings.map((h) => ({ ...h, currency: h.currency ?? "USD" })),
    [rawHoldings]
  );

  const symbols = useMemo(() => holdings.map((h) => h.symbol), [holdings]);

  const addHolding = useCallback(
    (holding: PortfolioHolding) => {
      setHoldings((prev) => {
        if (prev.some((h) => h.symbol === holding.symbol)) return prev;
        return [...prev, holding];
      });
    },
    [setHoldings]
  );

  const updateHolding = useCallback(
    (symbol: string, updates: Partial<Pick<PortfolioHolding, "shares" | "avgCostPerShare" | "currency">>) => {
      setHoldings((prev) =>
        prev.map((h) => (h.symbol === symbol ? { ...h, ...updates } : h))
      );
    },
    [setHoldings]
  );

  const removeHolding = useCallback(
    (symbol: string) => {
      setHoldings((prev) => prev.filter((h) => h.symbol !== symbol));
    },
    [setHoldings]
  );

  return { holdings, symbols, addHolding, updateHolding, removeHolding };
}
