"use client";

import useSWR from "swr";
import { POLLING_INTERVAL } from "@/lib/constants";
import type { StockData, DashboardStats, StockHistoryPoint, FxRatesApiResponse } from "@/lib/types";

interface StockQuotesResponse {
  data: StockData[];
  stats: DashboardStats;
  timestamp: number;
  error?: string;
}

interface StockHistoryResponse {
  data: StockHistoryPoint[];
  symbol: string;
  days: number;
  timestamp: number;
  error?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch data");
  return res.json();
};

export function useStockQuotes(symbols: string[]) {
  const symbolsParam = symbols.join(",");
  const { data, error, isLoading, mutate } = useSWR<StockQuotesResponse>(
    symbols.length > 0 ? `/api/stock-quotes?symbols=${encodeURIComponent(symbolsParam)}` : null,
    fetcher,
    {
      refreshInterval: POLLING_INTERVAL,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  return {
    stocks: data?.data ?? [],
    stats: data?.stats ?? null,
    timestamp: data?.timestamp ?? null,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}

export function useFxRates(currencies: string[]) {
  const nonUsd = currencies.filter((c) => c !== "USD");
  const param = nonUsd.join(",");

  const { data, error, isLoading } = useSWR<FxRatesApiResponse>(
    nonUsd.length > 0 ? `/api/fx-rates?currencies=${encodeURIComponent(param)}` : null,
    fetcher,
    {
      refreshInterval: POLLING_INTERVAL,
      revalidateOnFocus: true,
      dedupingInterval: 30000,
    }
  );

  return {
    rates: data?.rates ?? { USD: 1 },
    isLoading,
    isError: !!error,
  };
}

export function useStockHistory(symbol: string | null, days: number = 30, interval: string = "1d") {
  const shouldFetch = symbol !== null && symbol.length > 0;

  const { data, error, isLoading, mutate } = useSWR<StockHistoryResponse>(
    shouldFetch
      ? `/api/stock-history?symbol=${encodeURIComponent(symbol)}&days=${days}&interval=${interval}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    history: data?.data ?? [],
    isLoading: shouldFetch && isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}
