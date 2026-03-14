import React, { useState } from "react";

/** 線で描いた目アイコン（表示/非表示トグル用）。絵文字禁止。 */
function EyeIcon({ show }: { show: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {show ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export type PasswordWithEyeProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  "aria-label"?: string;
  style?: React.CSSProperties;
};

export function PasswordWithEye({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete = "new-password",
  "aria-label": ariaLabel,
  style = {},
}: PasswordWithEyeProps) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label htmlFor={id} style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
        {label}
      </label>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          width: "100%",
        }}
      >
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel || label}
          className="gpt-input"
          style={{
            width: "100%",
            paddingRight: 48,
            boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "パスワードを隠す" : "パスワードを表示"}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            width: 44,
            height: 44,
            minWidth: 44,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            border: "none",
            background: "transparent",
            color: "var(--gpt-text-secondary)",
            cursor: "pointer",
          }}
        >
          <EyeIcon show={show} />
        </button>
      </div>
    </div>
  );
}
