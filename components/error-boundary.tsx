"use client";

import { Component, ReactNode } from "react";
import { Card, Title, Text, Button } from "@tremor/react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`ErrorBoundary caught error in ${this.props.fallbackTitle ?? "component"}:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <Title className="text-red-500">
            {this.props.fallbackTitle ?? "Component"} Error
          </Title>
          <Text className="mt-2 text-gray-500 dark:text-gray-400">
            Something went wrong loading this section.
          </Text>
          <Text className="mt-1 text-xs text-gray-400 dark:text-gray-500 font-mono">
            {this.state.error?.message}
          </Text>
          <Button
            variant="secondary"
            size="xs"
            className="mt-3 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </Button>
        </Card>
      );
    }

    return this.props.children;
  }
}
