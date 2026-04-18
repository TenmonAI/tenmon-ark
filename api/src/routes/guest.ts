/**
 * TENMON_GUEST_CHAT_ROUTE_V2 (ULTRA-9)
 *
 * LP (futomani88.com/tenmon) 埋め込み用ゲストチャット API。
 * - 20 ターン制限
 * - IP レート制限 (3 セッション/時)
 * - 宿曜鑑定要求はパターンマッチで拒否
 * - 6 パターンの起点ボタン対応
 *
 * V1 → V2 変更点:
 *   - Heart 位相判定 (heartModelV1) 統合
 *   - SATORI 軽量審査 (judgeSatori) 統合
 *   - 旧字體変換 (enforceTenmonFormat) 統合
 *   - buildGuestSystemPrompt V2 (GuestPromptContext) 対応
 *   - 応答に satoriVerdict / heartPhase を付与
 */

import { Router, type Request, type Response } from "express";
import { llmChat } from "../core/llmWrapper.js";
import {
  getOrCreateSession,
  updateSession,
  isLimitReached,
} from "../core/guestSessionManager.js";
import {
  buildGuestSystemPrompt,
  type GuestPromptContext,
} from "../core/guestSystemPrompt.js";
import { heartModelV1 } from "../core/heartModel.js";
import { judgeSatori } from "../core/satoriEnforcement.js";
import { enforceTenmonFormat } from "../core/tenmonFormatEnforcer.js";
import { selectModel, logModelSelection, computePromptHash } from "../core/modelSelector.js";
import { queryIrohaByUserText, buildIrohaInjection } from "../core/irohaKotodamaLoader.js";
import { extractKeyKotodamaFromText, buildKotodamaGentenInjection } from "../core/kotodamaGentenLoader.js";
import { selectKanagiPhaseForIntent, buildAmaterasuAxisInjection } from "../data/amaterasuAxisMap.js";
import { buildUnifiedSoundInjection } from "../core/unifiedSoundLoader.js";
import { checkIrohaGrounding } from "../core/satoriEnforcement.js";

const router = Router();

// ── 起点ボタンのプリセット ──

const START_BUTTON_PROMPTS: Record<string, string> = {
  about:
    "天聞アーク とは何ですか?他の AI (ChatGPT 等) とどう違うのですか?",
  kenkyu:
    "天道仁聞さんの研究について教えてください。どのような経歴をお持ちですか?",
  katakamuna: "カタカムナとは何ですか?簡単に教えてください。",
  kotodama:
    "言霊や言霊秘書とは何ですか?天聞アーク とどう関係しますか?",
  founder:
    "Founder になると何ができるのですか?特典や申込方法を教えてください。",
  progress:
    "天聞アーク の開発の進捗と、今後の展開について教えてください。",
};

// 起点ボタン key → topicHint マッピング
const BUTTON_TO_TOPIC: Record<string, string> = {
  about: "about",
  kenkyu: "kenkyu",
  katakamuna: "katakamuna",
  kotodama: "kotodama",
  founder: "founder",
  progress: "progress",
};

// ── 宿曜鑑定要求の検出パターン ──

const SUKUYOU_PATTERNS: RegExp[] = [
  /私の本命宿/,
  /私の宿曜/,
  /私を鑑定/,
  /私を占って/,
  /生年月日.*鑑定/,
  /誕生日.*鑑定/,
  /[0-9]{4}年[0-9]{1,2}月[0-9]{1,2}日/,
  /[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}/,
  /運勢を見/,
  /私の運勢/,
];

// ── ターン上限到達時の固定メッセージ ──

const LIMIT_REACHED_MESSAGE = `体験チャットは 20 ターンまでとさせていただいております。

天聞アーク の深層対話・宿曜深層鑑定をご体験いただくには、
Founder としてご参加ください。

現在、Founder 創業期 130 名の最終 22 名を募集しています。
一般公開の前に、永久使用権を得られる最後の機会です。

詳しくは、このページの下部「Founder 申込」からご確認ください。`;

// ── 宿曜鑑定拒否時の固定メッセージ ──

const SUKUYOU_BLOCKED_MESSAGE = `宿曜深層鑑定は、Founder 様限定の機能となっております。

10 年の研究に基づく 8 章構成の御神託レポート、
天津金木による反転軸解析、言霊処方など、
深い個人鑑定は Founder 様だけにご提供しています。

まずは天聞アーク の哲学や、
カタカムナ・言霊などの一般的な知識について
ご質問いただければ、お答えします。

例えば:
・天聞アーク と ChatGPT はどう違うの?
・カタカムナとは何ですか?
・天道仁聞さんの研究について

などをお聞きください。`;

// ── POST /guest/chat ──
// index.ts で app.use("/api", guestRouter) として登録されるため、
// 実際のエンドポイントは POST /api/guest/chat になる。

