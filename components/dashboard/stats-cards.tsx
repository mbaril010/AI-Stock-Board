"use client";

import { Card, Metric, Text, Flex, BadgeDelta, Grid } from "@tremor/react";
import type { DashboardStats } from "@/lib/types";
import { formatChangePercent } from "@/lib/utils";

interface StatsCardsProps {
  stats: DashboardStats | null;
  isLoading?: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading || !stats) {
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

  return (
    <Grid numItemsSm={2} numItemsLg={4} className="gap-3">
      <Card decoration="top" decorationColor="blue" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <Text className="text-gray-500 dark:text-gray-400">Stocks Tracked</Text>
        <Metric className="text-gray-900 dark:text-white">{stats.totalStocks}</Metric>
      </Card>

      <Card decoration="top" decorationColor="emerald" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <Text className="text-gray-500 dark:text-gray-400">Top Gainer</Text>
        <Flex justifyContent="start" alignItems="baseline" className="space-x-1">
          <Metric className="text-gray-900 dark:text-white">
            {stats.topGainer?.symbol ?? "N/A"}
          </Metric>
          {stats.topGainer && (
            <BadgeDelta deltaType="increase">
              {formatChangePercent(stats.topGainer.changePercent)}
            </BadgeDelta>
          )}
        </Flex>
      </Card>

      <Card decoration="top" decorationColor="red" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <Text className="text-gray-500 dark:text-gray-400">Top Loser</Text>
        <Flex justifyContent="start" alignItems="baseline" className="space-x-1">
          <Metric className="text-gray-900 dark:text-white">
            {stats.topLoser?.symbol ?? "N/A"}
          </Metric>
          {stats.topLoser && (
            <BadgeDelta deltaType="decrease">
              {formatChangePercent(stats.topLoser.changePercent)}
            </BadgeDelta>
          )}
        </Flex>
      </Card>

      <Card decoration="top" decorationColor="amber" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <Text className="text-gray-500 dark:text-gray-400">Avg Daily Change</Text>
        <Metric className="text-gray-900 dark:text-white">
          {formatChangePercent(stats.averageDailyChange)}
        </Metric>
      </Card>
    </Grid>
  );
}
