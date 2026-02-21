"use client";

import { useSessionContext } from "@/contexts/session-context";
import { LoginScreen } from "@/components/login-screen";
import { Dashboard } from "@/components/dashboard";

export default function Page() {
  const { isAuthenticated, isReady } = useSessionContext();

  if (!isReady) return null;
  if (!isAuthenticated) return <LoginScreen />;
  return <Dashboard />;
}
