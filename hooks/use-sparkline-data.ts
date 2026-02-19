"use client";

import useSWR from "swr";

interface SparklineResponse {
  data: number[];
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

export function useSparklineData(symbol: string | null) {
  const { data } = useSWR<SparklineResponse>(
    symbol ? `/api/sparkline?symbol=${encodeURIComponent(symbol)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes
      revalidateOnReconnect: false,
    }
  );

  if (!data?.data?.length) return null;
  return data.data;
}
