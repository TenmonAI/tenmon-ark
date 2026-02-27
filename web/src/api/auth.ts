// PWA_B1: login / me / logout (same-origin, cookie session)
const API_BASE = "";

export async function login(k: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ k: k.trim() }),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok) return { ok: false, error: data.error ?? "LOGIN_FAILED" };
  return { ok: true };
}

export async function me(): Promise<{ ok: boolean; user?: { displayName?: string; email?: string } | null }> {
  const res = await fetch(`${API_BASE}/api/me`, { method: "GET", credentials: "include" });
  const data = (await res.json()) as { ok?: boolean; user?: { displayName?: string; email?: string } | null };
  if (!res.ok) return { ok: false };
  return { ok: true, user: data.user ?? null };
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/logout`, { method: "POST", credentials: "include" });
}
