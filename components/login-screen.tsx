"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSessionContext } from "@/contexts/session-context";
import type { ProfileInfo } from "@/lib/types";

type View = "select" | "pin" | "signup";

export function LoginScreen() {
  const { profiles, login, createProfileWithPin } = useSessionContext();
  const [view, setView] = useState<View>("select");
  const [selectedProfile, setSelectedProfile] = useState<ProfileInfo | null>(null);
  const [pinError, setPinError] = useState(false);

  const handleSelectProfile = useCallback(
    async (profile: ProfileInfo) => {
      if (profile.pin) {
        setSelectedProfile(profile);
        setPinError(false);
        setView("pin");
      } else {
        await login(profile.id);
      }
    },
    [login]
  );

  const handlePinSubmit = useCallback(
    async (pin: string) => {
      if (!selectedProfile) return;
      const ok = await login(selectedProfile.id, pin);
      if (!ok) {
        setPinError(true);
      }
    },
    [selectedProfile, login]
  );

  const handleSignup = useCallback(
    async (name: string, pin?: string) => {
      await createProfileWithPin(name, pin);
    },
    [createProfileWithPin]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm">
        {/* App title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI Stock Board
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track stock prices for top AI companies
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {view === "select" && (
            <SelectView
              profiles={profiles}
              onSelect={handleSelectProfile}
              onCreateNew={() => setView("signup")}
            />
          )}
          {view === "pin" && selectedProfile && (
            <PinView
              profile={selectedProfile}
              error={pinError}
              onSubmit={handlePinSubmit}
              onBack={() => {
                setView("select");
                setPinError(false);
              }}
            />
          )}
          {view === "signup" && (
            <SignupView
              onSubmit={handleSignup}
              onBack={() => setView("select")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Select View ─────────────────────────────────────────────────────

function SelectView({
  profiles,
  onSelect,
  onCreateNew,
}: {
  profiles: ProfileInfo[];
  onSelect: (p: ProfileInfo) => void;
  onCreateNew: () => void;
}) {
  return (
    <div className="p-4">
      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        Choose a profile
      </h2>
      <div className="space-y-1">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm
              text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              {/* Avatar circle */}
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium text-sm">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium">{p.name}</span>
            </div>
            {p.pin && (
              <svg
                className="w-4 h-4 text-gray-400"
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
          </button>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onCreateNew}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium
            text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create New Profile
        </button>
      </div>
    </div>
  );
}

// ─── PIN View ────────────────────────────────────────────────────────

function PinView({
  profile,
  error,
  onSubmit,
  onBack,
}: {
  profile: ProfileInfo;
  error: boolean;
  onSubmit: (pin: string) => void;
  onBack: () => void;
}) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [shake, setShake] = useState(false);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Focus first input on mount
  useEffect(() => {
    refs[0].current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shake + clear on error
  useEffect(() => {
    if (error) {
      setShake(true);
      const t = setTimeout(() => {
        setShake(false);
        setDigits(["", "", "", ""]);
        refs[0].current?.focus();
      }, 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < 3) {
      refs[index + 1].current?.focus();
    }

    // Auto-submit on 4th digit
    if (digit && index === 3) {
      const pin = next.join("");
      if (pin.length === 4) {
        onSubmit(pin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 0) return;
    const next = ["", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    if (pasted.length === 4) {
      onSubmit(pasted);
    } else {
      refs[Math.min(pasted.length, 3)].current?.focus();
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-lg mb-3">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <p className="font-medium text-gray-900 dark:text-white">{profile.name}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter your 4-digit PIN</p>
      </div>

      <div
        className={`flex justify-center gap-3 mb-4 ${shake ? "animate-shake" : ""}`}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            className={`w-12 h-14 text-center text-xl font-semibold rounded-lg border-2 outline-none transition-colors
              bg-white dark:bg-gray-900
              ${
                error
                  ? "border-red-400 dark:border-red-500"
                  : "border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
              }
              text-gray-900 dark:text-white`}
          />
        ))}
      </div>

      {error && (
        <p className="text-center text-sm text-red-500 dark:text-red-400">
          Wrong PIN. Try again.
        </p>
      )}
    </div>
  );
}

// ─── Signup View ─────────────────────────────────────────────────────

function SignupView({
  onSubmit,
  onBack,
}: {
  onSubmit: (name: string, pin?: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [pinDigits, setPinDigits] = useState(["", "", "", ""]);
  const [usePin, setUsePin] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    if (usePin) pinRefs[0].current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usePin]);

  const handlePinChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...pinDigits];
    next[index] = digit;
    setPinDigits(next);
    if (digit && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const pinValue = pinDigits.join("");
  const isPinComplete = !usePin || pinValue.length === 4;
  const canSubmit = name.trim().length > 0 && isPinComplete;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const pin = usePin && pinValue.length === 4 ? pinValue : undefined;
    onSubmit(name.trim(), pin);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Create Profile
      </h2>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Profile name
        </label>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          maxLength={30}
          className="w-full px-3 py-2 text-sm rounded-lg border
            bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600
            text-gray-900 dark:text-white placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* PIN toggle */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={usePin}
            onChange={(e) => {
              setUsePin(e.target.checked);
              if (!e.target.checked) setPinDigits(["", "", "", ""]);
            }}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Protect with a 4-digit PIN
          </span>
        </label>
      </div>

      {/* PIN inputs */}
      {usePin && (
        <div className="flex justify-center gap-3 mb-4">
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
              className="w-12 h-14 text-center text-xl font-semibold rounded-lg border-2 outline-none transition-colors
                bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600
                focus:border-blue-500 dark:focus:border-blue-400
                text-gray-900 dark:text-white"
            />
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full py-2.5 text-sm font-medium rounded-lg transition-colors
          bg-blue-600 text-white hover:bg-blue-700
          disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Create Profile
      </button>
    </form>
  );
}
