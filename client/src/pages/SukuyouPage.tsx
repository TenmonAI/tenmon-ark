/**
 * ============================================================
 *  SUKUYOU PAGE — 宿曜鑑定結果OS v1
 *  TENMON_ARK_SUKUYOU_RESULT_OS_V1 準拠
 *  ふりがな・IME対応・個別コピー・PDF・シェア・IndexedDB保存
 * ============================================================
 */
import React, { useState, useCallback, useRef, useEffect } from "react";
import { formatShukuLabel, getShukuKana } from "../lib/shukuLabel";
import { saveSukuyouResult, type SukuyouResultRoom } from "../lib/sukuyouStore";

interface GuidanceResult {
  success: boolean;
  honmeiShuku: string;
  disasterType: string;
  reversalAxis: string;
  oracle: { shortOracle: string; longOracle: string; oneActionNow?: string } | string;
  report: {
    chapters: Array<{ number: number; title: string; content: string; source?: string }>;
    fullText: string;
    charCount: number;
  };
  premise: {
    birthDate: string;
    name: string | null;
    confidence: number;
    mode?: string;
  };
  warnings: string[];
  sukuyouSeedV1?: {
    version: string;
    birthDate: string;
    name: string | null;
    honmeiShuku: string;
    disasterType: string;
    reversalAxis: string;
    userConcern: string | null;
    coreQuestion: string;
    deepChatPrompts: string[];
    lifeAlgo: {
      outerPersona: string;
      innerPersona: string;
      motivationRoot: string;
      fearRoot: string;
      repeatingFailurePattern: string;
    };
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  createdAt?: string;
}

interface SukuyouPageProps {
  onBack: () => void;
  onSendToChat?: (displayText: string, rawSeed: string, deepChatPrompt?: string) => void;
}

/* ── 質問チップ定義 ── */
const QUESTION_CHIPS = [
  "この鑑定をやさしく説明して",
  "人間関係をもっと詳しく",
  "仕事への活かし方を知りたい",
  "金運について深掘りしたい",
  "この言霊の意味をやさしく教えて",
  "今すぐの一手だけ教えて",
];

/* ── コピーユーティリティ ── */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch { return false; }
  }
}

