"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, Title } from "@tremor/react";
import { XMarkIcon, ChevronDownIcon, ChevronUpIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { StockListItem } from "@/lib/types";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

interface StockListEditorProps {
  stockList: StockListItem[];
  onAdd: (item: StockListItem) => void;
  onRemove: (symbol: string) => void;
}

export function StockListEditor({ stockList, onAdd, onRemove }: StockListEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

  // Debounced search
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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    if (stockList.some((s) => s.symbol === result.symbol)) {
      setQuery("");
      setShowDropdown(false);
      return;
    }
    onAdd({ symbol: result.symbol, name: result.name, sector: "" });
    setQuery("");
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      // If there are results, select the first one
      if (results.length > 0) {
        handleSelect(results[0]);
      } else {
        // Fallback: add raw ticker
        const symbol = query.trim().toUpperCase();
        if (!stockList.some((s) => s.symbol === symbol)) {
          onAdd({ symbol, name: symbol, sector: "" });
        }
        setQuery("");
        setShowDropdown(false);
      }
    }
    if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const existingSymbols = new Set(stockList.map((s) => s.symbol));

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between"
      >
        <Title className="text-gray-900 dark:text-white">
          Stock List ({stockList.length} stocks)
        </Title>
        {isOpen ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {/* Search input with dropdown */}
          <div className="flex gap-2">
            <div className="flex-1 relative" ref={dropdownRef}>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search ticker or company name..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {isSearching && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400" />
                  </div>
                )}
              </div>

              {/* Search results dropdown */}
              {showDropdown && results.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-64 overflow-y-auto">
                  {results.map((result) => {
                    const alreadyAdded = existingSymbols.has(result.symbol);
                    return (
                      <button
                        key={result.symbol}
                        onClick={() => handleSelect(result)}
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{result.exchange}</span>
                          {alreadyAdded && (
                            <span className="text-xs text-green-500 font-medium">Added</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Stock badges grid */}
          <div className="flex flex-wrap gap-1.5">
            {stockList.map((stock) => (
              <span
                key={stock.symbol}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600"
              >
                {stock.symbol}
                <button
                  onClick={() => onRemove(stock.symbol)}
                  className="hover:text-red-400 transition-colors"
                  aria-label={`Remove ${stock.symbol}`}
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
