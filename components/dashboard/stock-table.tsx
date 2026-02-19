"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  SortingState,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  TextInput,
  Button,
} from "@tremor/react";
import { MagnifyingGlassIcon, ArrowPathIcon, ArrowDownTrayIcon, StarIcon as StarOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { LS_KEY_FAVORITES } from "@/lib/constants";
import type { StockData } from "@/lib/types";
import {
  formatPrice,
  formatChangePercent,
  formatUSD,
  formatLargeNumber,
  exportTableCSV,
  exportTableJSON,
} from "@/lib/utils";
import { SparklineCell } from "./sparkline-cell";

interface StockTableProps {
  data: StockData[];
  isLoading?: boolean;
  onSelectStock?: (symbol: string) => void;
  selectedStock?: string | null;
  onRefresh?: () => void;
}

export function StockTable({
  data,
  isLoading,
  onSelectStock,
  selectedStock,
  onRefresh,
}: StockTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "changePercent", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [favorites, setFavorites] = useLocalStorage<string[]>(LS_KEY_FAVORITES, []);

  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  const toggleFavorite = useCallback(
    (symbol: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setFavorites((prev) =>
        prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
      );
    },
    [setFavorites]
  );

  const filteredData = useMemo(() => {
    // Pin favorites to top
    const favs = data.filter((r) => favoritesSet.has(r.symbol));
    const rest = data.filter((r) => !favoritesSet.has(r.symbol));
    return [...favs, ...rest];
  }, [data, favoritesSet]);

  const columns = useMemo<ColumnDef<StockData>[]>(
    () => [
      {
        id: "favorite",
        header: () => <StarOutline className="h-4 w-4 text-gray-400 dark:text-gray-500" />,
        cell: ({ row }) => {
          const isFav = favoritesSet.has(row.original.symbol);
          return (
            <button
              onClick={(e) => toggleFavorite(row.original.symbol, e)}
              className="p-0.5 hover:scale-110 transition-transform"
              aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
            >
              {isFav ? (
                <StarSolid className="h-4 w-4 text-yellow-400" />
              ) : (
                <StarOutline className="h-4 w-4 text-gray-400 dark:text-gray-600 hover:text-yellow-400" />
              )}
            </button>
          );
        },
        enableSorting: false,
        size: 40,
      },
      {
        accessorKey: "symbol",
        header: "Symbol",
        cell: ({ row }) => (
          <div>
            <span className="font-semibold text-gray-900 dark:text-white">{row.original.symbol}</span>
            <span className="ml-1.5 text-gray-400 dark:text-gray-500 text-[11px]">{row.original.shortName}</span>
          </div>
        ),
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => (
          <span className="font-mono text-gray-900 dark:text-white">{formatPrice(row.original.price)}</span>
        ),
      },
      {
        accessorKey: "changePercent",
        header: "Change %",
        cell: ({ row }) => {
          const pct = row.original.changePercent;
          return (
            <span className={`font-mono font-semibold ${pct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {formatChangePercent(pct)}
            </span>
          );
        },
      },
      {
        id: "sparkline",
        header: "7d Trend",
        cell: ({ row }) => <SparklineCell symbol={row.original.symbol} />,
        enableSorting: false,
        size: 90,
      },
      {
        accessorKey: "marketCap",
        header: "Market Cap",
        cell: ({ row }) => (
          <span className="font-mono text-gray-600 dark:text-gray-300 text-xs">
            {row.original.marketCap ? formatUSD(row.original.marketCap, 1) : "—"}
          </span>
        ),
      },
      {
        accessorKey: "volume",
        header: "Volume",
        cell: ({ row }) => (
          <span className="font-mono text-gray-600 dark:text-gray-300 text-xs">
            {row.original.volume ? formatLargeNumber(row.original.volume) : "—"}
          </span>
        ),
      },
      {
        accessorKey: "trailingPE",
        header: "P/E",
        cell: ({ row }) => (
          <span className="font-mono text-gray-600 dark:text-gray-300 text-xs">
            {row.original.trailingPE ? row.original.trailingPE.toFixed(1) : "—"}
          </span>
        ),
      },
      {
        id: "52wkRange",
        header: "52wk Range",
        cell: ({ row }) => {
          const { fiftyTwoWeekLow, fiftyTwoWeekHigh, price } = row.original;
          if (!fiftyTwoWeekLow || !fiftyTwoWeekHigh) return <span className="text-gray-400">—</span>;
          const range = fiftyTwoWeekHigh - fiftyTwoWeekLow;
          const position = range > 0 ? ((price - fiftyTwoWeekLow) / range) * 100 : 50;
          return (
            <div className="flex items-center gap-1 min-w-[100px]">
              <span className="text-[10px] text-gray-400">{formatPrice(fiftyTwoWeekLow)}</span>
              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full relative">
                <div
                  className="absolute h-2.5 w-1 bg-blue-500 rounded-full top-1/2 -translate-y-1/2"
                  style={{ left: `${Math.min(100, Math.max(0, position))}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400">{formatPrice(fiftyTwoWeekHigh)}</span>
            </div>
          );
        },
        enableSorting: false,
        size: 150,
      },
    ],
    [favoritesSet, toggleFavorite]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="h-10 w-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="h-96 bg-white dark:bg-gray-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[160px] max-w-md">
          <TextInput
            icon={MagnifyingGlassIcon}
            placeholder="Search stocks..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          />
        </div>
        {onRefresh && (
          <Button
            variant="secondary"
            icon={ArrowPathIcon}
            onClick={onRefresh}
            size="sm"
            className="bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Refresh
          </Button>
        )}
        <Button
          variant="secondary"
          icon={ArrowDownTrayIcon}
          onClick={() => exportTableCSV(filteredData)}
          size="sm"
          className="bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          CSV
        </Button>
        <Button
          variant="secondary"
          icon={ArrowDownTrayIcon}
          onClick={() => exportTableJSON(filteredData)}
          size="sm"
          className="bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          JSON
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table className="border-gray-200 dark:border-gray-700 w-full">
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-gray-200 dark:border-gray-700">
                {headerGroup.headers.map((header) => (
                  <TableHeaderCell
                    key={header.id}
                    className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 px-1.5 py-1 text-xs ${
                      header.column.getIsSorted() ? "bg-gray-100 dark:bg-gray-700" : ""
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: " ↑",
                        desc: " ↓",
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </TableHeaderCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow className="border-gray-200 dark:border-gray-700">
                <TableCell colSpan={columns.length} className="text-center py-8 bg-white dark:bg-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">No stocks found</span>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-gray-200 dark:border-gray-700 ${
                    selectedStock === row.original.symbol ? "bg-gray-100 dark:bg-gray-700" : "bg-white dark:bg-gray-800"
                  }`}
                  onClick={() => onSelectStock?.(row.original.symbol)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="border-gray-200 dark:border-gray-700 px-1.5 py-1 text-xs whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Showing {table.getRowModel().rows.length} of {filteredData.length} stocks
        </span>
        <div className="flex gap-1">
          <Button
            variant="secondary"
            size="xs"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            Previous
          </Button>
          <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