/* ── PDF生成（フロントエンドのみ） ── */
async function generatePDF(result: GuidanceResult): Promise<void> {
  // Dynamic import to avoid bundle bloat
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: 595px; padding: 40px;
    background: #fff; color: #1a1a1a;
    font-family: "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
    font-size: 13px; line-height: 1.8;
  `;

  const shukuLabel = formatShukuLabel(result.honmeiShuku);
  const oracleShort = typeof result.oracle === "string" ? result.oracle : result.oracle?.shortOracle || "";
  const oneAction = typeof result.oracle === "string" ? "" : result.oracle?.oneActionNow || "";
  const longOracle = typeof result.oracle === "string" ? "" : result.oracle?.longOracle || "";
  const now = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  let html = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:22px;font-weight:800;color:#8b6914;letter-spacing:0.1em;">天聞アーク</div>
      <div style="font-size:11px;color:#888;margin-top:4px;">宿曜鑑定レポート</div>
      <div style="font-size:10px;color:#aaa;margin-top:2px;">${now}</div>
    </div>
    <div style="text-align:center;margin-bottom:20px;">
      ${result.premise?.name ? `<div style="font-size:14px;margin-bottom:4px;">${result.premise.name} 様</div>` : ""}
      <div style="font-size:11px;color:#666;">生年月日: ${result.premise?.birthDate || ""}</div>
    </div>
    <div style="text-align:center;margin-bottom:24px;padding:16px;border:2px solid #d4af37;border-radius:12px;">
      <div style="font-size:28px;font-weight:800;color:#8b6914;letter-spacing:0.08em;">${shukuLabel}</div>
      <div style="font-size:11px;color:#888;margin-top:4px;">本命宿</div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:20px;">
      <div style="flex:1;padding:12px;border:1px solid #ddd;border-radius:8px;text-align:center;">
        <div style="font-size:10px;color:#888;margin-bottom:4px;">災い分類</div>
        <div style="font-size:13px;font-weight:600;">${result.disasterType}</div>
      </div>
      <div style="flex:1;padding:12px;border:1px solid #ddd;border-radius:8px;text-align:center;">
        <div style="font-size:10px;color:#888;margin-bottom:4px;">反転軸</div>
        <div style="font-size:13px;font-weight:600;">${result.reversalAxis}</div>
      </div>
    </div>
  `;

  if (oracleShort) {
    html += `
      <div style="padding:14px;border-radius:8px;background:#fdf8e8;border:1px solid #e8d48b;margin-bottom:16px;text-align:center;">
        <div style="font-size:10px;color:#8b6914;font-weight:600;margin-bottom:6px;letter-spacing:0.08em;">御神託</div>
        <div style="font-size:13px;line-height:1.8;">${oracleShort}</div>
      </div>
    `;
  }

  if (oneAction) {
    html += `
      <div style="padding:12px;border-radius:8px;border:1px dashed #d4af37;margin-bottom:20px;text-align:center;">
        <div style="font-size:10px;color:#8b6914;font-weight:600;margin-bottom:4px;letter-spacing:0.08em;">今すぐの一手</div>
        <div style="font-size:12px;line-height:1.7;">${oneAction}</div>
      </div>
    `;
  }

  // Chapters
  for (const ch of result.report.chapters) {
    html += `
      <div style="margin-bottom:20px;page-break-inside:avoid;">
        <div style="font-size:14px;font-weight:700;color:#8b6914;margin-bottom:8px;border-bottom:1px solid #e8d48b;padding-bottom:4px;">
          第${ch.number}章　${ch.title}
        </div>
        ${ch.source ? `<div style="font-size:9px;color:#888;margin-bottom:6px;">${ch.source}</div>` : ""}
        <div style="font-size:12px;line-height:1.9;white-space:pre-wrap;">${ch.content}</div>
      </div>
    `;
  }

  // Long oracle
  if (longOracle) {
    html += `
      <div style="margin-top:20px;padding:16px;border-radius:8px;background:#fdf8e8;border:1px solid #e8d48b;">
        <div style="font-size:12px;font-weight:700;color:#8b6914;margin-bottom:8px;">最終御神託</div>
        <div style="font-size:12px;line-height:1.9;white-space:pre-wrap;">${longOracle}</div>
      </div>
    `;
  }

  // Footer
  html += `
    <div style="margin-top:30px;padding-top:12px;border-top:1px solid #ddd;text-align:center;">
      <div style="font-size:10px;color:#888;">天聞アーク ─ 宿曜経 × 天津金木 × 言霊秘書</div>
    </div>
  `;

  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: 595,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const imgW = pdfW;
    const imgH = (canvas.height * pdfW) / canvas.width;

    let yOffset = 0;
    while (yOffset < imgH) {
      if (yOffset > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, -yOffset, imgW, imgH);
      yOffset += pdfH;
    }

    const fileName = result.premise?.name
      ? `宿曜鑑定_${result.premise.name}_${shukuLabel}.pdf`
      : `宿曜鑑定_${shukuLabel}.pdf`;
    pdf.save(fileName);
  } finally {
    document.body.removeChild(container);
  }
}

