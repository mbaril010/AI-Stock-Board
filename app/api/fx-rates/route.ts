import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getFxRates } from "@/lib/yahoo-finance";

// Simple in-memory cache
let cachedRates: { rates: Record<string, number>; timestamp: number } | null = null;
let cachedKey = "";
const CACHE_TTL = 60_000; // 60 seconds

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 60);
  if (limited) return limited;

  try {
    const currenciesParam = request.nextUrl.searchParams.get("currencies");
    if (!currenciesParam) {
      return NextResponse.json({ rates: { USD: 1 }, timestamp: Date.now() });
    }

    const currencies = currenciesParam
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    const key = currencies.sort().join(",");
    const now = Date.now();

    if (cachedRates && cachedKey === key && now - cachedRates.timestamp < CACHE_TTL) {
      return NextResponse.json({ rates: cachedRates.rates, timestamp: cachedRates.timestamp });
    }

    const rates = await getFxRates(currencies);

    cachedRates = { rates, timestamp: now };
    cachedKey = key;

    return NextResponse.json({ rates, timestamp: now });
  } catch (error) {
    console.error("FX rates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch FX rates", rates: { USD: 1 }, timestamp: Date.now() },
      { status: 500 }
    );
  }
}
