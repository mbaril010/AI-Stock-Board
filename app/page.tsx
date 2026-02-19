"use client";

import { useState, useMemo } from "react";
import { Card, Title, Flex, Badge } from "@tremor/react";
import { useStockList } from "@/hooks/use-stock-list";
import { useStockQuotes, useFxRates } from "@/hooks/use-stock-data";
import { usePortfolio } from "@/hooks/use-portfolio";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { StockTable } from "@/components/dashboard/stock-table";
import { PriceChart } from "@/components/dashboard/price-chart";
import { Heatmap } from "@/components/dashboard/heatmap";
import { StockListEditor } from "@/components/dashboard/stock-list-editor";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { PortfolioTable } from "@/components/dashboard/portfolio-table";
import { ThemeToggle } from "@/components/theme-toggle";
import { ErrorBoundary } from "@/components/error-boundary";
import { formatRelativeTime, calculatePortfolioSummary } from "@/lib/utils";

type Tab = "dashboard" | "portfolio";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  // Dashboard state
  const { stockList, symbols, addStock, removeStock } = useStockList();
  const { stocks, stats, timestamp, isLoading, isError, refresh } = useStockQuotes(symbols);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  // Portfolio state
  const { holdings, symbols: portfolioSymbols, addHolding, updateHolding, removeHolding } = usePortfolio();
  const {
    stocks: portfolioStocks,
    timestamp: portfolioTimestamp,
    isLoading: portfolioLoading,
    isError: portfolioError,
  } = useStockQuotes(portfolioSymbols);

  // Derive unique currencies from live quotes for FX conversion
  const portfolioCurrencies = useMemo(
    () => Array.from(new Set(portfolioStocks.map((q) => q.currency).filter(Boolean))),
    [portfolioStocks]
  );
  const { rates: fxRates } = useFxRates(portfolioCurrencies);
  const portfolioSummary = calculatePortfolioSummary(holdings, portfolioStocks, fxRates);

  const currentTimestamp = activeTab === "dashboard" ? timestamp : portfolioTimestamp;
  const currentError = activeTab === "dashboard" ? isError : portfolioError;

  return (
    <main className="p-3 md:p-4 mx-auto max-w-[1600px]">
      {/* Header */}
      <div className="mb-4">
        <Flex justifyContent="between" alignItems="start">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              AI Stock Board
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Track stock prices for top AI companies in real-time
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="text-right">
              {currentTimestamp && (
                <Badge color="gray" size="sm">
                  Updated {formatRelativeTime(currentTimestamp)}
                </Badge>
              )}
              {currentError && (
                <Badge color="red" size="sm" className="ml-2">
                  Error loading data
                </Badge>
              )}
            </div>
          </div>
        </Flex>
      </div>

      {/* Tab Navigation */}
      <div className="mb-4 flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {(["dashboard", "portfolio"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab === "dashboard" ? "Dashboard" : "Portfolio"}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <>
          {/* Stock List Editor (collapsible) */}
          <section className="mb-3">
            <ErrorBoundary fallbackTitle="Stock List Editor">
              <StockListEditor
                stockList={stockList}
                onAdd={addStock}
                onRemove={removeStock}
              />
            </ErrorBoundary>
          </section>

          {/* Stats Cards */}
          <section className="mb-4">
            <ErrorBoundary fallbackTitle="Stats">
              <StatsCards stats={stats} isLoading={isLoading} />
            </ErrorBoundary>
          </section>

          {/* Heatmap & Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
            <ErrorBoundary fallbackTitle="Heatmap">
              <Heatmap
                data={stocks}
                onSelectStock={setSelectedStock}
                selectedStock={selectedStock}
              />
            </ErrorBoundary>
            <ErrorBoundary fallbackTitle="Stock Table">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <Title className="text-gray-900 dark:text-white">Stock Prices</Title>
                <StockTable
                  data={stocks}
                  isLoading={isLoading}
                  selectedStock={selectedStock}
                  onSelectStock={setSelectedStock}
                  onRefresh={refresh}
                />
              </Card>
            </ErrorBoundary>
          </div>

          {/* Price Chart (full-width) */}
          <section className="mb-3">
            <ErrorBoundary fallbackTitle="Price Chart">
              <PriceChart selectedStock={selectedStock} allStocks={symbols} />
            </ErrorBoundary>
          </section>
        </>
      )}

      {/* Portfolio Tab */}
      {activeTab === "portfolio" && (
        <>
          {/* Portfolio Summary Cards */}
          <section className="mb-4">
            <ErrorBoundary fallbackTitle="Portfolio Summary">
              <PortfolioSummary
                summary={portfolioSummary}
                isLoading={portfolioLoading && holdings.length > 0}
              />
            </ErrorBoundary>
          </section>

          {/* Portfolio Table */}
          <section className="mb-3">
            <ErrorBoundary fallbackTitle="Portfolio Table">
              <PortfolioTable
                holdings={holdings}
                quotes={portfolioStocks}
                fxRates={fxRates}
                onAdd={addHolding}
                onUpdate={updateHolding}
                onRemove={removeHolding}
                isLoading={portfolioLoading}
              />
            </ErrorBoundary>
          </section>
        </>
      )}

      {/* Footer */}
      <footer className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500">
        <p>Data sourced from Yahoo Finance. Updates every 60 seconds.</p>
        <p className="mt-1">
          For informational purposes only. Not financial advice.
        </p>
      </footer>
    </main>
  );
}
