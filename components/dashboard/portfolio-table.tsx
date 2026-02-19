"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
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
  Card,
  Title,
} from "@tremor/react";
import { XMarkIcon, MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { PortfolioHolding, StockData } from "@/lib/types";
import { formatPrice, formatChangePercent } from "@/lib/utils";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

interface PortfolioRow extends PortfolioHolding {
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  dailyChangePercent: number;
  quoteCurrency: string;
}

interface PortfolioTableProps {
  holdings: PortfolioHolding[];
  quotes: StockData[];
  fxRates: Record<string, number>;
  onAdd: (holding: PortfolioHolding) => void;
  onUpdate: (symbol: string, updates: Partial<Pick<PortfolioHolding, "shares" | "avgCostPerShare" | "currency">>) => void;
  onRemove: (symbol: string) => void;
  isLoading?: boolean;
}

// Inline editable cell
function EditableCell({
  value,
  onSave,
  formatDisplay,
}: {
  value: number;
  onSave: (v: number) => void;
  formatDisplay: (v: number) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(String(value));
      inputRef.current?.select();
    }
  }, [editing, value]);

  const commit = () => {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed) && parsed > 0) {
      onSave(parsed);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="any"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-20 px-1 py-0.5 text-xs font-mono rounded border border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="font-mono text-gray-900 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer border-b border-dashed border-gray-300 dark:border-gray-600"
      title="Click to edit"
    >
      {formatDisplay(value)}
    </button>
  );
}

