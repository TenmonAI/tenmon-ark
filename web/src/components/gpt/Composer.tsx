import React, { useState, useRef, useEffect } from "react";
import { useI18n } from "../../i18n/useI18n";

interface ComposerProps {
  onSend: (text: string) => void;
  loading: boolean;
}

const IME_GRACE_MS = 200;

export function Composer({ onSend, loading }: ComposerProps) {
  const [text, setText] = useState("");
  const composingRef = useRef(false);
  const gracePeriodRef = useRef(false);
  const graceTimerRef = useRef<number | null>(null);
  const { t } = useI18n();

  useEffect(() => () => {
    if (graceTimerRef.current != null) clearTimeout(graceTimerRef.current);
  }, []);

  const submit = () => {
    const v = text.trim();
    if (!v || loading) return;
    setText("");
    onSend(v);
  };

  return (
    <div className="gpt-composer-wrap">
      <div className="gpt-composer-inner">
        <textarea
          className="gpt-input gpt-focus-ring gpt-composer-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("composer.placeholder")}
          disabled={loading}
          rows={2}
          onCompositionStart={() => {
            if (graceTimerRef.current != null) {
              clearTimeout(graceTimerRef.current);
              graceTimerRef.current = null;
            }
            gracePeriodRef.current = false;
            composingRef.current = true;
          }}
          onCompositionEnd={() => {
            composingRef.current = false;
            gracePeriodRef.current = true;
            if (graceTimerRef.current != null) clearTimeout(graceTimerRef.current);
            graceTimerRef.current = window.setTimeout(() => {
              gracePeriodRef.current = false;
              graceTimerRef.current = null;
            }, IME_GRACE_MS);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const composing = composingRef.current || (e.nativeEvent as unknown as { isComposing?: boolean }).isComposing;
            if (composing || gracePeriodRef.current) return;
            if (e.shiftKey) return;
            e.preventDefault();
            submit();
          }}
        />
        <button
          type="button"
          className="gpt-btn gpt-btn-primary gpt-focus-ring gpt-composer-btn"
          onClick={submit}
          disabled={loading || !text.trim()}
          aria-label="Send"
        >
          {loading ? <span className="gpt-spinner" aria-hidden /> : <span>➤</span>}
        </button>
      </div>
    </div>
  );
}
