import React, { useEffect, useState } from "react";
import { GptShell } from "./components/gpt/GptShell";
import { I18nProvider } from "./i18n/useI18n";
import { login as apiLogin, me, logout as apiLogout } from "./api/auth";

const THREAD_ID_KEY = "tenmon_thread_id_v1";
const DISPLAY_KEY = "tenmon_user_display_v1";

function getOrCreateThreadId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(THREAD_ID_KEY);
  if (existing && existing.trim().length > 0) return existing;
  const created =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(THREAD_ID_KEY, created);
  return created;
}

export default function App() {
  const [userDisplay, setUserDisplay] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [threadId, setThreadId] = useState<string>("");

  useEffect(() => {
    const tid = getOrCreateThreadId();
    if (tid) setThreadId(tid);
  }, []);

  useEffect(() => {
    let cancelled = false;
    me().then((r) => {
      if (cancelled) return;
      if (r.ok && r.user) {
        const name =
          (r.user as { displayName?: string; email?: string }).displayName ||
          (r.user as { displayName?: string; email?: string }).email ||
          (typeof window !== "undefined" && window.localStorage.getItem(DISPLAY_KEY)) ||
          "Account";
        setUserDisplay(name);
        if (typeof window !== "undefined") window.localStorage.setItem(DISPLAY_KEY, name);
      } else {
        const stored = typeof window !== "undefined" ? window.localStorage.getItem(DISPLAY_KEY) : null;
        setUserDisplay(stored);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleLoginSubmit = async (k: string) => {
    const r = await apiLogin(k);
    if (!r.ok) return r;
    const m = await me();
    const display =
      m.ok && m.user
        ? (m.user.displayName || m.user.email || "User")
        : "User";
    if (typeof window !== "undefined") window.localStorage.setItem(DISPLAY_KEY, display);
    setUserDisplay(display);
    setLoginModalOpen(false);
    return r;
  };

  const handleLogout = async () => {
    await apiLogout();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DISPLAY_KEY);
    }
    setUserDisplay(null);
    setLoginModalOpen(false);
  };

  return (
    <I18nProvider>
      <GptShell
        userDisplay={userDisplay}
        onOpenLoginModal={() => setLoginModalOpen(true)}
        onLogout={handleLogout}
        threadId={threadId}
        setThreadId={setThreadId}
      />
      {loginModalOpen && (
        <LoginModal
          onClose={() => setLoginModalOpen(false)}
          onLogin={handleLoginSubmit}
          onLogout={handleLogout}
          isLoggedIn={!!userDisplay}
          displayName={userDisplay || ""}
        />
      )}
    </I18nProvider>
  );
}

interface LoginModalProps {
  onClose: () => void;
  onLogin: (k: string) => Promise<{ ok: boolean; error?: string }>;
  onLogout: () => Promise<void>;
  isLoggedIn: boolean;
  displayName: string;
}

function LoginModal({ onClose, onLogin, onLogout, isLoggedIn, displayName }: LoginModalProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await onLogin(key);
      if (!res.ok) setError(res.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gpt-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="gpt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gpt-modal-header">
          <h2>Account</h2>
          <button type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        {isLoggedIn ? (
          <div className="gpt-modal-body">
            <p>{displayName}</p>
            <button type="button" onClick={() => onLogout()}>Logout</button>
          </div>
        ) : (
          <form className="gpt-modal-body" onSubmit={handleSubmit}>
            <label>
              Key / Email
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Enter key or email"
                autoComplete="username"
              />
            </label>
            {error && <p className="gpt-modal-error">{error}</p>}
            <button type="submit" disabled={loading}>Login</button>
          </form>
        )}
      </div>
    </div>
  );
}
