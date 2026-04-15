/**
 * ============================================================
 *  SUKUYOU PAGE — 宿曜鑑定結果OS v1.1
 *  TENMON_ARK_SUKUYOU_RESULT_OS_V1 + FINAL_ADJUSTMENT_V4 準拠
 *  ライトテーマ対応・名前案内・ふりがな・断定回避・第5/6章特別表示
 * ============================================================
 */
import React, { useState, useCallback, useRef, useEffect } from "react";
import { formatShukuLabel, getShukuKana } from "../lib/shukuLabel";
import { saveSukuyouResult, getSukuyouResult, type SukuyouResultRoom } from "../lib/sukuyouStore";
import { queueSyncChange, syncPush } from "../lib/crossDeviceSync";

interface GuidanceResult {
  success: boolean;
  honmeiShuku: string;
  shukuSanskrit?: string | null;
  shukuReading?: string | null;
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
  kotodamaSummary?: {
    guidingAxis: string | null;
    soulDirection: string | null;
    guidingMessage: string | null;
    deficientTones: string[];
    supportiveTones: string[];
    nameAnalysis: {
      soulVibration: string | null;
      fireWaterBalance: { fire: number; water: number } | null;
    } | null;
  } | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  createdAt?: string;
  isError?: boolean;
}

interface SukuyouPageProps {
  onBack: () => void;
  onSendToChat?: (displayText: string, rawSeed: string, deepChatPrompt?: string) => void;
  restoreRoomId?: string;
  onNewDiagnosis?: () => void;
}

