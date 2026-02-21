/** Hash a 4-digit PIN string using SHA-256 (Web Crypto API). */
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Compare a plain PIN against a stored hash. Returns true if no PIN is set. */
export async function verifyPin(
  plain: string,
  storedHash: string | undefined
): Promise<boolean> {
  if (!storedHash) return true;
  const hash = await hashPin(plain);
  return hash === storedHash;
}
