// Stock quote data returned by Yahoo Finance
export interface StockData {
  symbol: string;
  shortName: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  trailingPE: number | null;
  sector: string;
  currency: string;
}

// OHLCV history point
export interface StockHistoryPoint {
  date: string; // ISO date string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Dashboard summary stats
export interface DashboardStats {
  totalStocks: number;
  topGainer: { symbol: string; changePercent: number } | null;
  topLoser: { symbol: string; changePercent: number } | null;
  averageDailyChange: number;
}

// Stock list item for the editable list
export interface StockListItem {
  symbol: string;
  name: string;
  sector: string;
}

// API response wrappers
export interface StockQuotesApiResponse {
  data: StockData[];
  stats: DashboardStats;
  timestamp: number;
  error?: string;
}

export interface StockHistoryApiResponse {
  data: StockHistoryPoint[];
  symbol: string;
  days: number;
  timestamp: number;
  error?: string;
}

export interface SparklineApiResponse {
  data: number[];
  symbol: string;
  error?: string;
}

// Portfolio types
export interface PortfolioHolding {
  symbol: string;
  name: string;
  shares: number;
  avgCostPerShare: number;
  currency: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

export interface FxRatesApiResponse {
  rates: Record<string, number>;
  timestamp: number;
  error?: string;
}
