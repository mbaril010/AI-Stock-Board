import type { StockListItem } from "./types";

// Default AI-related stocks to track
export const DEFAULT_AI_STOCKS: StockListItem[] = [
  { symbol: "NVDA", name: "NVIDIA", sector: "Semiconductors" },
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Semiconductors" },
  { symbol: "AVGO", name: "Broadcom", sector: "Semiconductors" },
  { symbol: "TSM", name: "Taiwan Semiconductor", sector: "Semiconductors" },
  { symbol: "MRVL", name: "Marvell Technology", sector: "Semiconductors" },
  { symbol: "ARM", name: "Arm Holdings", sector: "Semiconductors" },
  { symbol: "SMCI", name: "Super Micro Computer", sector: "Hardware" },
  { symbol: "DELL", name: "Dell Technologies", sector: "Hardware" },
  { symbol: "MSFT", name: "Microsoft", sector: "Software" },
  { symbol: "GOOGL", name: "Alphabet", sector: "Software" },
  { symbol: "META", name: "Meta Platforms", sector: "Software" },
  { symbol: "AMZN", name: "Amazon", sector: "Cloud" },
  { symbol: "AAPL", name: "Apple", sector: "Hardware" },
  { symbol: "CRM", name: "Salesforce", sector: "Software" },
  { symbol: "ORCL", name: "Oracle", sector: "Cloud" },
  { symbol: "PLTR", name: "Palantir Technologies", sector: "Software" },
  { symbol: "SNOW", name: "Snowflake", sector: "Cloud" },
  { symbol: "AI", name: "C3.ai", sector: "Software" },
  { symbol: "PATH", name: "UiPath", sector: "Software" },
  { symbol: "SOUN", name: "SoundHound AI", sector: "Software" },
  { symbol: "BBAI", name: "BigBear.ai", sector: "Software" },
  { symbol: "UPST", name: "Upstart Holdings", sector: "Fintech" },
  { symbol: "IONQ", name: "IonQ", sector: "Quantum Computing" },
  { symbol: "RGTI", name: "Rigetti Computing", sector: "Quantum Computing" },
  { symbol: "INTC", name: "Intel", sector: "Semiconductors" },
];

// Time range configurations for charts
export interface TimeRange {
  label: string;
  days: number;
  interval: string; // Yahoo Finance interval
}

export const TIME_RANGES: TimeRange[] = [
  { label: "1D", days: 1, interval: "5m" },
  { label: "1W", days: 7, interval: "15m" },
  { label: "1M", days: 30, interval: "1d" },
  { label: "3M", days: 90, interval: "1d" },
  { label: "1Y", days: 365, interval: "1wk" },
  { label: "YTD", days: 0, interval: "1d" }, // days=0 means YTD
];

// Polling and cache
export const POLLING_INTERVAL = 60_000; // 60 seconds

// localStorage keys
export const LS_KEY_STOCK_LIST = "ai-stock-board-stocks";
export const LS_KEY_FAVORITES = "ai-stock-board-favorites";
export const LS_KEY_PORTFOLIO = "ai-stock-board-portfolio";
