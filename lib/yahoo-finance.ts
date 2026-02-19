import YahooFinance from "yahoo-finance2";
import type { StockData, StockHistoryPoint } from "./types";

// Create a singleton instance for the v3 API
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/**
 * Fetch quotes for multiple symbols at once.
 */
export async function getStockQuotes(symbols: string[]): Promise<StockData[]> {
  const results: StockData[] = [];

  // yahoo-finance2 v3 quote() accepts an array and returns an array
  const quotes = await yahooFinance.quote(symbols);
  const quoteArray = Array.isArray(quotes) ? quotes : [quotes];

  for (const q of quoteArray) {
    if (!q || !q.symbol) continue;

    results.push({
      symbol: q.symbol,
      shortName: q.shortName ?? q.longName ?? q.symbol,
      price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      marketCap: q.marketCap ?? 0,
      volume: q.regularMarketVolume ?? 0,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? 0,
      trailingPE: q.trailingPE ?? null,
      sector: "", // sector comes from our constants, not the quote
      currency: q.currency ?? "USD",
    });
  }

  return results;
}

/**
 * Fetch OHLCV history for a single symbol.
 */
export async function getStockHistory(
  symbol: string,
  days: number,
  interval: string = "1d"
): Promise<StockHistoryPoint[]> {
  const now = new Date();
  let period1: Date;

  if (days === 0) {
    // YTD
    period1 = new Date(now.getFullYear(), 0, 1);
  } else {
    period1 = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  const result = await yahooFinance.chart(symbol, {
    period1,
    period2: now,
    interval: interval as "1d" | "1wk" | "1mo" | "5m" | "15m" | "30m" | "60m" | "1h",
  });

  if (!result?.quotes) return [];

  return result.quotes
    .filter((q) => q.close != null)
    .map((q) => ({
      date: q.date instanceof Date ? q.date.toISOString() : new Date(q.date as unknown as string).toISOString(),
      open: q.open ?? q.close!,
      high: q.high ?? q.close!,
      low: q.low ?? q.close!,
      close: q.close!,
      volume: q.volume ?? 0,
    }));
}

/**
 * Fetch FX rates to USD for a list of currencies.
 * Uses Yahoo Finance FX pairs like CADUSD=X.
 * Returns a map of currency -> rate to USD (e.g. { CAD: 0.74 }).
 */
export async function getFxRates(currencies: string[]): Promise<Record<string, number>> {
  const rates: Record<string, number> = { USD: 1 };
  const nonUsd = currencies.filter((c) => c !== "USD");
  if (nonUsd.length === 0) return rates;

  const fxSymbols = nonUsd.map((c) => `${c}USD=X`);
  const quotes = await yahooFinance.quote(fxSymbols);
  const quoteArray = Array.isArray(quotes) ? quotes : [quotes];

  for (const q of quoteArray) {
    if (!q?.symbol || !q.regularMarketPrice) continue;
    // Extract currency code from symbol like "CADUSD=X" -> "CAD"
    const currency = q.symbol.replace("USD=X", "");
    rates[currency] = q.regularMarketPrice;
  }

  return rates;
}

/**
 * Fetch 7-day daily close prices for sparkline display.
 */
export async function getSparklineData(symbol: string): Promise<number[]> {
  const history = await getStockHistory(symbol, 7, "1d");
  return history.map((h) => h.close);
}
