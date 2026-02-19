"use client";

import { Card, Metric, Text, Grid } from "@tremor/react";
import type { PortfolioSummary as PortfolioSummaryType } from "@/lib/types";
import { formatPrice, formatChangePercent } from "@/lib/utils";

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType;
  isLoading?: boolean;
}

export function PortfolioSummary({ summary, isLoading }: PortfolioSummaryProps) {
  if (isLoading) {
    return (
      <Grid numItemsSm={2} numItemsLg={4} className="gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="h-4 w-24 bg-gray-100 dark:bg-gray-700 rounded mb-2" />
            <div className="h-8 w-16 bg-gray-100 dark:bg-gray-700 rounded" />
          </Card>
        ))}
      </Grid>
    );
  }

  const gainLossColor =
    summary.totalGainLoss >= 0
      ? "emerald"
      : "red";

  const gainLossTextColor =
    summary.totalGainLoss >= 0
      ? "text-emerald-500"
      : "text-red-500";

  return (
    <Grid numItemsSm={2} numItemsLg={4} className="gap-3">
      <Card decoration="top" decorationColor="blue" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <Text className="text-gray-500 dark:text-gray-400">Total Value</Text>
        <Metric className="text-gray-900 dark:text-white">
          {formatPrice(summary.totalValue)}
        </Metric>
      </Card>

      <Card decoration="top" decorationColor="gray" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <Text className="text-gray-500 dark:text-gray-400">Total Cost</Text>
        <Metric className="text-gray-900 dark:text-white">
          {formatPrice(summary.totalCost)}
        </Metric>
      </Card>

      <Card decoration="top" decorationColor={gainLossColor} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <Text className="text-gray-500 dark:text-gray-400">Total Gain/Loss</Text>
        <Metric className={gainLossTextColor}>
          {summary.totalGainLoss >= 0 ? "+" : ""}
          {formatPrice(Math.abs(summary.totalGainLoss))}
          {summary.totalGainLoss < 0 ? " loss" : ""}
        </Metric>
      </Card>

      <Card decoration="top" decorationColor={gainLossColor} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <Text className="text-gray-500 dark:text-gray-400">Total Return</Text>
        <Metric className={gainLossTextColor}>
          {formatChangePercent(summary.totalGainLossPercent)}
        </Metric>
      </Card>
    </Grid>
  );
}
