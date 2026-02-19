"use client";

import { useMemo } from "react";
import { Card, Title, Text } from "@tremor/react";
import type { StockData } from "@/lib/types";
import { formatChangePercent } from "@/lib/utils";

interface HeatmapProps {
  data: StockData[];
  onSelectStock?: (symbol: string) => void;
  selectedStock?: string | null;
}

function getChangeColor(changePercent: number): string {
  if (changePercent >= 5) return "bg-emerald-500 text-white";
  if (changePercent >= 3) return "bg-emerald-600 text-white";
  if (changePercent >= 1) return "bg-emerald-700 text-white";
  if (changePercent >= 0) return "bg-emerald-900 text-emerald-200";
  if (changePercent >= -1) return "bg-red-900 text-red-200";
  if (changePercent >= -3) return "bg-red-700 text-white";
  if (changePercent >= -5) return "bg-red-600 text-white";
  return "bg-red-500 text-white";
}

export function Heatmap({ data, onSelectStock, selectedStock }: HeatmapProps) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.changePercent - a.changePercent);
  }, [data]);

  if (data.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <Title className="text-gray-900 dark:text-white">Performance Heatmap</Title>
        <div className="h-32 flex items-center justify-center">
          <Text className="text-gray-500 dark:text-gray-400">Loading...</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="mb-2">
        <Title className="text-gray-900 dark:text-white">Performance Heatmap</Title>
        <Text className="text-gray-500 dark:text-gray-400">
          Daily price change — green = up, red = down
        </Text>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mb-2 text-xs text-gray-500 dark:text-gray-400">
        <span>-5%</span>
        <div className="flex gap-0.5">
          <div className="w-6 h-3 rounded-sm bg-red-500" />
          <div className="w-6 h-3 rounded-sm bg-red-600" />
          <div className="w-6 h-3 rounded-sm bg-red-700" />
          <div className="w-6 h-3 rounded-sm bg-red-900" />
          <div className="w-6 h-3 rounded-sm bg-emerald-900" />
          <div className="w-6 h-3 rounded-sm bg-emerald-700" />
          <div className="w-6 h-3 rounded-sm bg-emerald-600" />
          <div className="w-6 h-3 rounded-sm bg-emerald-500" />
        </div>
        <span>+5%</span>
      </div>

      {/* Heatmap grid */}
      <div className="flex flex-wrap gap-1">
        {sortedData.map((stock) => (
          <button
            key={stock.symbol}
            onClick={() => onSelectStock?.(stock.symbol)}
            className={`
              relative rounded px-1.5 py-1 text-xs font-medium
              transition-all hover:scale-105 hover:z-10 hover:shadow-lg
              ${getChangeColor(stock.changePercent)}
              ${selectedStock === stock.symbol ? "ring-2 ring-gray-900 dark:ring-white ring-offset-1 ring-offset-white dark:ring-offset-gray-800" : ""}
            `}
            title={`${stock.symbol}: ${formatChangePercent(stock.changePercent)}`}
          >
            <div className="font-semibold leading-tight">{stock.symbol}</div>
            <div className="text-[10px] opacity-80 leading-tight">
              {formatChangePercent(stock.changePercent)}
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
