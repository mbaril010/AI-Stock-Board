import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getStockQuotes } from "@/lib/yahoo-finance";
import { calculateDashboardStats } from "@/lib/utils";
import { DEFAULT_AI_STOCKS } from "@/lib/constants";
import type { StockData } from "@/lib/types";

// Simple in-memory cache
let cachedData: { data: StockData[]; timestamp: number } | null = null;
let cachedSymbolsKey = "";
const CACHE_TTL = 30_000; // 30 seconds

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 30);
  if (limited) return limited;

  try {
    const symbolsParam = request.nextUrl.searchParams.get("symbols");
    const symbols = symbolsParam
      ? symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
      : DEFAULT_AI_STOCKS.map((s) => s.symbol);

    const symbolsKey = symbols.join(",");
    const now = Date.now();

    // Return cache if valid
    if (cachedData && cachedSymbolsKey === symbolsKey && now - cachedData.timestamp < CACHE_TTL) {
      return NextResponse.json({
        data: cachedData.data,
        stats: calculateDashboardStats(cachedData.data),
        timestamp: cachedData.timestamp,
      });
    }

    // Build a map of symbol -> sector from our constants
    const sectorMap = new Map(DEFAULT_AI_STOCKS.map((s) => [s.symbol, s.sector]));

    const quotes = await getStockQuotes(symbols);

    // Enrich with sector info
    const enriched = quotes.map((q) => ({
      ...q,
      sector: sectorMap.get(q.symbol) ?? "",
    }));

    cachedData = { data: enriched, timestamp: now };
    cachedSymbolsKey = symbolsKey;

    return NextResponse.json({
      data: enriched,
      stats: calculateDashboardStats(enriched),
      timestamp: now,
    });
  } catch (error) {
    console.error("Stock quotes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock quotes", data: [], stats: null, timestamp: Date.now() },
      { status: 500 }
    );
  }
}