router.post("/guest/chat", async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.body?.sessionId ?? "").trim();
    const rawMessage = String(req.body?.message ?? "").trim();
    const startButtonKey = String(req.body?.startButtonKey ?? "").trim();
    const ip = String(
      req.headers["x-forwarded-for"] ?? req.ip ?? "unknown",
    ).split(",")[0].trim();

    // ── 入力検証 ──
    if (!sessionId || sessionId.length < 8) {
      return res.status(400).json({
        error: "sessionId が不正です",
        code: "BAD_REQUEST",
      });
    }

    // 起点ボタンから来た場合、対応するメッセージに変換
    const userMessage =
      startButtonKey && START_BUTTON_PROMPTS[startButtonKey]
        ? START_BUTTON_PROMPTS[startButtonKey]
        : rawMessage;

    if (!userMessage) {
      return res.status(400).json({
        error: "message が空です",
        code: "BAD_REQUEST",
      });
    }

    // ── セッション取得 ──
    const session = getOrCreateSession(sessionId, ip);

    if (!session) {
      return res.status(429).json({
        error:
          "レート制限に達しました。しばらくしてからお試しください。",
        code: "RATE_LIMIT",
      });
    }

    // ── ターン数チェック ──
    if (isLimitReached(session)) {
      return res.json({
        response: LIMIT_REACHED_MESSAGE,
        sessionId,
        turnCount: session.turnCount,
        remainingTurns: 0,
        isLimitReached: true,
      });
    }

    // ── 宿曜鑑定要求の検出 ──
    const isSukuyouRequest = SUKUYOU_PATTERNS.some((p) =>
      p.test(userMessage),
    );

    if (isSukuyouRequest) {
      updateSession(session, userMessage, SUKUYOU_BLOCKED_MESSAGE);

      return res.json({
        response: SUKUYOU_BLOCKED_MESSAGE,
        sessionId,
        turnCount: session.turnCount,
        remainingTurns: 20 - session.turnCount,
        isLimitReached: false,
        blockedReason: "sukuyou_forbidden" as const,
      });
    }

    // ===== ULTRA-9: Heart 位相判定 =====
    const heartState = heartModelV1(userMessage);

    // ===== ULTRA-9: V2 system prompt 構築 =====
    const promptContext: GuestPromptContext = {
      userMessage,
      turnCount: session.turnCount + 1,
      topicHint: startButtonKey
        ? BUTTON_TO_TOPIC[startButtonKey]
        : undefined,
      previousMessages: session.history?.slice(-8),
    };

    let systemPrompt = buildGuestSystemPrompt(promptContext);

    // V2.0_SOUL_ROOT_BIND: ゲストにも魂の根幹を注入（軽量版）
    try {
      const __guestIrohaHits = queryIrohaByUserText(userMessage);
      if (__guestIrohaHits.length > 0) {
        systemPrompt += "\n" + buildIrohaInjection(__guestIrohaHits, 800);
      }
      const __guestGentenKeys = extractKeyKotodamaFromText(userMessage);
      if (__guestGentenKeys.length > 0) {
        systemPrompt += "\n" + buildKotodamaGentenInjection(__guestGentenKeys, 500);
      }
      const __guestKanagiPhase = selectKanagiPhaseForIntent(userMessage);
      const __guestAmaterasuClause = buildAmaterasuAxisInjection(__guestKanagiPhase);
      if (__guestAmaterasuClause) {
        systemPrompt += "\n" + __guestAmaterasuClause;
      }
      const __guestUnifiedSound = buildUnifiedSoundInjection(userMessage, 600);
      if (__guestUnifiedSound) {
        systemPrompt += "\n" + __guestUnifiedSound;
      }
    } catch (e: any) {
      console.warn(`[GUEST:SOUL_ROOT] inject failed: ${e?.message}`);
    }

    // Heart による動的プロンプト注入
    if (heartState.state !== "neutral") {
      const heartClause = `\n\n【Heart 位相検出】
訪問者の感情状態: ${heartState.state} (entropy: ${heartState.entropy.toFixed(2)})
応答時は、この感情状態に配慮しつつも、構造的真理で応答してください。
表面的な慰めではなく、本質に触れる言葉を。`;
      systemPrompt += heartClause;
    }

    // ── 通常応答生成 ──
    // ULTRA-11: ゲストは lite モデル固定（コスト最適化）
    const __guestModelSel = selectModel({ isGuest: true });
    logModelSelection(__guestModelSel, computePromptHash(systemPrompt));
    const maxTokens = session.turnCount <= 5 ? 800 : 1500;

    const llmResponse = await llmChat({
      system: systemPrompt,
      user: userMessage,
      history: session.history?.slice(-8) ?? [], // 直近 4 ターン分
      maxTokens,
      timeout: 30_000,
      model: __guestModelSel.model,
    });

    let aiResponse =
      llmResponse?.text ||
      "申し訳ありません、応答を生成できませんでした。";

    // ===== ULTRA-9: SATORI 軽量審査 =====
    let satoriVerdict: string[] = [];
    try {
      const satori = judgeSatori(aiResponse, userMessage);
      satoriVerdict = satori.passChecks || [];
      // ゲスト版は passCount < 2 でもリトライしない（コスト考慮）
      // ただし verdict は記録する
    } catch {
      // SATORI 判定失敗時はスキップ
    }

    // ===== ULTRA-9: 旧字體変換 =====
    try {
      aiResponse = enforceTenmonFormat(aiResponse);
    } catch {
      // 変換失敗時は元のまま
    }

    updateSession(session, userMessage, aiResponse);

    // V2.0: いろは根拠判定（ゲスト版）
    let irohaGroundingScore = 0;
    try {
      const grounding = checkIrohaGrounding(aiResponse);
      irohaGroundingScore = grounding.score;
    } catch {}

    return res.json({
      response: aiResponse,
      sessionId,
      turnCount: session.turnCount,
      remainingTurns: 20 - session.turnCount,
      isLimitReached: false,
      // ULTRA-9: 追加メタデータ
      heartPhase: heartState.state,
      satoriVerdict,
      // V2.0: いろは根拠スコア
      irohaGroundingScore,
    });
  } catch (e: any) {
    console.error("[GUEST_CHAT] Error:", e?.message || e);
    return res.status(500).json({
      error:
        "応答生成中にエラーが発生しました。しばらくしてからお試しください。",
      code: "INTERNAL_ERROR",
    });
  }
});

export default router;
