"use client";

import { useState, useRef, useEffect } from "react";
import { useSessionContext } from "@/contexts/session-context";
import type { ProfileInfo } from "@/lib/types";

export function ProfileSwitcher() {
  const { profiles, activeProfile, switchProfile, deleteProfile, logout } =
    useSessionContext();

  const [open, setOpen] = useState(false);
  const [pinTarget, setPinTarget] = useState<ProfileInfo | null>(null);
  const [pinDigits, setPinDigits] = useState(["", "", "", ""]);
  const [pinError, setPinError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        resetPin();
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Focus first PIN input when entering PIN mode
  useEffect(() => {
    if (pinTarget) pinRefs[0].current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinTarget]);

  function resetPin() {
    setPinTarget(null);
    setPinDigits(["", "", "", ""]);
    setPinError(false);
  }

  async function handleSelectProfile(p: ProfileInfo) {
    if (p.id === activeProfile.id) {
      setOpen(false);
      return;
    }
    if (p.pin) {
      // Need PIN
      setPinTarget(p);
      setPinDigits(["", "", "", ""]);
      setPinError(false);
    } else {
      // No PIN — switch immediately
      await switchProfile(p.id);
      setOpen(false);
    }
  }

  async function handlePinSubmit(pin: string) {
    if (!pinTarget) return;
    const ok = await switchProfile(pinTarget.id, pin);
    if (ok) {
      resetPin();
      setOpen(false);
    } else {
      setPinError(true);
      setPinDigits(["", "", "", ""]);
      setTimeout(() => pinRefs[0].current?.focus(), 100);
    }
  }

  function handlePinChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...pinDigits];
    next[index] = digit;
    setPinDigits(next);
    setPinError(false);

    if (digit && index < 3) {
      pinRefs[index + 1].current?.focus();
    }

    if (digit && index === 3) {
      const pin = next.join("");
      if (pin.length === 4) handlePinSubmit(pin);
    }
  }

  function handlePinKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
    if (e.key === "Escape") {
      resetPin();
    }
  }

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (open) resetPin();
        }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-lg
          bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
          hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        {/* User icon */}
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span className="max-w-[100px] truncate">{activeProfile.name}</span>
        {/* Chevron */}
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-1 w-56 rounded-lg border shadow-lg z-50
            bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        >
          <div className="p-1">
            <div className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Profiles
            </div>

            {/* Profile list */}
            {profiles.map((p) => (
              <div key={p.id}>
                <div
                  className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm cursor-pointer
                    ${
                      p.id === activeProfile.id
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  onClick={() => handleSelectProfile(p)}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate">{p.name}</span>
                    {p.pin && (
                      <svg
                        className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    )}
                  </div>
                  {/* Delete button (not on default) */}
                  {p.id !== "default" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProfile(p.id);
                      }}
                      className="ml-2 p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      title="Delete profile"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Inline PIN input for this profile */}
                {pinTarget?.id === p.id && (
                  <div className="px-2 py-2">
                    <div className="flex items-center gap-1.5 justify-center">
                      {pinDigits.map((d, i) => (
                        <input
                          key={i}
                          ref={pinRefs[i]}
                          type="tel"
                          inputMode="numeric"
                          maxLength={1}
                          value={d}
                          onChange={(e) => handlePinChange(i, e.target.value)}
                          onKeyDown={(e) => handlePinKeyDown(i, e)}
                          className={`w-8 h-9 text-center text-sm font-semibold rounded border outline-none transition-colors
                            bg-white dark:bg-gray-900
                            ${
                              pinError
                                ? "border-red-400 dark:border-red-500"
                                : "border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                            }
                            text-gray-900 dark:text-white`}
                        />
                      ))}
                    </div>
                    {pinError && (
                      <p className="text-center text-xs text-red-500 dark:text-red-400 mt-1">
                        Wrong PIN
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Separator + Logout */}
            <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm
                text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
