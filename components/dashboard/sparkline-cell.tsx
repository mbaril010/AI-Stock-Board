"use client";

import { useSparklineData } from "@/hooks/use-sparkline-data";
import { Sparkline } from "./sparkline";

interface SparklineCellProps {
  symbol: string;
}

export function SparklineCell({ symbol }: SparklineCellProps) {
  const data = useSparklineData(symbol);

  if (!data) {
    return <div className="w-[80px] h-[24px] bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />;
  }

  return <Sparkline data={data} />;
}
