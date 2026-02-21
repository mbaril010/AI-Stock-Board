"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "./use-local-storage";
import {
  LS_KEY_PROFILES,
  LS_KEY_MIGRATED,
  LS_KEY_STOCK_LIST,
  LS_KEY_PORTFOLIO,
  SS_KEY_AUTH_SESSION,
  DEFAULT_PROFILE_ID,
  DEFAULT_PROFILE_NAME,
  profileKey,
} from "@/lib/constants";
import { hashPin, verifyPin } from "@/lib/pin";
import type { ProfileInfo, ProfileRegistry } from "@/lib/types";

const DEFAULT_REGISTRY: ProfileRegistry = {
  profiles: [
    { id: DEFAULT_PROFILE_ID, name: DEFAULT_PROFILE_NAME, createdAt: 0 },
  ],
  activeProfileId: DEFAULT_PROFILE_ID,
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function useSession() {
  const [registry, setRegistry] = useLocalStorage<ProfileRegistry>(
    LS_KEY_PROFILES,
    DEFAULT_REGISTRY
  );
  const migrated = useRef(false);

  // Auth state
  const [authenticatedProfileId, setAuthenticatedProfileId] = useState<
    string | null
  >(null);
  const [isReady, setIsReady] = useState(false);

  // One-time migration: copy legacy unprefixed keys into "default" profile
  useEffect(() => {
    if (migrated.current) return;
    migrated.current = true;

    try {
      if (window.localStorage.getItem(LS_KEY_MIGRATED)) return;

      const legacyStocks = window.localStorage.getItem(LS_KEY_STOCK_LIST);
      const legacyPortfolio = window.localStorage.getItem(LS_KEY_PORTFOLIO);

      if (legacyStocks) {
        window.localStorage.setItem(
          profileKey(DEFAULT_PROFILE_ID, "stocks"),
          legacyStocks
        );
      }
      if (legacyPortfolio) {
        window.localStorage.setItem(
          profileKey(DEFAULT_PROFILE_ID, "portfolio"),
          legacyPortfolio
        );
      }

      window.localStorage.setItem(LS_KEY_MIGRATED, "1");
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(SS_KEY_AUTH_SESSION);
      if (stored) {
        // Verify the profile still exists
        const exists = registry.profiles.some((p) => p.id === stored);
        if (exists) {
          setAuthenticatedProfileId(stored);
          // Also sync activeProfileId with the restored session
          setRegistry((prev) => ({ ...prev, activeProfileId: stored }));
        }
      }
    } catch {
      // sessionStorage unavailable
    }
    setIsReady(true);
    // Only run on mount — registry ref is stable enough from useLocalStorage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAuthenticated = authenticatedProfileId !== null;

  const activeProfile =
    registry.profiles.find((p) => p.id === registry.activeProfileId) ??
    registry.profiles[0];

  const login = useCallback(
    async (profileId: string, pin?: string): Promise<boolean> => {
      const profile = registry.profiles.find((p) => p.id === profileId);
      if (!profile) return false;

      const valid = await verifyPin(pin ?? "", profile.pin);
      if (!valid) return false;

      setAuthenticatedProfileId(profileId);
      setRegistry((prev) => ({ ...prev, activeProfileId: profileId }));
      try {
        window.sessionStorage.setItem(SS_KEY_AUTH_SESSION, profileId);
      } catch {
        // sessionStorage unavailable
      }
      return true;
    },
    [registry.profiles, setRegistry]
  );

  const logout = useCallback(() => {
    setAuthenticatedProfileId(null);
    try {
      window.sessionStorage.removeItem(SS_KEY_AUTH_SESSION);
    } catch {
      // ignore
    }
  }, []);

  const switchProfile = useCallback(
    async (profileId: string, pin?: string): Promise<boolean> => {
      const profile = registry.profiles.find((p) => p.id === profileId);
      if (!profile) return false;

      const valid = await verifyPin(pin ?? "", profile.pin);
      if (!valid) return false;

      setAuthenticatedProfileId(profileId);
      setRegistry((prev) => ({ ...prev, activeProfileId: profileId }));
      try {
        window.sessionStorage.setItem(SS_KEY_AUTH_SESSION, profileId);
      } catch {
        // ignore
      }
      return true;
    },
    [registry.profiles, setRegistry]
  );

  const createProfile = useCallback(
    (name: string) => {
      const slug = slugify(name) || "profile";
      const id = `${slug}-${Date.now()}`;
      const newProfile: ProfileInfo = { id, name, createdAt: Date.now() };
      setRegistry((prev) => ({
        profiles: [...prev.profiles, newProfile],
        activeProfileId: id,
      }));
      return id;
    },
    [setRegistry]
  );

  const createProfileWithPin = useCallback(
    async (name: string, pin?: string) => {
      const slug = slugify(name) || "profile";
      const id = `${slug}-${Date.now()}`;
      const hashedPin = pin ? await hashPin(pin) : undefined;
      const newProfile: ProfileInfo = {
        id,
        name,
        createdAt: Date.now(),
        pin: hashedPin,
      };
      setRegistry((prev) => ({
        profiles: [...prev.profiles, newProfile],
        activeProfileId: id,
      }));
      // Auto-login
      setAuthenticatedProfileId(id);
      try {
        window.sessionStorage.setItem(SS_KEY_AUTH_SESSION, id);
      } catch {
        // ignore
      }
      return id;
    },
    [setRegistry]
  );

  const deleteProfile = useCallback(
    (profileId: string) => {
      if (profileId === DEFAULT_PROFILE_ID) return; // can't delete default
      // Clean up this profile's localStorage keys
      try {
        window.localStorage.removeItem(profileKey(profileId, "stocks"));
        window.localStorage.removeItem(profileKey(profileId, "portfolio"));
      } catch {
        // ignore
      }
      // If deleting the authenticated profile, logout
      if (authenticatedProfileId === profileId) {
        setAuthenticatedProfileId(null);
        try {
          window.sessionStorage.removeItem(SS_KEY_AUTH_SESSION);
        } catch {
          // ignore
        }
      }
      setRegistry((prev) => ({
        profiles: prev.profiles.filter((p) => p.id !== profileId),
        activeProfileId:
          prev.activeProfileId === profileId
            ? DEFAULT_PROFILE_ID
            : prev.activeProfileId,
      }));
    },
    [setRegistry, authenticatedProfileId]
  );

  const renameProfile = useCallback(
    (profileId: string, newName: string) => {
      setRegistry((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === profileId ? { ...p, name: newName } : p
        ),
      }));
    },
    [setRegistry]
  );

  return {
    profiles: registry.profiles,
    activeProfile,
    activeProfileId: registry.activeProfileId,
    isAuthenticated,
    isReady,
    login,
    logout,
    switchProfile,
    createProfile,
    createProfileWithPin,
    deleteProfile,
    renameProfile,
  };
}