/* ── シェアカード画像生成 ── */
async function generateShareCard(result: GuidanceResult): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background
  const grad = ctx.createLinearGradient(0, 0, 600, 400);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(1, "#16213e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 400);

  // Gold border
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, 568, 368);

  // Title
  ctx.fillStyle = "#d4af37";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("天聞アーク 宿曜鑑定", 300, 50);

  // Shuku name
  const shukuLabel = formatShukuLabel(result.honmeiShuku);
  ctx.font = "bold 36px sans-serif";
  ctx.fillStyle = "#d4af37";
  ctx.fillText(shukuLabel, 300, 110);

  // Subtitle
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#888";
  ctx.fillText("本命宿", 300, 135);

  // Disaster + Reversal
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#e0e0e0";
  ctx.fillText(`災い分類: ${result.disasterType}`, 300, 180);
  ctx.fillText(`反転軸: ${result.reversalAxis}`, 300, 210);

  // Oracle
  const oracleShort = typeof result.oracle === "string" ? result.oracle : result.oracle?.shortOracle || "";
  if (oracleShort) {
    ctx.fillStyle = "#d4af37";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("御神託", 300, 250);
    ctx.fillStyle = "#e0e0e0";
    ctx.font = "14px sans-serif";
    // Word wrap oracle text
    const words = oracleShort.split("");
    let line = "";
    let y = 275;
    for (const char of words) {
      if ((line + char).length > 30) {
        ctx.fillText(line, 300, y);
        line = char;
        y += 22;
        if (y > 350) break;
      } else {
        line += char;
      }
    }
    if (line && y <= 350) ctx.fillText(line, 300, y);
  }

  // Footer
  ctx.fillStyle = "#666";
  ctx.font = "10px sans-serif";
  ctx.fillText("天聞アーク ─ 宿曜経 × 天津金木 × 言霊秘書", 300, 380);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export function SukuyouPage({ onBack, onSendToChat }: SukuyouPageProps) {
  // Form state
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [name, setName] = useState("");
  const [concern, setConcern] = useState("");

  // Result state
  const [result, setResult] = useState<GuidanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1200);
  };

  // UI state
  const [showDetail, setShowDetail] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [pdfLoading, setPdfLoading] = useState(false);

  // Inline chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false); // IME対応
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const chatThreadId = useRef<string>(`sukuyou-${Date.now()}`);
  const resultRoomId = useRef<string>("");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /* ── auto-resize textarea ── */
  useEffect(() => {
    const el = chatInputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [chatInput]);

  /* ── IndexedDB保存 ── */
  const saveToIDB = useCallback(async (
    data: GuidanceResult,
    chats: ChatMessage[],
    roomId: string,
    threadId: string,
  ) => {
    try {
      const oracleObj = typeof data.oracle === "string"
        ? { shortOracle: data.oracle, longOracle: "", oneActionNow: "" }
        : data.oracle;
      const room: SukuyouResultRoom = {
        id: roomId,
        threadId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: data.premise?.name || undefined,
        birthDate: data.premise?.birthDate || "",
        honmeiShuku: data.honmeiShuku,
        honmeiShukuKana: getShukuKana(data.honmeiShuku),
        disasterType: data.disasterType,
        reversalAxis: data.reversalAxis,
        rawConcern: data.sukuyouSeedV1?.userConcern || undefined,
        shortOracle: oracleObj?.shortOracle || "",
        longOracle: oracleObj?.longOracle || "",
        immediateAction: oracleObj?.oneActionNow || "",
        fullReport: data.report?.fullText || "",
        chapters: data.report?.chapters || [],
        charCount: data.report?.charCount || 0,
        chatHistory: chats.map(c => ({
          ...c,
          createdAt: c.createdAt || new Date().toISOString(),
        })),
        sukuyouSeedV1: data.sukuyouSeedV1 as Record<string, unknown> | undefined,
      };
      await saveSukuyouResult(room);
      // Notify sidebar
      window.dispatchEvent(new CustomEvent("tenmon:sukuyou-updated"));
    } catch { /* ignore save errors */ }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!birthYear || !birthMonth || !birthDay) {
      setError("生年月日を入力してください");
      return;
    }
    const y = parseInt(birthYear);
    const m = parseInt(birthMonth);
    const d = parseInt(birthDay);
    if (isNaN(y) || isNaN(m) || isNaN(d) || y < 1900 || y > 2025 || m < 1 || m > 12 || d < 1 || d > 31) {
      setError("生年月日の値が不正です");
      return;
    }
    const birthDate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    setLoading(true);
    setError(null);
    setResult(null);
    setChatMessages([]);
    setShowDetail(false);
    setExpandedChapters(new Set());
    const tid = `sukuyou-${Date.now()}`;
    chatThreadId.current = tid;
    resultRoomId.current = `sr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const res = await fetch("/api/sukuyou/guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          birthDate,
          name: name.trim() || null,
          currentConcern: concern.trim() || null,
          confidence: 0.85,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);

      // 鑑定完了時にseedをチャットAPIに送信して文脈を確立
      const sv = data.sukuyouSeedV1;
      if (sv) {
        const rawSeed = `[SUKUYOU_SEED] ${JSON.stringify(sv)}`;
        try {
          await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              message: rawSeed,
              sessionId: tid,
              threadId: tid,
            }),
          }).then(r => r.json()).catch(() => {});
        } catch { /* seed送信失敗は無視 */ }
      }

      // IndexedDB自動保存
      await saveToIDB(data, [], resultRoomId.current, tid);
    } catch (err: any) {
      setError(err.message || "鑑定中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [birthYear, birthMonth, birthDay, name, concern, saveToIDB]);

  /* ── 個別コピー ── */
  const handleCopyItem = useCallback(async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    showToast(ok ? "コピーしました" : "コピーに失敗しました");
  }, []);

  const handleSendToChat = useCallback(() => {
    if (!result) return;
    const sv = result.sukuyouSeedV1;
    const rawSeed = sv
      ? `[SUKUYOU_SEED] ${JSON.stringify(sv)}`
      : `[SUKUYOU_SEED] ${result.premise?.birthDate || ""} / ${result.honmeiShuku || ""} / ${result.disasterType || ""}`;
    const shuku = formatShukuLabel(result.honmeiShuku);
    const displayText = `宿曜鑑定の結果を土台に、これから真相解析を深めます。本命宿は${shuku}、災い分類は${result.disasterType || "不明"}、反転軸は${result.reversalAxis || "不明"}です。`;
    const deepPrompt = sv?.deepChatPrompts?.[0] || undefined;
    if (onSendToChat) onSendToChat(displayText, rawSeed, deepPrompt);
  }, [result, onSendToChat]);

  /* ── PDF出力 ── */
  const handlePDF = useCallback(async () => {
    if (!result) return;
    setPdfLoading(true);
    try {
      await generatePDF(result);
      showToast("PDFを生成しました");
    } catch (e: any) {
      showToast("PDF生成に失敗しました");
      console.error("PDF generation error:", e);
    } finally {
      setPdfLoading(false);
    }
  }, [result]);

  /* ── シェア ── */
  const handleShare = useCallback(async () => {
    if (!result) return;
    const shuku = formatShukuLabel(result.honmeiShuku);
    const oracleShort = typeof result.oracle === "string" ? result.oracle : result.oracle?.shortOracle || "";
    const shareText = [
      `天聞アーク 宿曜鑑定`,
      ``,
      `本命宿: ${shuku}`,
      `災い分類: ${result.disasterType}`,
      `反転軸: ${result.reversalAxis}`,
      oracleShort ? `\n御神託: ${oracleShort}` : "",
    ].filter(Boolean).join("\n");

    // Try Web Share API first
    if (navigator.share) {
      try {
        const blob = await generateShareCard(result);
        const files = blob ? [new File([blob], "tenmon-sukuyou.png", { type: "image/png" })] : [];
        await navigator.share({
          title: `宿曜鑑定 - ${shuku}`,
          text: shareText,
          ...(files.length > 0 && navigator.canShare?.({ files }) ? { files } : {}),
        });
        return;
      } catch (e: any) {
        if (e.name === "AbortError") return; // User cancelled
      }
    }

    // Fallback: copy text
    const ok = await copyToClipboard(shareText);
    showToast(ok ? "共有テキストをコピーしました" : "共有に失敗しました");
  }, [result]);

  /* ── シェアカード画像保存 ── */
  const handleSaveShareCard = useCallback(async () => {
    if (!result) return;
    try {
      const blob = await generateShareCard(result);
      if (!blob) { showToast("画像生成に失敗しました"); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tenmon-sukuyou-${formatShukuLabel(result.honmeiShuku)}.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("画像を保存しました");
    } catch {
      showToast("画像保存に失敗しました");
    }
  }, [result]);

  /* ── 鑑定直下チャット送信 ── */
  const sendChatMessage = useCallback(async (text: string) => {
    if (!text.trim() || chatLoading || !result) return;
    const userMsg: ChatMessage = { role: "user", text: text.trim(), createdAt: new Date().toISOString() };
    const newMsgs = [...chatMessages, userMsg];
    setChatMessages(newMsgs);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: text.trim(),
          sessionId: chatThreadId.current,
          threadId: chatThreadId.current,
        }),
      });
      const data = await res.json();
      const assistantMsg: ChatMessage = {
        role: "assistant",
        text: data.response || "応答を取得できませんでした",
        createdAt: new Date().toISOString(),
      };
      const updatedMsgs = [...newMsgs, assistantMsg];
      setChatMessages(updatedMsgs);
      // Update IDB with chat history
      if (resultRoomId.current && result) {
        saveToIDB(result, updatedMsgs, resultRoomId.current, chatThreadId.current);
      }
    } catch {
      const errMsg: ChatMessage = {
        role: "assistant",
        text: "通信エラーが発生しました。もう一度お試しください。",
        createdAt: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, errMsg]);
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, result, chatMessages, saveToIDB]);

  const toggleChapter = (num: number) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num); else next.add(num);
      return next;
    });
  };

  const getOracleShort = () => {
    if (!result?.oracle) return "";
    if (typeof result.oracle === "string") return result.oracle;
    return result.oracle.shortOracle || "";
  };
  const getOneAction = () => {
    if (!result?.oracle || typeof result.oracle === "string") return "";
    return result.oracle.oneActionNow || "";
  };

  /* ═══════════════════════════════════════════
     CSS-in-JS: モバイルファースト設計
     ═══════════════════════════════════════════ */

  const pageStyle: React.CSSProperties = {
    height: "100%",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    color: "var(--text, #e0e0e0)",
    padding: "0 0 env(safe-area-inset-bottom, 0px)",
    background: "var(--bg, #1a1a1a)",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: 680,
    margin: "0 auto",
    padding: "1rem 0.875rem 2rem",
  };

  const headerStyle: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "var(--bg, #1a1a1a)",
    borderBottom: "1px solid rgba(212, 175, 55, 0.15)",
    padding: "0.625rem 0.875rem",
  };

  const cardBase: React.CSSProperties = {
    background: "var(--gpt-hover-bg, rgba(255,255,255,0.04))",
    border: "1px solid rgba(212, 175, 55, 0.18)",
    borderRadius: 14,
    padding: "1.125rem 1rem",
    marginBottom: "0.875rem",
  };

  const gold = "#d4af37";
  const goldStyle: React.CSSProperties = { color: gold };
  const subStyle: React.CSSProperties = { color: "var(--text-sub, #888)" };

  const btnBase: React.CSSProperties = {
    minHeight: 44,
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    transition: "opacity 0.15s, transform 0.1s",
  };

  const chipBase: React.CSSProperties = {
    ...btnBase,
    padding: "10px 16px",
    borderRadius: 22,
    fontSize: 13,
    fontWeight: 500,
    background: "rgba(212, 175, 55, 0.08)",
    border: "1px solid rgba(212, 175, 55, 0.25)",
    color: gold,
  };

  /* ── 小さなコピーボタン ── */
  const CopyBtn = ({ text, label }: { text: string; label?: string }) => (
    <button
      type="button"
      onClick={() => handleCopyItem(text, label || "")}
      title="コピー"
      style={{
        background: "none", border: "none", cursor: "pointer",
        color: "var(--text-sub, #888)", fontSize: 12, padding: "4px 6px",
        borderRadius: 4, transition: "color 0.15s",
        minHeight: 32, minWidth: 32,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </button>
  );

  /* ── 操作ボタン群 ── */
  const ActionBar = () => (
    <div style={{
      display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap",
      justifyContent: "center",
    }}>
      <button type="button" onClick={handlePDF} disabled={pdfLoading}
        style={{
          ...btnBase, minHeight: 40, padding: "8px 16px", fontSize: 12,
          background: "transparent",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          color: gold, opacity: pdfLoading ? 0.5 : 1,
        }}>
        {pdfLoading ? "PDF生成中…" : "PDFで保存"}
      </button>
      <button type="button" onClick={handleShare}
        style={{
          ...btnBase, minHeight: 40, padding: "8px 16px", fontSize: 12,
          background: "transparent",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          color: gold,
        }}>
        シェア
      </button>
      <button type="button" onClick={handleSaveShareCard}
        style={{
          ...btnBase, minHeight: 40, padding: "8px 16px", fontSize: 12,
          background: "transparent",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          color: gold,
        }}>
        画像保存
      </button>
      {onSendToChat && (
        <button type="button" onClick={handleSendToChat}
          style={{
            ...btnBase, minHeight: 40, padding: "8px 16px", fontSize: 12,
            background: "transparent",
            border: "1px solid rgba(212, 175, 55, 0.25)",
            color: gold,
          }}>
          チャットへ送る
        </button>
      )}
    </div>
  );

  return (
    <div className="sukuyou-page" style={pageStyle}>
      {/* ═══ トースト ═══ */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, padding: "10px 24px", borderRadius: 10,
          background: "rgba(30, 30, 30, 0.95)",
          border: "1px solid rgba(212, 175, 55, 0.3)",
          color: "#e0e0e0", fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          animation: "fadeIn 0.2s ease",
        }}>
          {toast}
        </div>
      )}

      {/* ═══ ヘッダー ═══ */}
      <div style={headerStyle}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button" onClick={onBack}
            style={{
              ...btnBase, background: "none", color: gold, fontSize: 15,
              padding: "8px 4px", minWidth: 44, minHeight: 44,
            }}
          >
            ← 戻る
          </button>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, ...goldStyle, margin: 0 }}>宿曜鑑定</h1>
            <p style={{ fontSize: 10, ...subStyle, margin: 0, letterSpacing: "0.02em" }}>
              天聞アーク御神託パイプライン
            </p>
          </div>
        </div>
      </div>

      <div style={containerStyle}>
        {/* ═══ 入力フォーム ═══ */}
        <div style={cardBase}>
          <h2 style={{ fontSize: 14, fontWeight: 600, ...goldStyle, marginBottom: 14 }}>基本情報</h2>

          {/* 生年月日 */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, ...subStyle, display: "block", marginBottom: 6 }}>生年月日</label>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <input
                type="number" inputMode="numeric" placeholder="1990" value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                min={1900} max={2025}
                style={{
                  width: 76, padding: "10px 10px", borderRadius: 8,
                  background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                  border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                  color: "var(--text)", fontSize: 15, minHeight: 44, boxSizing: "border-box",
                }}
              />
              <span style={subStyle}>年</span>
              <input
                type="number" inputMode="numeric" placeholder="1" value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                min={1} max={12}
                style={{
                  width: 54, padding: "10px 10px", borderRadius: 8,
                  background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                  border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                  color: "var(--text)", fontSize: 15, minHeight: 44, boxSizing: "border-box",
                }}
              />
              <span style={subStyle}>月</span>
              <input
                type="number" inputMode="numeric" placeholder="1" value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                min={1} max={31}
                style={{
                  width: 54, padding: "10px 10px", borderRadius: 8,
                  background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                  border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                  color: "var(--text)", fontSize: 15, minHeight: 44, boxSizing: "border-box",
                }}
              />
              <span style={subStyle}>日</span>
            </div>
          </div>

          {/* 名前 */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, ...subStyle, display: "block", marginBottom: 6 }}>名前（任意）</label>
            <input
              type="text" placeholder="お名前" value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                color: "var(--text)", fontSize: 14, minHeight: 44, boxSizing: "border-box",
              }}
            />
          </div>

          {/* 悩み */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, ...subStyle, display: "block", marginBottom: 6 }}>
              現在の悩み・相談内容（任意）
            </label>
            <textarea
              placeholder="最近、仕事の方向性に迷いがあります…"
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              rows={3}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                color: "var(--text)", fontSize: 14, resize: "vertical",
                boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6,
              }}
            />
          </div>

          {/* 鑑定ボタン */}
          <button
            type="button" onClick={handleSubmit} disabled={loading}
            style={{
              ...btnBase, width: "100%", padding: "14px 0",
              background: loading ? "#7a6a20" : gold,
              color: "#1a1a1a", fontSize: 15,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "鑑定中…" : "鑑定する"}
          </button>

          {error && (
            <div style={{
              marginTop: 12, padding: "12px 14px", borderRadius: 10,
              background: "rgba(220, 38, 38, 0.08)",
              border: "1px solid rgba(220, 38, 38, 0.25)",
              color: "#f87171", fontSize: 13, lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════
            鑑定結果 — 結果OS v1
           ═══════════════════════════════════════════════════════ */}
        {result && (
          <div>
            {/* ── 第一層: 要約カード ── */}
            <div style={{
              ...cardBase,
              border: "1px solid rgba(212, 175, 55, 0.35)",
              background: "linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.015) 100%)",
              padding: "1.25rem 1rem",
            }}>
              <h2 style={{
                fontSize: 15, fontWeight: 700, ...goldStyle,
                marginBottom: 16, textAlign: "center", letterSpacing: "0.05em",
              }}>
                鑑定結果
              </h2>

              {/* 本命宿（ふりがな付き） */}
              <div style={{ textAlign: "center", marginBottom: 18, position: "relative" }}>
                <div style={{ position: "absolute", top: 0, right: 0 }}>
                  <CopyBtn text={formatShukuLabel(result.honmeiShuku)} label="本命宿" />
                </div>
                <div style={{
                  fontSize: 32, fontWeight: 800, ...goldStyle,
                  letterSpacing: "0.08em",
                }}>
                  {formatShukuLabel(result.honmeiShuku)}
                </div>
                <div style={{ fontSize: 11, ...subStyle, marginTop: 4 }}>本命宿</div>
              </div>

              {/* 災い分類 + 反転軸: 2カラム */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16,
              }}>
                <div style={{
                  padding: "12px", borderRadius: 10,
                  background: "rgba(212, 175, 55, 0.05)",
                  border: "1px solid rgba(212, 175, 55, 0.12)",
                  textAlign: "center", position: "relative",
                }}>
                  <div style={{ position: "absolute", top: 4, right: 4 }}>
                    <CopyBtn text={result.disasterType} label="災い分類" />
                  </div>
                  <div style={{ fontSize: 10, ...subStyle, marginBottom: 5, letterSpacing: "0.03em" }}>災い分類</div>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{result.disasterType}</div>
                </div>
                <div style={{
                  padding: "12px", borderRadius: 10,
                  background: "rgba(212, 175, 55, 0.05)",
                  border: "1px solid rgba(212, 175, 55, 0.12)",
                  textAlign: "center", position: "relative",
                }}>
                  <div style={{ position: "absolute", top: 4, right: 4 }}>
                    <CopyBtn text={result.reversalAxis} label="反転軸" />
                  </div>
                  <div style={{ fontSize: 10, ...subStyle, marginBottom: 5, letterSpacing: "0.03em" }}>反転軸</div>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{result.reversalAxis}</div>
                </div>
              </div>

              {/* 御神託 */}
              {getOracleShort() && (
                <div style={{
                  padding: "14px 16px", borderRadius: 12,
                  background: "rgba(212, 175, 55, 0.07)",
                  border: "1px solid rgba(212, 175, 55, 0.18)",
                  marginBottom: 14, textAlign: "center", position: "relative",
                }}>
                  <div style={{ position: "absolute", top: 8, right: 8 }}>
                    <CopyBtn text={getOracleShort()} label="御神託" />
                  </div>
                  <div style={{
                    fontSize: 10, ...goldStyle, fontWeight: 600,
                    marginBottom: 8, letterSpacing: "0.08em",
                  }}>
                    御神託
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.8 }}>{getOracleShort()}</div>
                </div>
              )}

              {/* 今すぐの一手 */}
              {getOneAction() && (
                <div style={{
                  padding: "12px 16px", borderRadius: 12,
                  background: "rgba(212, 175, 55, 0.03)",
                  border: "1px dashed rgba(212, 175, 55, 0.22)",
                  textAlign: "center", position: "relative",
                }}>
                  <div style={{ position: "absolute", top: 8, right: 8 }}>
                    <CopyBtn text={getOneAction()} label="今すぐの一手" />
                  </div>
                  <div style={{
                    fontSize: 10, ...goldStyle, fontWeight: 600,
                    marginBottom: 6, letterSpacing: "0.08em",
                  }}>
                    今すぐの一手
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.7 }}>{getOneAction()}</div>
                </div>
              )}

              {/* 操作ボタン群 */}
              <ActionBar />
            </div>

            {/* ═══ 鑑定直下チャット ═══ */}
            <div style={{
              ...cardBase,
              border: "1px solid rgba(212, 175, 55, 0.3)",
              padding: "1.125rem 1rem",
            }}>
              <h3 style={{
                fontSize: 14, fontWeight: 600, ...goldStyle,
                marginBottom: 4,
              }}>
                この鑑定について続けて聞く
              </h3>
              <p style={{ fontSize: 11, ...subStyle, marginBottom: 14, lineHeight: 1.5 }}>
                鑑定結果を踏まえて、気になることを自由に質問できます
              </p>

              {/* 質問チップ: 会話開始前のみ表示 */}
              {chatMessages.length === 0 && (
                <div style={{
                  display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16,
                }}>
                  {QUESTION_CHIPS.map((chip) => (
                    <button
                      key={chip} type="button"
                      onClick={() => sendChatMessage(chip)}
                      disabled={chatLoading}
                      style={{
                        ...chipBase,
                        opacity: chatLoading ? 0.5 : 1,
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* チャット履歴 */}
              {chatMessages.length > 0 && (
                <div style={{
                  maxHeight: 420, overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                  marginBottom: 12, padding: "4px 0",
                }}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{
                      display: "flex",
                      justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                      marginBottom: 10,
                    }}>
                      <div style={{
                        maxWidth: "88%",
                        padding: "11px 15px",
                        borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        fontSize: 13.5, lineHeight: 1.75, whiteSpace: "pre-wrap",
                        background: msg.role === "user"
                          ? "rgba(212, 175, 55, 0.12)"
                          : "var(--gpt-hover-bg, rgba(255,255,255,0.05))",
                        border: msg.role === "user"
                          ? "1px solid rgba(212, 175, 55, 0.25)"
                          : "1px solid var(--gpt-border, rgba(255,255,255,0.08))",
                        position: "relative",
                      }}>
                        {msg.text}
                        {msg.role === "assistant" && (
                          <span style={{ position: "absolute", top: 4, right: 4 }}>
                            <CopyBtn text={msg.text} label="応答" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
                      <div style={{
                        padding: "11px 15px", borderRadius: "14px 14px 14px 4px",
                        fontSize: 13.5,
                        background: "var(--gpt-hover-bg, rgba(255,255,255,0.05))",
                        border: "1px solid var(--gpt-border, rgba(255,255,255,0.08))",
                        ...subStyle,
                      }}>
                        <span className="thinking-dots">考え中</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* チャット入力欄: IME対応 textarea + 送信ボタン */}
              <div style={{
                display: "flex", gap: 8, alignItems: "flex-end",
              }}>
                <textarea
                  ref={chatInputRef}
                  placeholder="自由に質問する…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
                      e.preventDefault();
                      sendChatMessage(chatInput);
                    }
                  }}
                  disabled={chatLoading}
                  rows={1}
                  style={{
                    flex: 1, padding: "11px 14px", borderRadius: 10,
                    background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                    border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                    color: "var(--text)", fontSize: 14, boxSizing: "border-box",
                    fontFamily: "inherit", lineHeight: 1.5,
                    resize: "none", overflow: "hidden",
                    minHeight: 44, maxHeight: 120,
                  }}
                />
                <button
                  type="button"
                  onClick={() => sendChatMessage(chatInput)}
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    ...btnBase,
                    padding: "0 18px",
                    minHeight: 44,
                    background: chatInput.trim() ? gold : "rgba(212, 175, 55, 0.25)",
                    color: "#1a1a1a",
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  送信
                </button>
              </div>
            </div>

            {/* ═══ 詳細レポート（折りたたみ） ═══ */}
            <div style={cardBase}>
              <button
                type="button"
                onClick={() => setShowDetail(!showDetail)}
                style={{
                  ...btnBase,
                  width: "100%",
                  padding: "12px 0",
                  background: "transparent",
                  color: gold,
                  fontSize: 14,
                  display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
                  border: "none",
                }}
              >
                {showDetail ? "詳細レポートを閉じる ▲" : "詳細レポートを読む ▼"}
              </button>

              {showDetail && (
                <div style={{ marginTop: 14 }}>
                  {/* 全文コピー */}
                  <div style={{
                    display: "flex", gap: 8, marginBottom: 14,
                    justifyContent: "flex-end", flexWrap: "wrap",
                  }}>
                    <button
                      type="button"
                      onClick={() => handleCopyItem(result.report.fullText, "レポート全文")}
                      style={{
                        ...btnBase, minHeight: 36,
                        padding: "8px 14px", fontSize: 12,
                        background: "transparent",
                        border: "1px solid rgba(212, 175, 55, 0.25)",
                        color: gold,
                      }}
                    >
                      レポート全文をコピー
                    </button>
                  </div>

                  {/* 章別アコーディオン */}
                  {result.report.chapters.map((ch) => (
                    <div key={ch.number} style={{
                      borderBottom: "1px solid var(--gpt-border, rgba(255,255,255,0.06))",
                      marginBottom: 4,
                    }}>
                      <button
                        type="button"
                        onClick={() => toggleChapter(ch.number)}
                        style={{
                          ...btnBase,
                          width: "100%",
                          padding: "12px 4px",
                          background: "transparent",
                          color: "var(--text)",
                          fontSize: 13,
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          textAlign: "left",
                          border: "none",
                        }}
                      >
                        <span>
                          <span style={goldStyle}>第{ch.number}章</span>
                          <span style={{ marginLeft: 8 }}>{ch.title}</span>
                        </span>
                        <span style={{ ...subStyle, fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                          {expandedChapters.has(ch.number) ? "▲" : "▼"}
                        </span>
                      </button>
                      {expandedChapters.has(ch.number) && (
                        <div style={{
                          padding: "0 4px 14px",
                          fontSize: 13.5, lineHeight: 1.8,
                        }}>
                          {ch.source && (
                            <span style={{
                              fontSize: 10, padding: "2px 8px", borderRadius: 4,
                              background: "rgba(212, 175, 55, 0.1)",
                              border: "1px solid rgba(212, 175, 55, 0.2)",
                              ...goldStyle, display: "inline-block", marginBottom: 10,
                            }}>
                              {ch.source}
                            </span>
                          )}
                          <div style={{ whiteSpace: "pre-wrap" }}>{ch.content}</div>
                          {/* 章末ボタン群 */}
                          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => {
                                sendChatMessage(`第${ch.number}章「${ch.title}」について詳しく教えてください`);
                                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
                              }}
                              disabled={chatLoading}
                              style={{
                                ...chipBase, fontSize: 12,
                                opacity: chatLoading ? 0.5 : 1,
                              }}
                            >
                              この章について聞く
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyItem(ch.content, `第${ch.number}章`)}
                              style={{
                                ...chipBase, fontSize: 12,
                                background: "transparent",
                              }}
                            >
                              この章をコピー
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 文字数 */}
                  <div style={{ fontSize: 10, ...subStyle, textAlign: "right", marginTop: 8 }}>
                    {result.report.charCount.toLocaleString()} 文字
                  </div>
                </div>
              )}
            </div>

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div style={{ fontSize: 11, ...subStyle, padding: "0 4px" }}>
                {result.warnings.map((w, i) => (
                  <p key={i} style={{ margin: "3px 0", lineHeight: 1.5 }}>{w}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
