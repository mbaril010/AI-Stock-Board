"use client";

import { Card, Title, Select, SelectItem, Text, Button } from "@tremor/react";
import { ArrowDownTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useStockHistory } from "@/hooks/use-stock-data";
import { exportChartCSV, formatPrice } from "@/lib/utils";
import { TIME_RANGES } from "@/lib/constants";
import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const COMPARE_COLORS = ["#3b82f6", "#34d399", "#fbbf24"] as const;

interface PriceChartProps {
  selectedStock: string | null;
  allStocks?: string[];
}

function useMultiHistory(tokens: string[], days: number, interval: string) {
  const h0 = useStockHistory(tokens[0] ?? null, days, interval);
  const h1 = useStockHistory(tokens[1] ?? null, days, interval);
  const h2 = useStockHistory(tokens[2] ?? null, days, interval);
  return [h0, h1, h2];
}

export function PriceChart({ selectedStock, allStocks = [] }: PriceChartProps) {
  const [rangeIndex, setRangeIndex] = useState(2); // Default to 1M
  const [compareStocks, setCompareStocks] = useState<string[]>([]);
  const [showMA, setShowMA] = useState(false);

  const range = TIME_RANGES[rangeIndex];

  const activeStocks = useMemo(() => {
    if (!selectedStock) return [];
    const stocks = [selectedStock, ...compareStocks.filter((t) => t !== selectedStock)];
    return stocks.slice(0, 3);
  }, [selectedStock, compareStocks]);

  const histories = useMultiHistory(activeStocks, range.days, range.interval);

  const isCompareMode = activeStocks.length > 1;

  // MA window
  const maWindow = range.days <= 1 ? 12 : range.days <= 7 ? 24 : 20;

  // Build chart data for single stock mode
  const singleChartData = useMemo(() => {
    const history = histories[0]?.history ?? [];
    if (!history.length || isCompareMode) return [];

    const closes = history.map((h) => h.close);
    return history.map((item, i) => {
      const dateObj = new Date(item.date);
      const label = range.days <= 1
        ? dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        : dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const result: Record<string, string | number> = {
        date: label,
        Close: item.close,
      };

      if (showMA) {
        const windowStart = Math.max(0, i - maWindow + 1);
        const windowSlice = closes.slice(windowStart, i + 1);
        const ma = windowSlice.reduce((a, b) => a + b, 0) / windowSlice.length;
        result[`MA ${maWindow}`] = parseFloat(ma.toFixed(2));
      }

      return result;
    });
  }, [histories, isCompareMode, range.days, showMA, maWindow]);

  // Build chart data for compare mode
  const compareChartData = useMemo(() => {
    if (!isCompareMode) return [];

    const allPoints = new Map<number, Record<string, number | string>>();

    activeStocks.forEach((stock, idx) => {
      const history = histories[idx]?.history ?? [];
      history.forEach((item) => {
        const ts = new Date(item.date).getTime();
        const dateObj = new Date(item.date);
        const label = range.days <= 1
          ? dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
          : dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        if (!allPoints.has(ts)) {
          allPoints.set(ts, { date: label });
        }
        allPoints.get(ts)![stock] = item.close;
      });
    });

    return Array.from(allPoints.entries())
      .sort(([a], [b]) => a - b)
      .map(([, point]) => point);
  }, [activeStocks, histories, isCompareMode, range.days]);

  // Stats for single mode
  const stats = useMemo(() => {
    const history = histories[0]?.history ?? [];
    if (!history.length || isCompareMode) return null;

    const closes = history.map((h) => h.close);
    const first = closes[0];
    const last = closes[closes.length - 1];
    const changePct = first > 0 ? ((last - first) / first) * 100 : 0;

    return {
      high: Math.max(...closes),
      low: Math.min(...closes),
      changePct,
    };
  }, [histories, isCompareMode]);

  const isLoading = histories.some((h, i) => i < activeStocks.length && h.isLoading);
  const isError = histories.some((h, i) => i < activeStocks.length && h.isError);

  const addCompareStock = (stock: string) => {
    if (stock && !activeStocks.includes(stock) && activeStocks.length < 3) {
      setCompareStocks((prev) => [...prev, stock]);
    }
  };

  const removeCompareStock = (stock: string) => {
    setCompareStocks((prev) => prev.filter((t) => t !== stock));
  };

  const availableForCompare = allStocks.filter((t) => !activeStocks.includes(t));

  if (!selectedStock) {
    return (
      <Card className="h-64 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <Title className="text-gray-900 dark:text-white">Price History</Title>
        <div className="flex items-center justify-center h-48">
          <Text className="text-gray-500 dark:text-gray-400">
            Select a stock from the table to view its price history
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start mb-2">
        <div>
          <Title className="text-gray-900 dark:text-white">
            {isCompareMode ? "Price Comparison" : `${selectedStock} Price History`}
          </Title>
          {stats && !isCompareMode && (
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span>
                Period:{" "}
                <span className={stats.changePct >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {stats.changePct >= 0 ? "+" : ""}{stats.changePct.toFixed(2)}%
                </span>
              </span>
              <span>High: <span className="text-emerald-400">{formatPrice(stats.high)}</span></span>
              <span>Low: <span className="text-red-400">{formatPrice(stats.low)}</span></span>
            </div>
          )}
          {/* Compare stock badges */}
          {isCompareMode && (
            <div className="flex flex-wrap gap-2 mt-2">
              {activeStocks.map((stock, idx) => (
                <span
                  key={stock}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                    idx === 0
                      ? "bg-blue-900 text-blue-300"
                      : idx === 1
                      ? "bg-emerald-900 text-emerald-300"
                      : "bg-amber-900 text-amber-300"
                  }`}
                >
                  {stock}
                  {idx > 0 && (
                    <button onClick={() => removeCompareStock(stock)} className="hover:opacity-70">
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {/* Time range selector */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              {TIME_RANGES.map((tr, idx) => (
                <button
                  key={tr.label}
                  onClick={() => setRangeIndex(idx)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    rangeIndex === idx
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {tr.label}
                </button>
              ))}
            </div>
            {!isCompareMode && (
              <Button
                variant="secondary"
                size="xs"
                onClick={() => setShowMA(!showMA)}
                className={
                  showMA
                    ? "bg-amber-600 border-amber-500 text-white hover:bg-amber-700"
                    : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                }
              >
                MA
              </Button>
            )}
            {!isCompareMode && histories[0]?.history?.length > 0 && (
              <Button
                variant="secondary"
                icon={ArrowDownTrayIcon}
                onClick={() => exportChartCSV(histories[0].history, selectedStock!)}
                size="xs"
                className="bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                CSV
              </Button>
            )}
          </div>
          {/* Add compare stock */}
          {activeStocks.length < 3 && availableForCompare.length > 0 && (
            <Select
              value=""
              onValueChange={addCompareStock}
              placeholder="+ Compare..."
              className="w-40"
            >
              {availableForCompare.slice(0, 50).map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </Select>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
        </div>
      ) : isError ? (
        <div className="h-48 flex items-center justify-center">
          <Text className="text-red-400">Failed to load price history</Text>
        </div>
      ) : isCompareMode ? (
        compareChartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <Text className="text-gray-500 dark:text-gray-400">No historical data available</Text>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={compareChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                labelStyle={{ color: "#e5e7eb" }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, undefined]}
              />
              <Legend />
              {activeStocks.map((stock, idx) => (
                <Area
                  key={stock}
                  type="monotone"
                  dataKey={stock}
                  stroke={COMPARE_COLORS[idx]}
                  fill={COMPARE_COLORS[idx]}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )
      ) : singleChartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <Text className="text-gray-500 dark:text-gray-400">No historical data available</Text>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={singleChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} />
            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
              labelStyle={{ color: "#e5e7eb" }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, undefined]}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="Close"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.1}
              strokeWidth={2}
            />
            {showMA && (
              <Area
                type="monotone"
                dataKey={`MA ${maWindow}`}
                stroke="#fbbf24"
                fill="none"
                strokeWidth={1.5}
                strokeDasharray="5 5"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
