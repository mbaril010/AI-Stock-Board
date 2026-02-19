"use client";

import { useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({ data, width = 80, height = 24, className = "" }: SparklineProps) {
  const pathD = useMemo(() => {
    if (data.length < 2) return "";

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 1;

    const points = data.map((val, i) => {
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
      const y = padding + (1 - (val - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    });

    return `M${points.join("L")}`;
  }, [data, width, height]);

  if (data.length < 2) {
    return <div style={{ width, height }} className={className} />;
  }

  // Determine color based on trend (last value vs first value)
  const trend = data[data.length - 1] - data[0];
  const strokeColor = trend >= 0 ? "#34d399" : "#f87171";

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
