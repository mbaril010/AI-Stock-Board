import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { StockData, DashboardStats, StockHistoryPoint, PortfolioHolding, PortfolioSummary } from "./types";

// Tailwind class merge utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Currency symbol map
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CAD: "C$",
  HKD: "HK$",
  GBP: "£",
  EUR: "€",
  JPY: "¥",
  CNY: "¥",
  AUD: "A$",
  CHF: "CHF ",
  KRW: "₩",
  INR: "₹",
  TWD: "NT$",
  SEK: "kr ",
  NOK: "kr ",
  DKK: "kr ",
  SGD: "S$",
  NZD: "NZ$",
  BRL: "R$",
  ILS: "₪",
  ZAR: "R ",
};

function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? `${currency} `;
}

// Format price with optional currency (defaults to USD for backward compat)
export function formatPrice(price: number, currency: string = "USD"): string {
  const sym = currencySymbol(currency);
  if (price >= 1000) {
    return `${sym}${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (price >= 1) {
    return `${sym}${price.toFixed(2)}`;
  }
  return `${sym}${price.toFixed(4)}`;
}

// Format USD value (for market cap, volume, etc.)
export function formatUSD(value: number, decimals: number = 2): string {
  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(decimals)}T`;
  }
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(decimals)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(decimals)}K`;
  }
  return `$${value.toFixed(decimals)}`;
}

// Format change percent with sign and color-friendly output
export function formatChangePercent(percent: number): string {
  const sign = percent >= 0 ? "+" : "";
  return `${sign}${percent.toFixed(2)}%`;
}

// Format large numbers (volume, etc.)
export function formatLargeNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

// Format relative time
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return "just now";
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  const days = Math.floor(diff / 86400000);
  return `${days}d ago`;
}

// Calculate dashboard stats from stock data
export function calculateDashboardStats(stocks: StockData[]): DashboardStats {
  if (stocks.length === 0) {
    return { totalStocks: 0, topGainer: null, topLoser: null, averageDailyChange: 0 };
  }

  let topGainer: StockData | null = null;
  let topLoser: StockData | null = null;
  let totalChange = 0;

  for (const stock of stocks) {
    totalChange += stock.changePercent;
    if (!topGainer || stock.changePercent > topGainer.changePercent) topGainer = stock;
    if (!topLoser || stock.changePercent < topLoser.changePercent) topLoser = stock;
  }

  return {
    totalStocks: stocks.length,
    topGainer: topGainer ? { symbol: topGainer.symbol, changePercent: topGainer.changePercent } : null,
    topLoser: topLoser ? { symbol: topLoser.symbol, changePercent: topLoser.changePercent } : null,
    averageDailyChange: totalChange / stocks.length,
  };
}

// Calculate portfolio summary from holdings and live quotes
// When fxRates is provided, converts all values to USD
export function calculatePortfolioSummary(
  holdings: PortfolioHolding[],
  quotes: StockData[],
  fxRates?: Record<string, number>
): PortfolioSummary {
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));
  let totalValue = 0;
  let totalCost = 0;

  for (const h of holdings) {
    const quote = quoteMap.get(h.symbol);
    const currency = quote?.currency ?? h.currency ?? "USD";
    const fxRate = fxRates?.[currency] ?? (currency === "USD" ? 1 : 0);

    if (quote) {
      totalValue += quote.price * h.shares * fxRate;
    }
    totalCost += h.avgCostPerShare * h.shares * fxRate;
  }

  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  return { totalValue, totalCost, totalGainLoss, totalGainLossPercent };
}

// Download a blob as a file
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export stock data as CSV
export function exportTableCSV(data: StockData[]) {
  const header = "Symbol,Name,Price,Change,Change %,Market Cap,Volume,P/E,52wk High,52wk Low,Sector";
  const rows = data.map((r) =>
    [
      r.symbol,
      `"${r.shortName}"`,
      r.price.toFixed(2),
      r.change.toFixed(2),
      r.changePercent.toFixed(2),
      r.marketCap,
      r.volume,
      r.trailingPE?.toFixed(2) ?? "",
      r.fiftyTwoWeekHigh.toFixed(2),
      r.fiftyTwoWeekLow.toFixed(2),
      r.sector,
    ].join(",")
  );
  const csv = [header, ...rows].join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv" }), `ai-stocks-${new Date().toISOString().slice(0, 10)}.csv`);
}

// Export stock data as JSON
export function exportTableJSON(data: StockData[]) {
  const json = JSON.stringify(data, null, 2);
  downloadBlob(new Blob([json], { type: "application/json" }), `ai-stocks-${new Date().toISOString().slice(0, 10)}.json`);
}

// Export chart history data as CSV
export function exportChartCSV(data: StockHistoryPoint[], symbol: string) {
  const header = "Date,Open,High,Low,Close,Volume";
  const rows = data.map((h) =>
    [h.date, h.open.toFixed(2), h.high.toFixed(2), h.low.toFixed(2), h.close.toFixed(2), h.volume].join(",")
  );
  const csv = [header, ...rows].join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv" }), `${symbol}-history-${new Date().toISOString().slice(0, 10)}.csv`);
}
