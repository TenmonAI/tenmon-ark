import React, { useState } from "react";
import { SettingsPanel } from "../SettingsPanel";
import { useI18n } from "../../i18n/useI18n";
import { PasswordWithEye } from "../PasswordWithEye";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SECTIONS = [
  { id: "general", labelKey: "settings.section.general" },
  { id: "appearance", labelKey: "settings.section.appearance" },
  { id: "language", labelKey: "settings.section.language" },
  { id: "data", labelKey: "settings.section.data" },
  { id: "account", labelKey: "settings.section.account" },
  { id: "about", labelKey: "settings.section.about" },
] as const;

function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setMessage(null);

    if (!currentPassword) {
      setMessage({ type: "error", text: "現在のパスワードを入力してください" });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "新しいパスワードは8文字以上で入力してください" });
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setMessage({ type: "error", text: "新しいパスワードが一致しません" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword,
          newPassword,
          newPasswordConfirm,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body?.ok) {
        setMessage({ type: "error", text: body?.message || body?.error || "パスワードの変更に失敗しました" });
      } else {
        setMessage({ type: "success", text: "パスワードを変更しました" });
        setCurrentPassword("");
        setNewPassword("");
        setNewPasswordConfirm("");
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました。もう一度お試しください。" });
    } finally {
      setSubmitting(false);
    }
  }

  const accountEmail =
    (typeof window !== "undefined" &&
      window.localStorage.getItem("tenmon_user_display_v1")) ||
    "";

  return (
    <div>
      {accountEmail && (
        <div className="gpt-page-card" style={{ marginBottom: 16 }}>
          <h3 className="gpt-page-card-title">メールアドレス</h3>
          <p style={{ fontSize: 14, color: "var(--gpt-text-secondary)", margin: "8px 0 0" }}>
            {accountEmail}
          </p>
        </div>
      )}

      <div className="gpt-page-card">
        <h3 className="gpt-page-card-title">パスワード変更</h3>
        <p style={{ fontSize: 13, color: "var(--gpt-text-secondary)", margin: "4px 0 16px", lineHeight: 1.6 }}>
          安全のため、現在のパスワードを入力してください。
        </p>

        <form onSubmit={handleSubmit}>
          <PasswordWithEye
            label="現在のパスワード"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="現在のパスワード"
            autoComplete="current-password"
          />

          <PasswordWithEye
            label="新しいパスワード"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="8文字以上"
            autoComplete="new-password"
          />

          <PasswordWithEye
            label="新しいパスワード（確認）"
            value={newPasswordConfirm}
            onChange={setNewPasswordConfirm}
            placeholder="もう一度入力"
            autoComplete="new-password"
          />

          {message && (
            <div
              role="alert"
              style={{
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 10,
                background: message.type === "success"
                  ? "rgba(102,187,106,0.1)"
                  : "rgba(185,28,28,0.08)",
                border: message.type === "success"
                  ? "1px solid rgba(102,187,106,0.3)"
                  : "1px solid rgba(185,28,28,0.18)",
                color: message.type === "success" ? "#66bb6a" : "#ef5350",
                fontSize: 14,
              }}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            className="gpt-btn gpt-btn-primary"
            disabled={submitting || !currentPassword || !newPassword || !newPasswordConfirm}
            style={{ width: "100%", height: 44, minHeight: 44 }}
          >
            {submitting ? "変更中..." : "パスワードを変更する"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [section, setSection] = useState<string>("general");
  const { t, lang, setLang, supportedLangs } = useI18n();

  if (!open) return null;

  return (
    <div className="gpt-settings-backdrop" onClick={onClose} role="presentation">
      <div className="gpt-settings-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Settings">
        <nav className="gpt-settings-nav">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`gpt-settings-nav-item ${section === s.id ? "gpt-sidebar-item-active" : ""}`}
              onClick={() => setSection(s.id)}
            >
              {t(s.labelKey)}
            </button>
          ))}
        </nav>
        <div className="gpt-scroll gpt-settings-body">
          <div className="gpt-settings-header">
            <h2 className="gpt-settings-title">{t("settings.title")}</h2>
            <button type="button" className="gpt-btn" onClick={onClose}>
              {t("settings.close")}
            </button>
          </div>
          {section === "data" ? (
            <SettingsPanel open={true} onClose={onClose} onImported={onClose} />
          ) : section === "language" ? (
            <div className="gpt-page-card">
              <h3 className="gpt-page-card-title">{t("settings.language.title")}</h3>
              <p className="gpt-page-sub">{t("settings.language.subtitle")}</p>
              <label className="gpt-page-card">
                <span className="gpt-page-card-title">{t("settings.language.label")}</span>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  style={{ marginTop: 6, padding: "6px 10px", fontSize: "14px" }}
                >
                  {supportedLangs.map((code) => (
                    <option key={code} value={code}>
                      {t(`settings.language.option.${code}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : section === "account" ? (
            <PasswordChangeForm />
          ) : section === "general" ? (
            <div className="gpt-page-card">
              <h3 className="gpt-page-card-title">全般</h3>
              <p className="gpt-page-sub" style={{ lineHeight: 1.8 }}>
                全般設定は現在準備中です。今後のアップデートで、通知設定や応答の詳細度などを調整できるようになります。
              </p>
            </div>
          ) : section === "appearance" ? (
            <div className="gpt-page-card">
              <h3 className="gpt-page-card-title">外観</h3>
              <p className="gpt-page-sub" style={{ lineHeight: 1.8 }}>
                外観設定は現在準備中です。今後のアップデートで、ダークモードやフォントサイズの調整が可能になります。
              </p>
            </div>
          ) : section === "about" ? (
            <div className="gpt-page-card">
              <h3 className="gpt-page-card-title">このアプリについて</h3>
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px", color: "var(--gpt-text-primary)" }}>
                  天聞アーク
                </p>
                <p style={{ fontSize: 13, color: "var(--gpt-text-secondary)", margin: "0 0 12px", lineHeight: 1.7 }}>
                  存在構造の総合解読AI
                </p>
                <p style={{ fontSize: 12, color: "var(--gpt-text-secondary)", margin: "0 0 4px" }}>
                  バージョン: 1.1
                </p>
                <p style={{ fontSize: 12, color: "var(--gpt-text-secondary)", margin: 0, lineHeight: 1.7 }}>
                  宿曜経の星の智慧と、五十音の言霊構造を重ね合わせ、あなたの存在の深層を多角的に照らし出します。
                </p>
              </div>
            </div>
          ) : (
            <p className="gpt-page-sub">{t("settings.comingSoon")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
