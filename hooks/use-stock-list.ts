"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "./use-local-storage";
import { useSessionContext } from "@/contexts/session-context";
import { DEFAULT_AI_STOCKS, profileKey } from "@/lib/constants";
import type { StockListItem } from "@/lib/types";

export function useStockList() {
  const { activeProfileId } = useSessionContext();
  const [stockList, setStockList] = useLocalStorage<StockListItem[]>(
    profileKey(activeProfileId, "stocks"),
    DEFAULT_AI_STOCKS
  );

  const symbols = useMemo(() => stockList.map((s) => s.symbol), [stockList]);

  const addStock = useCallback(
    (item: StockListItem) => {
      setStockList((prev) => {
        if (prev.some((s) => s.symbol === item.symbol)) return prev;
        return [...prev, item];
      });
    },
    [setStockList]
  );

  const removeStock = useCallback(
    (symbol: string) => {
      setStockList((prev) => prev.filter((s) => s.symbol !== symbol));
    },
    [setStockList]
  );

  const resetToDefaults = useCallback(() => {
    setStockList(DEFAULT_AI_STOCKS);
  }, [setStockList]);

  return { stockList, symbols, addStock, removeStock, resetToDefaults };
}
