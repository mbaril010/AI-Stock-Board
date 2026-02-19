import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getStockHistory } from "@/lib/yahoo-finance";

// Simple in-memory cache
const historyCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60_000; // 60 seconds

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 20);
  if (limited) return limited;

  try {
    const symbol = request.nextUrl.searchParams.get("symbol");
    const days = parseInt(request.nextUrl.searchParams.get("days") ?? "30", 10);
    const interval = request.nextUrl.searchParams.get("interval") ?? "1d";

    if (!symbol) {
      return NextResponse.json({ error: "symbol parameter required" }, { status: 400 });
    }

    const cacheKey = `${symbol}:${days}:${interval}`;
    const now = Date.now();
    const cached = historyCache.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const history = await getStockHistory(symbol.toUpperCase(), days, interval);

    const response = {
      data: history,
      symbol: symbol.toUpperCase(),
      days,
      timestamp: now,
    };

    historyCache.set(cacheKey, { data: response, timestamp: now });

    // Evict old entries
    if (historyCache.size > 200) {
      const oldestKey = historyCache.keys().next().value;
      if (oldestKey) historyCache.delete(oldestKey);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Stock history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock history", data: [], timestamp: Date.now() },
      { status: 500 }
    );
  }
}