/* ── 質問チップ定義 ── */
const QUESTION_CHIPS = [
  "この鑑定をやさしく教えてほしい",
  "人との関わりについて聞きたい",
  "仕事にどう活かせるか知りたい",
  "お金のことをもう少し詳しく",
  "御神託の意味をやさしく教えて",
  "今すぐできることをひとつ教えて",
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
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const container = document.createElement("div");
  container.style.cssText = "width:595px;padding:40px;font-family:sans-serif;color:#1a1a1a;background:#fff;position:absolute;left:-9999px;top:0;";

  const shukuLabel = formatShukuLabel(result.honmeiShuku);
  const oracleShort = typeof result.oracle === "string" ? result.oracle : result.oracle?.shortOracle || "";
  const longOracle = typeof result.oracle === "string" ? "" : result.oracle?.longOracle || "";
  const oneAction = typeof result.oracle === "string" ? "" : result.oracle?.oneActionNow || "";

  let html = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:10px;color:#888;letter-spacing:0.1em;margin-bottom:4px;">天聞アーク 宿曜鑑定</div>
      <div style="font-size:28px;font-weight:800;color:#8b6914;letter-spacing:0.05em;">${shukuLabel}</div>
      <div style="font-size:10px;color:#888;margin-top:4px;">本命宿</div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:20px;">
      <div style="flex:1;padding:12px;border-radius:8px;background:#f9f6ef;border:1px solid #e8d48b;text-align:center;">
        <div style="font-size:10px;color:#888;margin-bottom:4px;">災い分類</div>
        <div style="font-size:13px;font-weight:600;">${result.disasterType}</div>
      </div>
      <div style="flex:1;padding:12px;border-radius:8px;background:#f9f6ef;border:1px solid #e8d48b;text-align:center;">
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
      <div style="padding:12px;border-radius:8px;border:1px dashed #c9a14a;margin-bottom:20px;text-align:center;">
        <div style="font-size:10px;color:#8b6914;font-weight:600;margin-bottom:4px;letter-spacing:0.08em;">今すぐの一手</div>
        <div style="font-size:12px;line-height:1.7;">${oneAction}</div>
      </div>
    `;
  }

  for (const ch of result.report.chapters) {
    const isNameChapter = ch.number >= 5;
    html += `
      <div style="margin-bottom:20px;page-break-inside:avoid;">
        <div style="font-size:14px;font-weight:700;color:#8b6914;margin-bottom:8px;border-bottom:1px solid #e8d48b;padding-bottom:4px;">
          第${ch.number}章　${ch.title}${isNameChapter ? ' <span style="font-size:10px;color:#2f6f5e;font-weight:500;">名前解読</span>' : ''}
        </div>
        ${ch.source ? `<div style="font-size:9px;color:#888;margin-bottom:6px;">${ch.source}</div>` : ""}
        <div style="font-size:12px;line-height:1.9;white-space:pre-wrap;">${ch.content}</div>
      </div>
    `;
  }

  if (longOracle) {
    html += `
      <div style="margin-top:20px;padding:16px;border-radius:8px;background:#fdf8e8;border:1px solid #e8d48b;">
        <div style="font-size:12px;font-weight:700;color:#8b6914;margin-bottom:8px;">最終御神託</div>
        <div style="font-size:12px;line-height:1.9;white-space:pre-wrap;">${longOracle}</div>
      </div>
    `;
  }

  html += `
    <div style="margin-top:30px;padding-top:12px;border-top:1px solid #ddd;text-align:center;">
      <div style="font-size:10px;color:#888;">天聞アーク ─ 宿曜経 × 天津金木 × 言霊秘書</div>
    </div>
  `;

  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2, useCORS: true, logging: false, windowWidth: 595,
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

  // Background — ライトテーマ
  const grad = ctx.createLinearGradient(0, 0, 600, 400);
  grad.addColorStop(0, "#fafaf7");
  grad.addColorStop(1, "#f5f0e6");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 400);

  // Gold border
  ctx.strokeStyle = "#c9a14a";
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, 568, 368);

  // Title
  ctx.fillStyle = "#c9a14a";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("天聞アーク 宿曜鑑定", 300, 50);

  // Shuku name
  const shukuLabel = formatShukuLabel(result.honmeiShuku);
  ctx.font = "bold 36px sans-serif";
  ctx.fillStyle = "#8b6914";
  ctx.fillText(shukuLabel, 300, 110);

  // Subtitle
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#888";
  ctx.fillText("本命宿", 300, 135);

  // Disaster + Reversal
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#111827";
  ctx.fillText(`災い分類: ${result.disasterType}`, 300, 180);
  ctx.fillText(`反転軸: ${result.reversalAxis}`, 300, 210);

  // Oracle
  const oracleShort = typeof result.oracle === "string" ? result.oracle : result.oracle?.shortOracle || "";
  if (oracleShort) {
    ctx.fillStyle = "#c9a14a";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("御神託", 300, 250);
    ctx.fillStyle = "#111827";
    ctx.font = "14px sans-serif";
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
  ctx.fillStyle = "#888";
  ctx.font = "10px sans-serif";
  ctx.fillText("天聞アーク ─ 宿曜経 × 天津金木 × 言霊秘書", 300, 380);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export function SukuyouPage({ onBack, onSendToChat, restoreRoomId, onNewDiagnosis }: SukuyouPageProps) {
  // Form state
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [name, setName] = useState("");
  const [furigana, setFurigana] = useState("");
  const [concern, setConcern] = useState("");

  // Result state
  const [result, setResult] = useState<GuidanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRestoredRoom, setIsRestoredRoom] = useState(false);

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
  const [chatError, setChatError] = useState(false);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const chatThreadId = useRef<string>(`sukuyou-${Date.now()}`);
  const resultRoomId = useRef<string>("");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ローディング文言ローテーション
  useEffect(() => {
    if (!chatLoading) { setLoadingPhase(0); return; }
    const timer = setInterval(() => {
      setLoadingPhase(p => (p + 1) % 3);
    }, 2800);
    return () => clearInterval(timer);
  }, [chatLoading]);

  useEffect(() => {
    const el = chatInputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [chatInput]);

  /* ── 保存済み鑑定ルーム復元 ── */
  useEffect(() => {
    if (!restoreRoomId) return;
    let cancelled = false;
    (async () => {
      try {
        const room = await getSukuyouResult(restoreRoomId);
        if (!room || cancelled) return;
        const restored: GuidanceResult = {
          success: true,
          honmeiShuku: room.honmeiShuku,
          disasterType: room.disasterType,
          reversalAxis: room.reversalAxis,
          oracle: {
            shortOracle: room.shortOracle || "",
            longOracle: room.longOracle || "",
            oneActionNow: room.immediateAction || "",
          },
          report: {
            chapters: room.chapters || [],
            fullText: room.fullReport || "",
            charCount: room.charCount || 0,
          },
          premise: {
            birthDate: room.birthDate || "",
            name: room.name || null,
            confidence: 0.85,
          },
          warnings: [],
          sukuyouSeedV1: room.sukuyouSeedV1 as GuidanceResult["sukuyouSeedV1"],
        };
        setResult(restored);
        setIsRestoredRoom(true);
        resultRoomId.current = room.id;
        chatThreadId.current = room.threadId;
        if (room.chatHistory && room.chatHistory.length > 0) {
          setChatMessages(room.chatHistory.map(c => ({
            role: c.role, text: c.text, createdAt: c.createdAt,
          })));
        }
        if (room.birthDate) {
          const parts = room.birthDate.split("-");
          if (parts.length === 3) {
            setBirthYear(parts[0]);
            setBirthMonth(String(parseInt(parts[1])));
            setBirthDay(String(parseInt(parts[2])));
          }
        }
        if (room.name) setName(room.name);
        if (room.rawConcern) setConcern(room.rawConcern);
        if (room.sukuyouSeedV1) {
          const rawSeed = `[SUKUYOU_SEED] ${JSON.stringify(room.sukuyouSeedV1)}`;
          try {
            await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ message: rawSeed, sessionId: room.threadId, threadId: room.threadId }),
            }).then(r => r.json()).catch(() => {});
          } catch { /* seed再送信失敗は無視 */ }
        }
      } catch (e) {
        console.error("Room restore failed:", e);
        setError("鑑定結果の復元に失敗しました");
      }
    })();
    return () => { cancelled = true; };
  }, [restoreRoomId]);

  /* ── IndexedDB保存 ── */
  const saveToIDB = useCallback(async (
    data: GuidanceResult, chats: ChatMessage[], roomId: string, threadId: string,
  ) => {
    try {
      const oracleObj = typeof data.oracle === "string"
        ? { shortOracle: data.oracle, longOracle: "", oneActionNow: "" }
        : data.oracle;
      const room: SukuyouResultRoom = {
        id: roomId, threadId,
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
        chatHistory: chats.map(c => ({ ...c, createdAt: c.createdAt || new Date().toISOString() })),
        sukuyouSeedV1: data.sukuyouSeedV1 as Record<string, unknown> | undefined,
      };
      await saveSukuyouResult(room);
      // SYNC_PHASE_A_FRONTEND_CONNECT_V1 FIX-3: 宿曜鑑定完了時にsync登録
      queueSyncChange({
        kind: "sukuyou_room_upsert",
        payload: {
          roomId: room.id,
          threadId: room.threadId ?? null,
          birthDate: room.birthDate || null,
          honmeiShuku: room.honmeiShuku || null,
          disasterType: room.disasterType || null,
          reversalAxis: room.reversalAxis || null,
          shortOracle: room.shortOracle || null,
          updatedAt: new Date().toISOString(),
          version: 1,
        },
      });
      syncPush().catch(() => {});
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
          furigana: furigana.trim() || null,
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

      const sv = data.sukuyouSeedV1;
      if (sv) {
        const rawSeed = `[SUKUYOU_SEED] ${JSON.stringify(sv)}`;
        try {
          await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ message: rawSeed, sessionId: tid, threadId: tid }),
          }).then(r => r.json()).catch(() => {});
        } catch { /* seed送信失敗は無視 */ }
      }
      await saveToIDB(data, [], resultRoomId.current, tid);
    } catch (err: any) {
      setError(err.message || "鑑定中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [birthYear, birthMonth, birthDay, name, furigana, concern, saveToIDB]);

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
        if (e.name === "AbortError") return;
      }
    }
    const ok = await copyToClipboard(shareText);
    showToast(ok ? "共有テキストをコピーしました" : "共有に失敗しました");
  }, [result]);

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

  const sendChatMessage = useCallback(async (text: string) => {
    if (!text.trim() || chatLoading || !result) return;
    setChatError(false);
    setLastFailedText(null);
    const userMsg: ChatMessage = { role: "user", text: text.trim(), createdAt: new Date().toISOString() };
    const newMsgs = [...chatMessages, userMsg];
    setChatMessages(newMsgs);
    setChatInput("");
    setChatLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text.trim(), sessionId: chatThreadId.current, threadId: chatThreadId.current }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const assistantMsg: ChatMessage = {
        role: "assistant",
        text: data.response || "応答を取得できませんでした",
        createdAt: new Date().toISOString(),
      };
      const updatedMsgs = [...newMsgs, assistantMsg];
      setChatMessages(updatedMsgs);
      setChatError(false);
      if (resultRoomId.current && result) {
        saveToIDB(result, updatedMsgs, resultRoomId.current, chatThreadId.current);
      }
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      const errText = isTimeout
        ? "応答に時間がかかっています。通信環境を確認のうえ、再度お試しください。"
        : "うまくつながりませんでした。少し時間をおいて、もう一度お試しください。";
      const errMsg: ChatMessage = {
        role: "assistant",
        text: errText,
        createdAt: new Date().toISOString(),
        isError: true,
      };
      setChatMessages(prev => [...prev, errMsg]);
      setChatError(true);
      setLastFailedText(text.trim());
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
     CSS-in-JS: ライトテーマ対応
     ═══════════════════════════════════════════ */

  const arkGold = "var(--ark-gold, #c9a14a)";
  const arkGreen = "var(--ark-green, #2f6f5e)";
  const textPrimary = "var(--text, #111827)";
  const textMuted = "var(--muted, rgba(17,24,39,0.65))";
  const bgPage = "var(--bg, #fafaf7)";
  const bgInput = "var(--input-bg, #ffffff)";
  const borderLight = "var(--border, rgba(0,0,0,0.08))";
  const borderInput = "var(--input-border, rgba(0,0,0,0.12))";

  const pageStyle: React.CSSProperties = {
    height: "100%",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    color: textPrimary,
    padding: "0 0 env(safe-area-inset-bottom, 0px)",
    background: bgPage,
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
    background: bgPage,
    borderBottom: `1px solid ${borderLight}`,
    padding: "0.625rem 0.875rem",
  };

  const cardBase: React.CSSProperties = {
    background: "var(--sidebar-bg, #f7f7f8)",
    border: `1px solid ${borderLight}`,
    borderRadius: 14,
    padding: "1.125rem 1rem",
    marginBottom: "0.875rem",
  };

  const goldStyle: React.CSSProperties = { color: arkGold };
  const greenStyle: React.CSSProperties = { color: arkGreen };
  const subStyle: React.CSSProperties = { color: textMuted, fontSize: 12 };

  const inputStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 8,
    background: bgInput,
    border: `1px solid ${borderInput}`,
    color: textPrimary,
    fontSize: 15,
    minHeight: 44,
    boxSizing: "border-box" as const,
  };

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
    background: "rgba(201, 161, 74, 0.08)",
    border: "1px solid rgba(201, 161, 74, 0.25)",
    color: arkGold,
  };

  const outlineBtn: React.CSSProperties = {
    ...btnBase,
    minHeight: 40,
    padding: "8px 16px",
    fontSize: 12,
    background: "transparent",
    border: `1px solid rgba(201, 161, 74, 0.25)`,
    color: arkGold,
  };

  /* ── 小さなコピーボタン ── */
  const CopyBtn = ({ text, label }: { text: string; label?: string }) => (
    <button
      type="button"
      onClick={() => handleCopyItem(text, label || "")}
      title="コピー"
      style={{
        background: "none", border: "none", cursor: "pointer",
        color: textMuted, fontSize: 12, padding: "4px 6px",
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
    <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
      <button type="button" onClick={handlePDF} disabled={pdfLoading}
        style={{ ...outlineBtn, opacity: pdfLoading ? 0.5 : 1 }}>
        {pdfLoading ? "PDF生成中…" : "PDFで保存"}
      </button>
      <button type="button" onClick={handleShare} style={outlineBtn}>シェア</button>
      <button type="button" onClick={handleSaveShareCard} style={outlineBtn}>画像保存</button>
      {onSendToChat && (
        <button type="button" onClick={handleSendToChat} style={outlineBtn}>チャットへ送る</button>
      )}
    </div>
  );

  /* ── 第5/6章の特別バッジ ── */
  const NameChapterBadge = () => (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, fontWeight: 500, color: arkGreen,
      background: "rgba(47, 111, 94, 0.08)",
      border: "1px solid rgba(47, 111, 94, 0.2)",
      borderRadius: 4, padding: "2px 8px", marginLeft: 8,
    }}>
      名前解読
    </span>
  );

  /* ── confidence表示（断定回避） ── */
  const ConfidenceHint = ({ confidence }: { confidence: number }) => {
    const pct = Math.round(confidence * 100);
    const label = pct >= 80 ? "高い整合性" : pct >= 60 ? "一定の整合性" : "参考程度";
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        fontSize: 11, color: textMuted, marginTop: 8,
      }}>
        <span>{label}</span>
        <div style={{
          flex: 1, maxWidth: 80, height: 4, borderRadius: 2,
          background: "rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}>
          <div style={{
            width: `${pct}%`, height: "100%", borderRadius: 2,
            background: pct >= 80 ? arkGreen : pct >= 60 ? arkGold : textMuted,
          }} />
        </div>
        <span style={{ fontSize: 10 }}>{pct}%</span>
      </div>
    );
  };

  return (
    <div className="sukuyou-page" style={pageStyle}>
      {/* ═══ トースト ═══ */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, padding: "10px 24px", borderRadius: 10,
          background: "rgba(255, 255, 255, 0.97)",
          border: `1px solid ${borderLight}`,
          color: textPrimary, fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
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
              ...btnBase, background: "none", color: arkGold, fontSize: 15,
              padding: "8px 4px", minWidth: 44, minHeight: 44,
            }}
          >
            ← 戻る
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 17, fontWeight: 700, ...goldStyle, margin: 0 }}>宿曜鑑定</h1>
            <p style={{ fontSize: 10, ...subStyle, margin: 0, letterSpacing: "0.02em" }}>
              あなたの宿曜を読み解きます
            </p>
          </div>
          {/* 結果表示中 or 復元中: 新規鑑定CTA */}
          {(result || isRestoredRoom) && onNewDiagnosis && (
            <button
              type="button"
              onClick={onNewDiagnosis}
              style={{
                ...btnBase,
                background: "rgba(201, 161, 74, 0.08)",
                border: `1px solid rgba(201, 161, 74, 0.25)`,
                color: arkGold,
                fontSize: 12,
                fontWeight: 600,
                padding: "7px 14px",
                borderRadius: 8,
                whiteSpace: "nowrap",
              }}
            >
              + 新しい鑑定
            </button>
          )}
        </div>
      </div>

      <div style={containerStyle}>
        {/* ═══ 入力フォーム ═══ */}
        <div style={cardBase}>
          <h2 style={{ fontSize: 14, fontWeight: 600, ...goldStyle, marginBottom: 14 }}>基本情報</h2>

          {/* 生年月日 */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ ...subStyle, display: "block", marginBottom: 6 }}>
              生年月日
              <span style={{
                fontSize: 10, color: arkGreen, fontWeight: 500,
                marginLeft: 6, letterSpacing: "0.02em",
              }}>
                鑑定に必要です
              </span>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <input
                type="number" inputMode="numeric" placeholder="1990" value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                min={1900} max={2026}
                style={{ ...inputStyle, width: 76 }}
              />
              <span style={subStyle}>年</span>
              <input
                type="number" inputMode="numeric" placeholder="1" value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                min={1} max={12}
                style={{ ...inputStyle, width: 54 }}
              />
              <span style={subStyle}>月</span>
              <input
                type="number" inputMode="numeric" placeholder="1" value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                min={1} max={31}
                style={{ ...inputStyle, width: 54 }}
              />
              <span style={subStyle}>日</span>
            </div>
          </div>

          {/* 名前 */}
          <div style={{ marginBottom: 6 }}>
            <label style={{ ...subStyle, display: "block", marginBottom: 6 }}>
              名前
              <span style={{ fontSize: 10, color: textMuted, marginLeft: 6 }}>任意</span>
            </label>
            <input
              type="text" placeholder="お名前" value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ ...inputStyle, width: "100%", fontSize: 14 }}
            />
          </div>

          {/* 名前入力案内 */}
          <div style={{
            fontSize: 11, color: textMuted, lineHeight: 1.6,
            marginBottom: 14, paddingLeft: 2,
          }}>
            名前を入力すると、言霊による名前解読（第5章・第6章）が追加されます。
            <br />
            入力しなくても宿曜鑑定（第1〜4章）は受けられます。
          </div>

          {/* ふりがな */}
          {name.trim() && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ ...subStyle, display: "block", marginBottom: 6 }}>
                ふりがな
                <span style={{ fontSize: 10, color: textMuted, marginLeft: 6 }}>
                  読みが正確なほど解読の精度が高まります
                </span>
              </label>
              <input
                type="text" placeholder="おなまえ" value={furigana}
                onChange={(e) => setFurigana(e.target.value)}
                style={{ ...inputStyle, width: "100%", fontSize: 14 }}
              />
            </div>
          )}

          {/* 悩み */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ ...subStyle, display: "block", marginBottom: 6 }}>
              現在の悩み・相談内容
              <span style={{ fontSize: 10, color: textMuted, marginLeft: 6 }}>任意</span>
            </label>
            <textarea
              placeholder="最近、仕事の方向性に迷いがあります…"
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              rows={3}
              style={{
                ...inputStyle,
                width: "100%", fontSize: 14, resize: "vertical",
                fontFamily: "inherit", lineHeight: 1.6,
              }}
            />
          </div>

          {/* 鑑定ボタン */}
          <button
            type="button" onClick={handleSubmit} disabled={loading}
            style={{
              ...btnBase, width: "100%", padding: "14px 0",
              background: loading ? "rgba(201, 161, 74, 0.5)" : arkGold,
              color: "#ffffff", fontSize: 15,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "鑑定中…" : "鑑定する"}
          </button>

          {error && (
            <div style={{
              marginTop: 12, padding: "12px 14px", borderRadius: 10,
              background: "rgba(220, 38, 38, 0.05)",
              border: "1px solid rgba(220, 38, 38, 0.2)",
              color: "#dc2626", fontSize: 13, lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════
            鑑定結果 — 結果OS v1.1
           ═══════════════════════════════════════════════════════ */}
        {result && (
          <div>
            {/* ── 第一層: 要約カード ── */}
            <div style={{
              ...cardBase,
              border: "1px solid rgba(201, 161, 74, 0.25)",
              background: "linear-gradient(135deg, rgba(201,161,74,0.04) 0%, rgba(201,161,74,0.01) 100%)",
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
                  fontSize: 32, fontWeight: 800, color: "var(--ark-gold, #c9a14a)",
                  letterSpacing: "0.08em",
                }}>
                  {formatShukuLabel(result.honmeiShuku)}
                </div>
                <div style={{ fontSize: 11, color: textMuted, marginTop: 4 }}>本命宿</div>
                {result.shukuSanskrit && (
                  <div style={{
                    marginTop: 10, padding: "8px 12px", borderRadius: 8,
                    background: "rgba(201, 161, 74, 0.03)",
                    border: "1px solid rgba(201, 161, 74, 0.08)",
                  }}>
                    <div style={{
                      fontSize: 12, color: textPrimary, letterSpacing: "0.03em",
                      display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap",
                    }}>
                      <span style={{ fontSize: 10, color: arkGold, fontWeight: 600 }}>梵名</span>
                      <span style={{ fontStyle: "italic", fontWeight: 500 }}>{result.shukuSanskrit}</span>
                      {result.shukuReading && (
                        <span style={{ fontSize: 10, color: textMuted }}>({result.shukuReading})</span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 9.5, color: textMuted, marginTop: 4, lineHeight: 1.5,
                    }}>
                      宿曜経に基づく対応名です。音韻の対照は参考情報としてお受け取りください。
                    </div>
                  </div>
                )}
              </div>

              {/* 災い分類 + 反転軸: 2カラム */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div style={{
                  padding: "12px", borderRadius: 10,
                  background: "rgba(201, 161, 74, 0.04)",
                  border: "1px solid rgba(201, 161, 74, 0.12)",
                  textAlign: "center", position: "relative",
                }}>
                  <div style={{ position: "absolute", top: 4, right: 4 }}>
                    <CopyBtn text={result.disasterType} label="災い分類" />
                  </div>
                  <div style={{ fontSize: 10, color: textMuted, marginBottom: 5, letterSpacing: "0.03em" }}>災い分類</div>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{result.disasterType}</div>
                </div>
                <div style={{
                  padding: "12px", borderRadius: 10,
                  background: "rgba(201, 161, 74, 0.04)",
                  border: "1px solid rgba(201, 161, 74, 0.12)",
                  textAlign: "center", position: "relative",
                }}>
                  <div style={{ position: "absolute", top: 4, right: 4 }}>
                    <CopyBtn text={result.reversalAxis} label="反転軸" />
                  </div>
                  <div style={{ fontSize: 10, color: textMuted, marginBottom: 5, letterSpacing: "0.03em" }}>反転軸</div>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{result.reversalAxis}</div>
                </div>
              </div>

              {/* 御神託 */}
              {getOracleShort() && (
                <div style={{
                  padding: "14px 16px", borderRadius: 12,
                  background: "rgba(201, 161, 74, 0.05)",
                  border: "1px solid rgba(201, 161, 74, 0.15)",
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
                  background: "rgba(201, 161, 74, 0.03)",
                  border: "1px dashed rgba(201, 161, 74, 0.2)",
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

              {/* confidence表示 */}
              {result.premise?.confidence != null && (
                <ConfidenceHint confidence={result.premise.confidence} />
              )}

              <ActionBar />
            </div>

            {/* ═══ 宿名統合サマリー ═══ */}
            {result.premise?.name && result.kotodamaSummary && (
              <div style={{
                ...cardBase,
                border: `1px solid rgba(47, 111, 94, 0.15)`,
                background: "rgba(47, 111, 94, 0.02)",
                padding: "1.125rem 1rem",
              }}>
                <h3 style={{
                  fontSize: 14, fontWeight: 600, color: arkGreen,
                  marginBottom: 12, display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 16 }}>✦</span>
                  宿曜と名前の統合読み
                </h3>
                <p style={{
                  fontSize: 11, color: textMuted, marginBottom: 14, lineHeight: 1.5,
                  fontStyle: "italic",
                }}>
                  宿曜鑑定と名前の言霊解読を重ね合わせた、ひとつの視点です。
                  絶対的な判定ではなく、自己理解の手がかりとしてお受け取りください。
                </p>

                {/* 統合サマリーカード */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14,
                }}>
                  {result.kotodamaSummary.soulDirection && (
                    <div style={{
                      padding: "12px", borderRadius: 10,
                      background: "rgba(47, 111, 94, 0.04)",
                      border: "1px solid rgba(47, 111, 94, 0.1)",
                    }}>
                      <div style={{ fontSize: 10, color: textMuted, marginBottom: 5, letterSpacing: "0.03em" }}>魂の方向性</div>
                      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>{result.kotodamaSummary.soulDirection}</div>
                    </div>
                  )}
                  {result.kotodamaSummary.guidingAxis && (
                    <div style={{
                      padding: "12px", borderRadius: 10,
                      background: "rgba(47, 111, 94, 0.04)",
                      border: "1px solid rgba(47, 111, 94, 0.1)",
                    }}>
                      <div style={{ fontSize: 10, color: textMuted, marginBottom: 5, letterSpacing: "0.03em" }}>導きの軸</div>
                      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>{result.kotodamaSummary.guidingAxis}</div>
                    </div>
                  )}
                </div>

                {/* 名前の音の特徴 */}
                {result.kotodamaSummary.nameAnalysis?.soulVibration && (
                  <div style={{
                    padding: "12px 14px", borderRadius: 10,
                    background: "rgba(47, 111, 94, 0.03)",
                    border: "1px solid rgba(47, 111, 94, 0.08)",
                    marginBottom: 14,
                  }}>
                    <div style={{ fontSize: 10, color: textMuted, marginBottom: 5, letterSpacing: "0.03em" }}>名前の音が持つ振動</div>
                    <div style={{ fontSize: 13, lineHeight: 1.7 }}>{result.kotodamaSummary.nameAnalysis.soulVibration}</div>
                  </div>
                )}

                {/* 補う音・支える音 */}
                {(result.kotodamaSummary.supportiveTones.length > 0 || result.kotodamaSummary.deficientTones.length > 0) && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                    {result.kotodamaSummary.supportiveTones.length > 0 && (
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ fontSize: 10, color: arkGreen, marginBottom: 6, fontWeight: 500 }}>支える音</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {result.kotodamaSummary.supportiveTones.map((t, i) => (
                            <span key={i} style={{
                              fontSize: 12, padding: "3px 10px", borderRadius: 12,
                              background: "rgba(47, 111, 94, 0.06)",
                              border: "1px solid rgba(47, 111, 94, 0.12)",
                              color: arkGreen, fontWeight: 500,
                            }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.kotodamaSummary.deficientTones.length > 0 && (
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ fontSize: 10, color: textMuted, marginBottom: 6, fontWeight: 500 }}>補いたい音</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {result.kotodamaSummary.deficientTones.map((t, i) => (
                            <span key={i} style={{
                              fontSize: 12, padding: "3px 10px", borderRadius: 12,
                              background: "rgba(0, 0, 0, 0.03)",
                              border: `1px solid ${borderLight}`,
                              color: textMuted, fontWeight: 500,
                            }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 導きのメッセージ */}
                {result.kotodamaSummary.guidingMessage && (
                  <div style={{
                    padding: "14px 16px", borderRadius: 12,
                    background: "rgba(47, 111, 94, 0.04)",
                    border: "1px solid rgba(47, 111, 94, 0.12)",
                    fontSize: 13, lineHeight: 1.8,
                    fontStyle: "italic",
                  }}>
                    {result.kotodamaSummary.guidingMessage}
                  </div>
                )}
              </div>
            )}

            {/* 名前未入力時の案内（自然に） */}
            {result && !result.premise?.name && (
              <div style={{
                ...cardBase,
                border: `1px dashed rgba(47, 111, 94, 0.15)`,
                background: "transparent",
                padding: "0.875rem 1rem",
                textAlign: "center",
              }}>
                <p style={{ fontSize: 12, color: textMuted, lineHeight: 1.6, margin: 0 }}>
                  名前を入力して鑑定すると、宿曜と名前の言霊を重ね合わせた
                  <span style={{ color: arkGreen, fontWeight: 500 }}>統合読み</span>が表示されます。
                </p>
              </div>
            )}

            {/* ═══ 鑑定直下チャット ═══ */}
            <div style={{
              ...cardBase,
              border: `1px solid rgba(201, 161, 74, 0.2)`,
              padding: "1.125rem 1rem",
            }}>
              {/* ヘッダー: 鑑定深掘り用であることを自然に伝える */}
              <div style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, ...goldStyle, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, opacity: 0.7 }}>✧</span>
                  この鑑定について続けて聞く
                </h3>
                <p style={{ fontSize: 11, color: textMuted, lineHeight: 1.6, margin: 0 }}>
                  鑑定結果を踏まえた専用の対話空間です。
                  気になった章や、日常への活かし方など、自由に聞いてみてください。
                </p>
              </div>

              {chatMessages.length === 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {QUESTION_CHIPS.map((chip) => (
                    <button
                      key={chip} type="button"
                      onClick={() => sendChatMessage(chip)}
                      disabled={chatLoading}
                      style={{ ...chipBase, opacity: chatLoading ? 0.5 : 1 }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {chatMessages.length > 0 && (
                <div style={{
                  maxHeight: "60vh", overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                  marginBottom: 12, padding: "4px 0",
                }}>
                  {chatMessages.map((msg, i) => {
                    const isMsgError = msg.isError === true;
                    return (
                      <div key={i} style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                        marginBottom: 10,
                      }}>
                        <div style={{
                          maxWidth: "88%",
                          padding: "11px 15px",
                          borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                          fontSize: 13.5, lineHeight: 1.85, whiteSpace: "pre-wrap", letterSpacing: "0.01em",
                          background: isMsgError
                            ? "rgba(180, 60, 60, 0.04)"
                            : msg.role === "user"
                              ? "rgba(201, 161, 74, 0.08)"
                              : "var(--sidebar-bg, #f7f7f8)",
                          border: isMsgError
                            ? "1px solid rgba(180, 60, 60, 0.18)"
                            : msg.role === "user"
                              ? "1px solid rgba(201, 161, 74, 0.2)"
                              : `1px solid ${borderLight}`,
                          position: "relative",
                          paddingRight: msg.role === "assistant" && !isMsgError ? 30 : 15,
                          ...(isMsgError ? { color: "rgba(140, 50, 50, 0.85)" } : {}),
                        }}>
                          {msg.text}
                          {msg.role === "assistant" && !isMsgError && (
                            <span style={{ position: "absolute", top: 4, right: 4 }}>
                              <CopyBtn text={msg.text} label="応答" />
                            </span>
                          )}
                        </div>
                        {/* エラーメッセージ直下の再送ボタン */}
                        {isMsgError && i === chatMessages.length - 1 && lastFailedText && !chatLoading && (
                          <button
                            type="button"
                            onClick={() => {
                              // エラーメッセージを削除して再送
                              setChatMessages(prev => prev.filter((_, idx) => idx !== i));
                              sendChatMessage(lastFailedText);
                            }}
                            style={{
                              ...btnBase,
                              minHeight: 32,
                              padding: "6px 14px",
                              fontSize: 11,
                              fontWeight: 500,
                              marginTop: 6,
                              background: "rgba(180, 60, 60, 0.06)",
                              border: "1px solid rgba(180, 60, 60, 0.15)",
                              color: "rgba(140, 50, 50, 0.8)",
                              borderRadius: 8,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="23 4 23 10 17 10" />
                              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            </svg>
                            もう一度送る
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {chatLoading && (
                    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
                      <div style={{
                        padding: "12px 16px", borderRadius: "14px 14px 14px 4px",
                        fontSize: 13,
                        background: "var(--sidebar-bg, #f7f7f8)",
                        border: `1px solid ${borderLight}`,
                        color: textMuted,
                        minWidth: 140,
                      }}>
                        <div className="sukuyou-loading-text" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            transition: "opacity 0.4s ease",
                            fontSize: 12.5,
                            letterSpacing: "0.02em",
                          }}>
                            {["読み解いています", "宿曜の流れを整えています", "ことばを結んでいます"][loadingPhase]}
                          </span>
                          <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
                            {[0, 1, 2].map(dotIdx => (
                              <span key={dotIdx} style={{
                                width: 4, height: 4, borderRadius: "50%",
                                background: "rgba(201, 161, 74, 0.6)",
                                animation: `sukuyouDot 1.2s ease-in-out ${dotIdx * 0.2}s infinite`,
                              }} />
                            ))}
                          </span>
                        </div>
                        {/* 応答待ちの脈動バー */}
                        <div style={{
                          marginTop: 8,
                          height: 2,
                          borderRadius: 1,
                          background: "rgba(201, 161, 74, 0.1)",
                          overflow: "hidden",
                        }}>
                          <div style={{
                            height: "100%",
                            borderRadius: 1,
                            background: "rgba(201, 161, 74, 0.35)",
                            animation: "sukuyouPulseBar 2.4s ease-in-out infinite",
                          }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* 入力欄・送信ボタン */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea
                  ref={chatInputRef}
                  placeholder={chatLoading ? "応答を待っています…" : "自由に質問する…"}
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
                    background: chatLoading ? "rgba(0,0,0,0.02)" : bgInput,
                    border: `1px solid ${chatLoading ? "rgba(0,0,0,0.06)" : borderInput}`,
                    color: textPrimary, fontSize: 14, boxSizing: "border-box",
                    fontFamily: "inherit", lineHeight: 1.5,
                    resize: "none", overflow: "auto",
                    minHeight: 44, maxHeight: 120,
                    opacity: chatLoading ? 0.6 : 1,
                    transition: "opacity 0.2s, background 0.2s, border-color 0.2s",
                  }}
                />
                <button
                  type="button"
                  onClick={() => sendChatMessage(chatInput)}
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    ...btnBase,
                    padding: "0 18px", minHeight: 44,
                    background: chatLoading
                      ? "rgba(47, 111, 94, 0.35)"
                      : chatInput.trim()
                        ? arkGreen
                        : "rgba(47, 111, 94, 0.25)",
                    color: "#ffffff", fontSize: 14, flexShrink: 0,
                    transition: "opacity 0.2s, background 0.2s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  {chatLoading ? (
                    <>
                      <span style={{
                        width: 14, height: 14,
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "gpt-spin 0.8s linear infinite",
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 12 }}>応答待ち</span>
                    </>
                  ) : "送信"}
                </button>
              </div>

              {/* エラー状態のヒント（再送導線補助） */}
              {chatError && !chatLoading && (
                <div style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "rgba(180, 60, 60, 0.03)",
                  border: "1px solid rgba(180, 60, 60, 0.1)",
                  fontSize: 11,
                  color: "rgba(140, 50, 50, 0.7)",
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>○</span>
                  通信が不安定な場合は、少し時間をおいてから再度お試しください。
                </div>
              )}
            </div>

            {/* ═══ 詳細レポート（折りたたみ） ═══ */}
            <div style={cardBase}>
              <button
                type="button"
                onClick={() => setShowDetail(!showDetail)}
                style={{
                  ...btnBase, width: "100%", padding: "12px 0",
                  background: "transparent", color: arkGold, fontSize: 14,
                  display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
                  border: "none",
                }}
              >
                {showDetail ? "詳細レポートを閉じる ▲" : "詳細レポートを読む ▼"}
              </button>

              {showDetail && (
                <div style={{ marginTop: 14 }}>
                  <div style={{
                    display: "flex", gap: 8, marginBottom: 14,
                    justifyContent: "flex-end", flexWrap: "wrap",
                  }}>
                    <button
                      type="button"
                      onClick={() => handleCopyItem(result.report.fullText, "レポート全文")}
                      style={outlineBtn}
                    >
                      レポート全文をコピー
                    </button>
                  </div>

                  {/* 章別アコーディオン */}
                  {result.report.chapters.map((ch, idx) => {
                    const isNameChapter = ch.number >= 5;
                    const prevChapter = idx > 0 ? result.report.chapters[idx - 1] : null;
                    const isTransitionToName = isNameChapter && prevChapter && prevChapter.number < 5;
                    return (
                      <React.Fragment key={ch.number}>
                      {/* 第4章→第5章の自然な区切り */}
                      {isTransitionToName && (
                        <div style={{
                          margin: "18px 0 14px",
                          padding: "12px 16px",
                          borderRadius: 10,
                          background: "rgba(47, 111, 94, 0.03)",
                          border: `1px solid rgba(47, 111, 94, 0.1)`,
                          display: "flex", alignItems: "center", gap: 10,
                        }}>
                          <span style={{ fontSize: 14, color: arkGreen }}>✦</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: arkGreen, marginBottom: 2 }}>
                              ここからは名前の言霊解読です
                            </div>
                            <div style={{ fontSize: 10, color: textMuted, lineHeight: 1.5 }}>
                              宿曜鑑定に名前の音の解読を重ねた、より深い読み解きです。
                            </div>
                          </div>
                        </div>
                      )}
                      <div style={{
                        borderBottom: `1px solid ${borderLight}`,
                        marginBottom: 4,
                      }}>
                        <button
                          type="button"
                          onClick={() => toggleChapter(ch.number)}
                          style={{
                            ...btnBase, width: "100%", padding: "12px 4px",
                            background: "transparent", color: textPrimary, fontSize: 13,
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            textAlign: "left", border: "none",
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                            <span style={goldStyle}>第{ch.number}章</span>
                            <span style={{ marginLeft: 8 }}>{ch.title}</span>
                            {isNameChapter && <NameChapterBadge />}
                          </span>
                          <span style={{ color: textMuted, fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                            {expandedChapters.has(ch.number) ? "▲" : "▼"}
                          </span>
                        </button>
                        {expandedChapters.has(ch.number) && (
                          <div style={{ padding: "0 4px 14px", fontSize: 13.5, lineHeight: 1.8 }}>
                            {ch.source && (
                              <span style={{
                                fontSize: 10, padding: "2px 8px", borderRadius: 4,
                                background: "rgba(201, 161, 74, 0.06)",
                                border: "1px solid rgba(201, 161, 74, 0.15)",
                                ...goldStyle, display: "inline-block", marginBottom: 10,
                              }}>
                                {ch.source}
                              </span>
                            )}
                            {isNameChapter && (
                              <div style={{
                                fontSize: 11, color: arkGreen, lineHeight: 1.5,
                                marginBottom: 10, fontStyle: "italic",
                              }}>
                                この章は名前の言霊解読に基づく読み解きです。
                                解釈の一つの視点としてお受け取りください。
                              </div>
                            )}
                            <div style={{ whiteSpace: "pre-wrap" }}>{ch.content}</div>
                            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  sendChatMessage(`第${ch.number}章「${ch.title}」について詳しく教えてください`);
                                  setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
                                }}
                                disabled={chatLoading}
                                style={{ ...chipBase, fontSize: 12, opacity: chatLoading ? 0.5 : 1 }}
                              >
                                この章について聞く
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyItem(ch.content, `第${ch.number}章`)}
                                style={{ ...chipBase, fontSize: 12, background: "transparent" }}
                              >
                                この章をコピー
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      </React.Fragment>
                    );
                  })}

                  <div style={{ fontSize: 10, color: textMuted, textAlign: "right", marginTop: 8 }}>
                    {result.report.charCount.toLocaleString()} 文字
                  </div>
                </div>
              )}
            </div>

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div style={{ fontSize: 11, color: textMuted, padding: "0 4px" }}>
                {result.warnings.map((w, i) => (
                  <p key={i} style={{ margin: "3px 0", lineHeight: 1.5 }}>{w}</p>
                ))}
              </div>
            )}

            {/* ── 結果末尾の新規鑑定CTA ── */}
            {onNewDiagnosis && (
              <div style={{
                textAlign: "center",
                marginTop: 20,
                paddingTop: 20,
                borderTop: `1px solid ${borderLight}`,
              }}>
                <button
                  type="button"
                  onClick={onNewDiagnosis}
                  style={{
                    ...btnBase,
                    background: "rgba(201, 161, 74, 0.06)",
                    border: `1px dashed rgba(201, 161, 74, 0.3)`,
                    color: arkGold,
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "12px 28px",
                    borderRadius: 10,
                  }}
                >
                  + 別の方の鑑定を始める
                </button>
                <p style={{ fontSize: 10, color: textMuted, marginTop: 8, lineHeight: 1.5 }}>
                  新しい生年月日で鑑定を行います
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
