import React, { useEffect, useRef, useState } from "react";
import { useChat } from "../../hooks/useChat";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { EmptyState } from "./EmptyState";
import { SukuyouContextBar, SukuyouContext } from "./SukuyouContextBar";

/**
 * MANUS-UI-04: [SUKUYOU_SEED] JSON から文脈情報を抽出する。
 * rawSeed 例: "[SUKUYOU_SEED] {\"honmeiShuku\":\"翼\",\"disasterType\":\"過剰責任型\",...}"
 */
function parseSukuyouContext(raw: string): SukuyouContext | null {
  try {
    const json = raw.replace(/^\[SUKUYOU_SEED\]\s*/, "");
    const parsed = JSON.parse(json);
    if (parsed?.honmeiShuku) {
      return {
        honmeiShuku: parsed.honmeiShuku || "",
        disasterType: parsed.disasterType || "",
        reversalAxis: parsed.reversalAxis || "",
      };
    }
  } catch { /* ignore */ }
  return null;
}

export function ChatLayout() {
  const { messages, sendMessage, loading, error, lastFailedInput, retryLastMessage, threadId } = useChat();
  const seedSent = useRef(false);
  const [sukuyouCtx, setSukuyouCtx] = useState<SukuyouContext | null>(null);

  // P3+A6: Auto-send SUKUYOU_SEED if present in sessionStorage.
  // A6: 表示用テキストとAPI送信用raw seedを分離。
  // ユーザーバブルには自然文サマリーのみ表示し、APIにはraw seedを送信。
  useEffect(() => {
    if (seedSent.current || !threadId) return;
    try {
      const rawSeed = sessionStorage.getItem("TENMON_SUKUYOU_SEED");
      if (rawSeed) {
        seedSent.current = true;
        const displayText = sessionStorage.getItem("TENMON_SUKUYOU_SEED_DISPLAY") || rawSeed;
        sessionStorage.removeItem("TENMON_SUKUYOU_SEED");
        sessionStorage.removeItem("TENMON_SUKUYOU_SEED_DISPLAY");
        // P4: 深層チャット起動プロンプトも読み取る
        const deepPrompt = sessionStorage.getItem("TENMON_SUKUYOU_DEEP_PROMPT");
        sessionStorage.removeItem("TENMON_SUKUYOU_DEEP_PROMPT");

        // MANUS-UI-04: 文脈情報を読み取り
        const ctxRaw = sessionStorage.getItem("TENMON_SUKUYOU_CONTEXT");
        sessionStorage.removeItem("TENMON_SUKUYOU_CONTEXT");
        if (ctxRaw) {
          try { setSukuyouCtx(JSON.parse(ctxRaw)); } catch { /* ignore */ }
        }
        if (!ctxRaw) {
          // fallback: rawSeedから直接パース
          const ctx = parseSukuyouContext(rawSeed);
          if (ctx) setSukuyouCtx(ctx);
        }

        // Use requestAnimationFrame + setTimeout to ensure React state is settled
        requestAnimationFrame(() => {
          setTimeout(() => {
            // A6: sendMessageに表示用テキストとAPI用ペイロードを分離して渡す
            sendMessage(rawSeed, displayText);
            // P4: seed送信後、応答を待ってから深層プロンプトを自動送信
            if (deepPrompt) {
              setTimeout(() => sendMessage(deepPrompt), 8000);
            }
          }, 500);
        });
      }
    } catch {}
  }, [threadId, sendMessage]);

  // MANUS-UI-04: 既存スレッド復元時 — メッセージから[SUKUYOU_SEED]を検出して文脈を復元
  useEffect(() => {
    if (sukuyouCtx) return; // すでにコンテキストがある場合はスキップ
    if (messages.length === 0) return;
    // 最初のユーザーメッセージ（非表示のraw seed）またはアシスタントの応答から復元を試みる
    for (const msg of messages) {
      if (msg.role === "user" && msg._payload) {
        // _payloadにSUKUYOU_SEEDが含まれている場合
        const ctx = parseSukuyouContext(String(msg._payload));
        if (ctx) { setSukuyouCtx(ctx); return; }
      }
    }
    // フォールバック: 最初のユーザーメッセージの内容を確認
    const firstUser = messages.find(m => m.role === "user");
    if (firstUser?.content?.includes("本命宿は")) {
      // displayTextから宿名を抽出: "...本命宿は翼宿（よくしゅく）、災い分類は過剰責任型、反転軸は..."
      try {
        const shukuMatch = firstUser.content.match(/本命宿は(.+?)(?:（.+?）)?、/);
        const disasterMatch = firstUser.content.match(/災い分類は(.+?)、/);
        const axisMatch = firstUser.content.match(/反転軸は(.+?)(?:です|。|$)/);
        if (shukuMatch) {
          setSukuyouCtx({
            honmeiShuku: shukuMatch[1].replace(/宿$/, "").replace(/（.+?）/, ""),
            disasterType: disasterMatch?.[1] || "",
            reversalAxis: axisMatch?.[1] || "",
          });
        }
      } catch { /* ignore */ }
    }
  }, [messages, sukuyouCtx]);

  const isEmpty = messages.length === 0 && !loading;

  // MANUS-UI-05: 応答状態インジケータのモード判定
  // 宿名チャット時は"deep"、エラー後の再送時は"simple"、それ以外は"normal"
  const typingMode: "normal" | "deep" | "simple" = sukuyouCtx
    ? "deep"
    : error
      ? "simple"
      : "normal";

  return (
    <div
      className="gpt-chat-layout"
      data-chat-layout-bound="1"
      data-thread-id={threadId || ""}
    >
      <SukuyouContextBar context={sukuyouCtx} />
      {isEmpty ? (
        <EmptyState onSuggestion={(text) => sendMessage(text)} />
      ) : (
        <MessageList messages={messages} loading={loading} typingMode={typingMode} />
      )}
      {error && lastFailedInput && !loading && (
        <div className="gpt-chat-error-bar">
          <span className="gpt-chat-error-text">
            通信が不安定な場合は、少し時間をおいてから再度お試しください。
          </span>
          <button
            type="button"
            className="gpt-chat-retry-btn"
            onClick={retryLastMessage}
          >
            もう一度送る
          </button>
        </div>
      )}
      <Composer onSend={sendMessage} loading={loading} />
    </div>
  );
}
