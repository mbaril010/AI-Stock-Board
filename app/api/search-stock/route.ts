import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 30);
  if (limited) return limited;

  try {
    const query = request.nextUrl.searchParams.get("q");
    if (!query || query.length < 1) {
      return NextResponse.json({ results: [] });
    }

    const result = await yahooFinance.search(query, { newsCount: 0 });

    const results = (result.quotes ?? [])
      .filter((q): q is typeof q & { isYahooFinance: true; symbol: string } =>
        q.isYahooFinance === true && "quoteType" in q && q.quoteType === "EQUITY" && !!q.symbol
      )
      .slice(0, 8)
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname ?? q.longname ?? q.symbol,
        exchange: q.exchDisp ?? q.exchange ?? "",
      }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ results: [] });
  }
}
