"use client";

import { SWRConfig } from "swr";
import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SWRConfig
        value={{
          onError: (error) => {
            console.error("SWR Error:", error);
          },
          shouldRetryOnError: true,
          errorRetryCount: 3,
          errorRetryInterval: 5000,
        }}
      >
        {children}
      </SWRConfig>
    </ThemeProvider>
  );
}