export function PortfolioTable({
  holdings,
  quotes,
  fxRates,
  onAdd,
  onUpdate,
  onRemove,
  isLoading,
}: PortfolioTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [query, setQuery] = useState("");
  const [shares, setShares] = useState("");
  const [cost, setCost] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const priceMap = useMemo(
    () => new Map(quotes.map((q) => [q.symbol, q])),
    [quotes]
  );

  const rows = useMemo<PortfolioRow[]>(
    () =>
      holdings.map((h) => {
        const quote = priceMap.get(h.symbol);
        const currentPrice = quote?.price ?? 0;
        const quoteCurrency = quote?.currency ?? h.currency ?? "USD";
        const marketValue = currentPrice * h.shares;
        const totalCost = h.avgCostPerShare * h.shares;
        const gainLoss = marketValue - totalCost;
        const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
        const dailyChangePercent = quote?.changePercent ?? 0;
        return {
          ...h,
          currentPrice,
          marketValue,
          gainLoss,
          gainLossPercent,
          dailyChangePercent,
          quoteCurrency,
        };
      }),
    [holdings, priceMap]
  );

  // Totals for summary row (converted to USD)
  const totals = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    for (const r of rows) {
      const fx = fxRates[r.quoteCurrency] ?? (r.quoteCurrency === "USD" ? 1 : 0);
      totalValue += r.marketValue * fx;
      totalCost += r.avgCostPerShare * r.shares * fx;
    }
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    return { totalValue, totalCost, totalGainLoss, totalGainLossPercent };
  }, [rows, fxRates]);

  // Search
  const searchStocks = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search-stock?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setShowDropdown(true);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(() => searchStocks(query.trim()), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchStocks]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectResult = (result: SearchResult) => {
    setSelectedResult(result);
    setQuery(result.symbol);
    setShowDropdown(false);
  };

  const handleAdd = () => {
    const sharesNum = parseFloat(shares);
    const costNum = parseFloat(cost);
    if (!selectedResult || isNaN(sharesNum) || sharesNum <= 0 || isNaN(costNum) || costNum <= 0) return;
    if (holdings.some((h) => h.symbol === selectedResult.symbol)) return;

    onAdd({
      symbol: selectedResult.symbol,
      name: selectedResult.name,
      shares: sharesNum,
      avgCostPerShare: costNum,
      currency: "USD",
    });

    setQuery("");
    setShares("");
    setCost("");
    setSelectedResult(null);
    inputRef.current?.focus();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setShowDropdown(false);
    if (e.key === "Enter" && results.length > 0 && !selectedResult) {
      handleSelectResult(results[0]);
    }
  };

  const existingSymbols = new Set(holdings.map((h) => h.symbol));

  const columns = useMemo<ColumnDef<PortfolioRow>[]>(
    () => [
      {
        accessorKey: "symbol",
        header: "Symbol",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <span className="font-semibold text-gray-900 dark:text-white">{row.original.symbol}</span>
            {row.original.quoteCurrency !== "USD" && (
              <span className="px-1 py-0.5 text-[9px] font-medium rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 leading-none">
                {row.original.quoteCurrency}
              </span>
            )}
            <span className="text-gray-400 dark:text-gray-500 text-[11px]">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "shares",
        header: "Shares",
        cell: ({ row }) => (
          <EditableCell
            value={row.original.shares}
            onSave={(v) => onUpdate(row.original.symbol, { shares: v })}
            formatDisplay={(v) => v.toLocaleString("en-US", { maximumFractionDigits: 4 })}
          />
        ),
      },
      {
        accessorKey: "avgCostPerShare",
        header: "Avg Cost",
        cell: ({ row }) => (
          <EditableCell
            value={row.original.avgCostPerShare}
            onSave={(v) => onUpdate(row.original.symbol, { avgCostPerShare: v })}
            formatDisplay={(v) => formatPrice(v, row.original.quoteCurrency)}
          />
        ),
      },
      {
        accessorKey: "currentPrice",
        header: "Price",
        cell: ({ row }) => (
          <span className="font-mono text-gray-900 dark:text-white">
            {row.original.currentPrice > 0 ? formatPrice(row.original.currentPrice, row.original.quoteCurrency) : "—"}
          </span>
        ),
      },
      {
        accessorKey: "marketValue",
        header: "Value",
        cell: ({ row }) => (
          <span className="font-mono text-gray-900 dark:text-white">
            {row.original.marketValue > 0 ? formatPrice(row.original.marketValue, row.original.quoteCurrency) : "—"}
          </span>
        ),
      },
      {
        accessorKey: "gainLoss",
        header: "Gain/Loss",
        cell: ({ row }) => {
          const gl = row.original.gainLoss;
          return (
            <span className={`font-mono font-semibold ${gl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {gl >= 0 ? "+" : ""}{formatPrice(Math.abs(gl), row.original.quoteCurrency)}{gl < 0 ? " loss" : ""}
            </span>
          );
        },
      },
      {
        accessorKey: "gainLossPercent",
        header: "Return %",
        cell: ({ row }) => {
          const pct = row.original.gainLossPercent;
          return (
            <span className={`font-mono font-semibold ${pct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {formatChangePercent(pct)}
            </span>
          );
        },
      },
      {
        accessorKey: "dailyChangePercent",
        header: "Daily %",
        cell: ({ row }) => {
          const pct = row.original.dailyChangePercent;
          return (
            <span className={`font-mono ${pct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {formatChangePercent(pct)}
            </span>
          );
        },
      },
      {
        id: "remove",
        header: "",
        cell: ({ row }) => (
          <button
            onClick={() => onRemove(row.original.symbol)}
            className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
            aria-label={`Remove ${row.original.symbol}`}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        ),
        enableSorting: false,
        size: 40,
      },
    ],
    [onUpdate, onRemove]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <Title className="text-gray-900 dark:text-white mb-3">Portfolio Holdings</Title>

      {/* Add holding form */}
      <div className="flex flex-wrap gap-2 mb-3 items-end">
        <div className="relative flex-1 min-w-[180px]" ref={dropdownRef}>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Symbol</label>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search ticker..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedResult(null);
              }}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {isSearching && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400" />
              </div>
            )}
          </div>

          {showDropdown && results.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {results.map((result) => {
                const alreadyAdded = existingSymbols.has(result.symbol);
                return (
                  <button
                    key={result.symbol}
                    onClick={() => handleSelectResult(result)}
                    disabled={alreadyAdded}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${
                      alreadyAdded
                        ? "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-600"
                        : "hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">{result.symbol}</span>
                      <span className="ml-2 text-gray-500 dark:text-gray-400">{result.name}</span>
                    </div>
                    {alreadyAdded && (
                      <span className="text-xs text-green-500 font-medium">Added</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="w-24">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Shares</label>
          <input
            type="number"
            step="any"
            placeholder="100"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="w-28">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Cost</label>
          <input
            type="number"
            step="any"
            placeholder="150.00"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleAdd}
          disabled={!selectedResult || !shares || !cost}
          className="px-3 py-2 text-sm font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        >
          <PlusIcon className="h-4 w-4" />
          Add
        </button>
      </div>

      {/* Table */}
      {isLoading && holdings.length === 0 ? (
        <div className="h-48 bg-gray-50 dark:bg-gray-700 rounded animate-pulse" />
      ) : holdings.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-1">No holdings yet</p>
          <p className="text-sm">Search for a stock above to add your first holding.</p>
        </div>
      ) : (
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
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="border-gray-200 dark:border-gray-700 px-1.5 py-1 text-xs whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}

              {/* Summary row — totals converted to USD */}
              <TableRow className="bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 font-semibold">
                <TableCell className="border-gray-200 dark:border-gray-700 px-1.5 py-1.5 text-xs text-gray-900 dark:text-white">
                  Total ({holdings.length})
                  {rows.some((r) => r.quoteCurrency !== "USD") && (
                    <span className="ml-1 text-[9px] font-normal text-gray-400">USD</span>
                  )}
                </TableCell>
                <TableCell className="border-gray-200 dark:border-gray-700 px-1.5 py-1.5 text-xs" />
                <TableCell className="border-gray-200 dark:border-gray-700 px-1.5 py-1.5 text-xs font-mono text-gray-600 dark:text-gray-300">
                  {formatPrice(totals.totalCost)}
                </TableCell>
                <TableCell className="border-gray-200 dark:border-gray-700 px-1.5 py-1.5 text-xs" />
                <TableCell className="border-gray-200 dark:border-gray-700 px-1.5 py-1.5 text-xs font-mono text-gray-900 dark:text-white">
                  {formatPrice(totals.totalValue)}
                </TableCell>
                <TableCell className={`border-gray-200 dark:border-gray-700 px-1.5 py-1.5 text-xs font-mono font-semibold ${totals.totalGainLoss >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {totals.totalGainLoss >= 0 ? "+" : ""}{formatPrice(Math.abs(totals.totalGainLoss))}{totals.totalGainLoss < 0 ? " loss" : ""}
                </TableCell>
                <TableCell className={`border-gray-200 dark:border-gray-700 px-1.5 py-1.5 text-xs font-mono font-semibold ${totals.totalGainLossPercent >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {formatChangePercent(totals.totalGainLossPercent)}
                </TableCell>
                <TableCell className="border-gray-200 dark:border-gray-700 px-1.5 py-1.5 text-xs" />
                <TableCell className="border-gray-200 dark:border-gray-700 px-1.5 py-1.5 text-xs" />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
