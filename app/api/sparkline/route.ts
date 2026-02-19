import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getSparklineData } from "@/lib/yahoo-finance";

// Simple in-memory cache
const sparklineCache = new Map<string, { data: number[]; timestamp: number }>();
const CACHE_TTL = 300_000; // 5 minutes

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 60);
  if (limited) return limited;

  try {
    const symbol = request.nextUrl.searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json({ error: "symbol parameter required" }, { status: 400 });
    }

    const upperSymbol = symbol.toUpperCase();
    const now = Date.now();
    const cached = sparklineCache.get(upperSymbol);

    if (cached && now - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ data: cached.data, symbol: upperSymbol });
    }

    const data = await getSparklineData(upperSymbol);

    sparklineCache.set(upperSymbol, { data, timestamp: now });

    // Evict old entries
    if (sparklineCache.size > 100) {
      const oldestKey = sparklineCache.keys().next().value;
      if (oldestKey) sparklineCache.delete(oldestKey);
    }

    return NextResponse.json({ data, symbol: upperSymbol });
  } catch (error) {
    console.error("Sparkline error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sparkline data", data: [] },
      { status: 500 }
    );
  }
}
