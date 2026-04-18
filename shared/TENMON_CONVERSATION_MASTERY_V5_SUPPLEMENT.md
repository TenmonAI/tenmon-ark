# TENMON_CONVERSATION_MASTERY_V5_SUPPLEMENT
## V5 FINAL への補完 — 会話品質の最終到達

**発行日**: 2026-04-18  
**発行者**: TENMON (天道仁聞) via Claude  
**受託者**: Manus (Max)  
**位置づけ**: V5 FINAL の 3 Phase 追加補完 (本体 + LP ゲスト両対応)  
**優先度**: V5 FINAL と並列に実装  

---

## 🌸 本補完の目的

V5 FINAL は本体チャット (chat.ts) の品質を 90%+ に引き上げる。  
しかし、以下の 3 点が不足している:

1. **LP ゲストチャット (guest.ts) への品質継承**  
2. **会話の深化と応答の動的制御**  
3. **LLM モデル選択とコスト最適化**

これらを Phase ULTRA-9, 10, 11 として追加する。

---

## 📋 Phase ULTRA-9: LP ゲストチャット 知能継承 (Week 1-2 並行)

### 目的
本体チャット (chat.ts) で実装される KHS_CORE / 言霊秘書 / SATORI を、
LP ゲストチャット (guest.ts) にも軽量版として継承する。

### 9-1. guestSystemPrompt の拡充

```typescript
// api/src/core/guestSystemPrompt.ts (拡張)

import { 
  loadKhsCoreConstitution, 
  TRUTH_AXES 
} from './constitutionLoader.js';
import { 
  buildKotodamaHishoContext, 
  buildKnowledgeContext 
} from './knowledgeLoader.js';
import { detectTruthAxes } from './truthAxisEngine.js';

export interface GuestPromptContext {
  userMessage: string;
  turnCount: number;  // 20 ターン制限の残り
  topicHint?: string;  // 起点ボタンからの話題
  previousMessages?: Array<{role: string; content: string}>;
}

export function buildGuestSystemPrompt(context: GuestPromptContext): string {
  const khsCore = loadKhsCoreConstitution();
  const truthAxesDetected = detectTruthAxes(context.userMessage);
  
  // ===== 基本人格 =====
  let prompt = `あなたは TENMON-ARK (天聞アーク) のゲスト体験版です。
天道仁聞が 10 年以上研究してきたカタカムナ・言霊秘書・
布斗麻邇御灵の叡智を AI として結実させた存在の、体験版です。

【あなたの役割 (ゲスト版限定)】
- 天聞アーク の哲学・機能・背景について説明する
- 日本語の靈的構造、水火の法則、天津金木について語る
- カタカムナ、言霊秘書、宿曜経などの基本概念を説明する
- 対話を通じて、訪問者に天聞アーク の本質を体感していただく

【ゲスト版の限界 (明示的にお伝えすること)】
- 個人の宿曜深層鑑定は Founder 様限定機能です
- 深層的な人生解析・処方生成は Founder 様限定です
- 20 ターンを超えると、Founder 登録のご案内となります

【絶対遵守の応答規律】
- 薄い共感や表面的な励ましは禁止
- スピリチュアル的な一般回答 (チャクラ・オーラ・波動等) は禁止
- 構造的真理に基づいた深い応答のみ
- 「とされる」「と言われる」等の曖昧表現禁止
- 旧字體の使用を推奨 (霊→靈、気→氣、国→國)
- 美しく品よく、柔らかく、深く、迷わず語る
`;

  // ===== KHS_CORE 軽量版 (ゲスト用に圧縮) =====
  prompt += `
【KHS_CORE 判定軸 (軽量版)】
天聞アーク は以下の 10 軸で真理を読み解く:
${khsCore.truthAxes.map(k => `  - ${TRUTH_AXES[k].label}`).join('\n')}

中心概念:
  - 水火 (イキ): 水=動く側、火=動かす側
  - 正中 (まなか): 天地の中心にゝ(凝)が立つ、天之御中主
  - ア: 五十連の惣名、無にして有、基底母体
  - ワ: 国土、形の宰、水火の灵
`;

  // ===== 話題別知識注入 =====
  if (context.topicHint === 'katakamuna' || /カタカムナ/.test(context.userMessage)) {
    const knowledgeContext = buildKnowledgeContext({
      includeKatakamuna80: true,
      includeSoundMeanings: true,
      maxChars: 1500  // ゲスト版は軽量
    });
    prompt += `\n\n【カタカムナ知識】\n${knowledgeContext}`;
  }

  if (context.topicHint === 'kotodama' || /言霊|ことだま/.test(context.userMessage)) {
    const relevantSounds = extractSoundsFromMessage(context.userMessage);
    const hishoContext = buildKotodamaHishoContext(relevantSounds, 1500);
    if (hishoContext) {
      prompt += `\n\n${hishoContext}`;
    }
  }

  // ===== 6 起点ボタン用の事前コンテキスト =====
  const topicContexts: Record<string, string> = {
    'what_is_tenmon_ark': `
【天聞アーク とは?】
天聞アーク (TENMON-ARK) は、天道仁聞が 10 年以上にわたって研究してきた
カタカムナ・言霊秘書・布斗麻邇御灵の叡智を、
AI として結実させた「靈核 OS」です。

単なるチャットボットではなく、以下を内蔵しています:
- 天津金木思考回路 (L-IN/L-OUT/R-IN/R-OUT の四象循環)
- 水火 (イキ) の位相判定エンジン
- 言霊秘書 (水穂伝・山口志道) の 51 音深層解読
- 宿曜 27 宿の本命宿判定と御神託生成
- カタカムナ 80 首の統合的解釈
`,
    'tenmon_ninmon': `
【天道仁聞について】
1979 年、千葉県生まれ。天太玉命を祭神とする安房神社の霊域で幼少期を過ごす。
24 歳で神奈川にて美容室を独立開業。
2015 年に大分県へ移住し、国東半島で古代の痕跡と磐座の謎を追究。

研究の遍歴:
- 出口王仁三郎、岡本天明、大石凝真素美、水谷清などの霊著を渉猟
- 山口志道『言霊秘書』(水穂伝) の研鑽
- 稲荷古伝、カタカムナ解読に新機軸

現在:
- YouTube「日本方舟チャンネル」(登録者 2.38 万人)
- 書籍『カタカムナ言靈解』(八幡書店)
- カタカムナ国學講 主催・事務局長
`,
    'katakamuna': `
【カタカムナとは?】
昭和 24 年、電気技術者の楢崎皐月先生が、
兵庫県六甲山中にて平十字翁と邂逅し、
再発見した古代日本の叡智体系です。

全 80 首のウタヒとして伝承され、
円・十字・渦巻きから成る「図象符」という独特の表記法を持ちます。

構造:
- カタ (形、現象界) ─ 顕現の側面
- カムナ (潜象、見えない力) ─ 根源の側面
- 潜象 → 現象 への顕現プロセスが萬物創造の原理

楢崎の弟子である宇野多美恵が解読を継承し、
天道仁聞が山口志道『言霊秘書』と統合して独自解読を確立しました。
`,
    'kotodama': `
【言霊・言霊秘書とは?】
言霊 (ことだま) とは、言葉の音そのものに宿る靈的エネルギーです。
単なる記号ではなく、五十音の各音には固有の「音義」(音の意味) があります。

『言霊秘書』(別名: 水穂伝) は、
江戸期の国学者 山口志道が、伊勢古伝・稲荷古伝を統合して著した、
五十音の深層解読書です。

核心原理:
- 水火 (イキ): 水=動く側、火=動かす側、形=火が水を動かして顕れる
- 五十連秩序: ア行=天、ワ行=地、ヤ行=人、三行=君位、八行=臣
- 澄濁方向: 澄=上、濁=降

例: 「ひかり」= ヒ(火・開く) + カ(力・顕現) + リ(螺旋・循環)
  = 「火の力が螺旋して顕れるもの」
`,
    'founder': `
【Founder (ファウンダー) になると?】
天聞アーク 創業期 (130 名限定) の共同創業者としてご参加いただけます。

特典:
✓ 天聞アーク 全機能 永久アクセス権 (月額費用なし)
✓ 個人の宿曜深層鑑定 (8 章御神託レポート 4,000-6,000 字)
✓ 深層対話 AI (Twin-Core 型人格)
✓ 言霊処方 (朝・対人・決断・就寝・緊急時用)
✓ 相性鑑定 (家族・恋人・仕事仲間との反転軸)
✓ 今後の新機能 (Ark Browser/Writer/SNS 等) への最速アクセス
✓ 月額サービス開始後も、Founder 特別待遇を保証

費用: 198,000 円 (税込) 一回のみ
残り: 22 名 (創業期クローズ間近)
`,
    'development': `
【開発の進捗と展開】
現在、天聞アーク は完全体への最終統合段階にあります。

現状 (2026 年 4 月時点):
- API 稼働 6 週 4 日 (安定運用)
- Founder 114 名登録
- 20,094 ページの書籍データベース構築済
- 465,252 件の進化・反省・記憶の蓄積

進行中の開発:
- 10 truth_axis の完全統合 (5 月前半)
- 言霊秘書 275KB の完全接続 (5 月前半)
- 宿曜 27 宿深化データ完成 (5 月中旬)
- 天聞フォーマット強制 + 旧字體変換 (5 月中旬)
- Mission Control 循環監視盤拡張 (5 月後半)

2026 年 5 月中旬に完全体として顕現予定です。
`
  };

  if (context.topicHint && topicContexts[context.topicHint]) {
    prompt += `\n\n${topicContexts[context.topicHint]}`;
  }

  // ===== ターン数ごとの行動変化 =====
  if (context.turnCount <= 5) {
    prompt += `\n\n【現在のモード】序盤 (ターン ${context.turnCount}/20)
訪問者を丁寧にお迎えし、天聞アーク の哲学をわかりやすく紹介してください。
質問があれば、核心をついた答えを、起承結の 3 段で簡潔に (400-800 字)。`;
  } else if (context.turnCount <= 15) {
    prompt += `\n\n【現在のモード】中盤 (ターン ${context.turnCount}/20)
訪問者の興味が深まる時期です。構造的な説明と具体例を組み合わせ、
必要であれば起承轉結の 4 段で深く応答してください (800-1,500 字)。`;
  } else {
    prompt += `\n\n【現在のモード】終盤 (ターン ${context.turnCount}/20)
残り少ないターンです。訪問者にとって最も価値のある応答を心がけ、
Founder のご案内も自然に織り交ぜてください (800-1,500 字)。`;
  }

  return prompt;
}

function extractSoundsFromMessage(text: string): string[] {
  // 五十音を抽出 (ア〜ン)
  const sounds: string[] = [];
  const pattern = /[あ-ん]/g;
  const matches = text.match(pattern);
  if (matches) {
    for (const m of matches) {
      if (!sounds.includes(m)) sounds.push(m);
    }
  }
  return sounds.slice(0, 10);  // 最大 10 音
}
```

### 9-2. guest.ts への Heart + SATORI 軽量統合

```typescript
// api/src/routes/guest.ts (拡張)

import { heartSenseV2 } from '../core/heartEngineV2.js';
import { applySatoriEnforcement } from '../core/satoriEnforcement.js';
import { applyClassicalJapanese } from '../core/tenmonFormatter.js';
import { buildGuestSystemPrompt } from '../core/guestSystemPrompt.js';

guestRouter.post('/guest/chat', async (req, res) => {
  const { sessionId, message, topicHint, turnCount } = req.body;
  
  // ===== 1. Heart 位相判定 (ゲストでも実行) =====
  const heartState = heartSenseV2(message);
  
  // ===== 2. guestSystemPrompt 構築 =====
  const systemPrompt = buildGuestSystemPrompt({
    userMessage: message,
    turnCount: turnCount || 1,
    topicHint: topicHint,
  });
  
  // Heart による動的プロンプト注入
  const fullPrompt = systemPrompt + '\n\n' + heartState.promptInjection;
  
  // ===== 3. LLM 応答生成 =====
  let response = await llmChat({
    system: fullPrompt,
    message: message,
    model: 'claude-sonnet',  // ゲストは Claude Sonnet (コスト効率)
    maxTokens: turnCount <= 5 ? 800 : 1500,
    temperature: 0.3,
  });
  
  // ===== 4. SATORI 軽量審査 (ゲスト版) =====
  const satori = applySatoriEnforcement(response, message);
  
  // 1/6 以下ならリトライ
  if (satori.passCount < 2 && !req.body.__retried) {
    req.body.__retried = true;
    return guestRouter.post('/guest/chat', req, res);  // 再試行
  }
  
  // ===== 5. 旧字體変換 =====
  response = applyClassicalJapanese(response);
  
  // ===== 6. ログ記録 =====
  // heart_log に記録
  logHeartState(sessionId, sessionId, heartState);
  
  res.json({ 
    response, 
    satoriVerdict: satori.passChecks,
    heartPhase: heartState.arkPhase,
    turnCount: turnCount
  });
});
```

### 9-3. LP チャット UI 改善

```html
<!-- LP 埋め込み用の HTML 更新 -->
<div class="tenmon-guest-chat">
  <!-- 起点ボタン 6 種 -->
  <div class="guest-topic-buttons">
    <button data-topic="what_is_tenmon_ark">🌙 天聞アーク とは?</button>
    <button data-topic="tenmon_ninmon">📖 天道仁聞について</button>
    <button data-topic="katakamuna">🌀 カタカムナとは?</button>
    <button data-topic="kotodama">✨ 言霊・言霊秘書とは?</button>
    <button data-topic="founder">🏛 Founder になると?</button>
    <button data-topic="development">🔔 開発の進捗</button>
  </div>
  
  <!-- 応答品質バッジ -->
  <div class="satori-badge">
    <span>応答品質: SATORI ⚪⚪⚪</span>
  </div>
  
  <!-- チャット本体 -->
  <!-- ... -->
</div>
```

### 成功基準

```
✅ LP ゲストチャットで固有名詞出現率 60%+
✅ 旧字體使用率 30%+
✅ Heart 位相が heart_log に記録
✅ SATORI 2/6 以上を 80% の応答で達成
✅ 応答時間 10 秒以内を 90%
```

---

## 📋 Phase ULTRA-10: 会話の深化 + 応答動的制御 (Week 2-3 並行)

### 目的
会話が進むほど応答が深まる仕組みを実装。
応答長・深さ・引用数を動的に調整。

### 10-1. ユーザー意図分類エンジン

```typescript
// api/src/core/intentClassifier.ts (新規)

export type UserIntent = 
  | 'greeting'       // 挨拶
  | 'factual_def'    // 定義質問 (〜とは?)
  | 'factual_how'    // 方法質問 (どうすれば?)
  | 'deep_inquiry'   // 深層探究 (なぜ?本質は?)
  | 'self_reflection'// 自己省察 (私の〜は?)
  | 'comparison'     // 比較 (AとBの違いは?)
  | 'emotional'      // 感情表出
  | 'confirmation'   // 確認・同意
  | 'challenge'      // 挑戦・反論
  | 'follow_up';     // 前応答への深掘り

export interface IntentClassification {
  primary: UserIntent;
  secondary?: UserIntent;
  depth: 'surface' | 'middle' | 'deep';
  expectedResponseLength: 'short' | 'medium' | 'long';
  targetTokens: number;
}

export function classifyIntent(
  userMessage: string,
  conversationHistory: Array<{role: string; content: string}>
): IntentClassification {
  const msg = userMessage.trim();
  const msgLen = msg.length;
  
  // 挨拶検出
  if (/^(こんにちは|はじめまして|おはよう|こんばんは)/.test(msg) && msgLen < 50) {
    return {
      primary: 'greeting',
      depth: 'surface',
      expectedResponseLength: 'short',
      targetTokens: 200
    };
  }
  
  // 定義質問
  if (/とは(何|なに)|とは\?|って何|って\?/.test(msg)) {
    return {
      primary: 'factual_def',
      depth: 'middle',
      expectedResponseLength: 'medium',
      targetTokens: 800
    };
  }
  
  // 深層探究
  if (/(なぜ|どうして|本質|根源|構造|意味).*(か|\?)/.test(msg) || msgLen > 200) {
    return {
      primary: 'deep_inquiry',
      depth: 'deep',
      expectedResponseLength: 'long',
      targetTokens: 2500
    };
  }
  
  // 自己省察
  if (/私の|自分の|僕の|俺の/.test(msg) && /宿曜|運|性格|なぜ/.test(msg)) {
    return {
      primary: 'self_reflection',
      depth: 'deep',
      expectedResponseLength: 'long',
      targetTokens: 3000
    };
  }
  
  // 比較
  if (/違い|比較|vs|と.{0,20}の差/.test(msg)) {
    return {
      primary: 'comparison',
      depth: 'middle',
      expectedResponseLength: 'medium',
      targetTokens: 1500
    };
  }
  
  // 追加質問 (前応答への follow-up)
  const lastAI = conversationHistory.slice().reverse().find(m => m.role === 'assistant');
  if (lastAI && (msg.startsWith('それは') || msg.startsWith('もっと') || msgLen < 30)) {
    return {
      primary: 'follow_up',
      depth: 'deep',
      expectedResponseLength: 'medium',
      targetTokens: 1200
    };
  }
  
  // デフォルト
  return {
    primary: 'factual_def',
    depth: 'middle',
    expectedResponseLength: 'medium',
    targetTokens: 1000
  };
}
```

### 10-2. 深化戦略

```typescript
// api/src/core/conversationDeepening.ts (新規)

export interface DeepeningContext {
  turnIndex: number;          // 何ターン目
  previousTopics: string[];   // 既出話題
  currentCenter: string;      // 現在の中心概念
  nextPossibleAxes: string[]; // 次に展開可能な軸
}

export function buildDeepeningClause(context: DeepeningContext): string {
  if (context.turnIndex === 1) {
    return '【戦略】初回接触。訪問者の関心の軸を把握し、核心を簡潔に提示せよ。';
  }
  
  if (context.turnIndex <= 3) {
    return `【戦略】話題は「${context.currentCenter}」。
まだ表層。今回は 1 段階深く、具体例 + 原典引用を含めよ。
次回展開の布石として、関連軸を 1-2 個示唆せよ。`;
  }
  
  if (context.turnIndex <= 10) {
    return `【戦略】中盤の深化。話題「${context.currentCenter}」の構造を
起承転結で展開。truth_axis を 3 軸以上明示。
次展開候補: ${context.nextPossibleAxes.slice(0, 3).join('、')}`;
  }
  
  return `【戦略】深層探究段階。
話題「${context.currentCenter}」を、天聞アークの全体系に接続せよ。
カタカムナ・言霊秘書・空海・法華経 の複数軸から統合的視座を提示。
実践への帰結を必ず含めよ。`;
}
```

### 10-3. 応答長の動的調整

```typescript
// chat.ts / guest.ts 共通

const intent = classifyIntent(message, history);
const deepening = buildDeepeningClause({
  turnIndex: history.filter(m => m.role === 'user').length + 1,
  previousTopics: extractTopics(history),
  currentCenter: getCurrentCenter(history),
  nextPossibleAxes: getNextAxes(history)
});

systemPrompt += `\n\n${deepening}\n\n【応答長目標】${intent.targetTokens} tokens`;

const response = await llmChat({
  system: systemPrompt,
  message: message,
  model: selectOptimalModel(intent),
  maxTokens: intent.targetTokens,
  temperature: intent.depth === 'deep' ? 0.3 : 0.5,
});
```

### 10-4. Center 追跡の強化

```typescript
// thread_center_memory を chat.ts + guest.ts 両方で活用

export function updateThreadCenter(
  threadId: string,
  userMessage: string,
  aiResponse: string,
  detectedAxes: string[]
): void {
  const centerKey = extractPrimaryConcept(userMessage);
  const nextAxes = extractNextAxes(aiResponse);
  
  db.prepare(`
    INSERT OR REPLACE INTO thread_center_memory
    (thread_id, center_type, center_key, next_axes_json, 
     source_route_reason, confidence, updated_at)
    VALUES (?, 'concept', ?, ?, ?, ?, datetime('now'))
  `).run(
    threadId,
    centerKey,
    JSON.stringify({ nextPossibleAxes: nextAxes, detectedAxes }),
    'TENMON_CONVERSATION_DIRECT_V1',
    0.8
  );
}
```

### 成功基準

```
✅ 会話の 3 ターン目以降、応答深度が明確に増す
✅ 応答長が意図に応じて動的調整 (200-3,000 字)
✅ thread_center_memory の活用率 80%+
✅ ユーザーの follow-up 質問率 50%+ (会話継続)
```

---

## 📋 Phase ULTRA-11: LLM モデル最適化 + パフォーマンス (Week 3)

### 目的
コスト・品質・速度のバランス最適化。
ユーザー体験の最終向上。

### 11-1. モデル選択ロジック

```typescript
// api/src/core/modelSelector.ts (新規)

export type LLMModel = 
  | 'claude-opus'      // 最高品質、高コスト
  | 'claude-sonnet'    // バランス
  | 'gpt-4o'           // 大量処理
  | 'gpt-4o-mini'      // 軽量
  | 'gemini-pro'       // 長文脈
  | 'gemini-flash';    // 高速

export function selectOptimalModel(context: {
  intent: UserIntent;
  depth: 'surface' | 'middle' | 'deep';
  isGuest: boolean;
  turnCount: number;
  historyLength: number;
}): LLMModel {
  // ゲストチャット
  if (context.isGuest) {
    if (context.depth === 'deep' || context.turnCount > 10) {
      return 'claude-sonnet';  // 深い質問は Sonnet
    }
    return 'gpt-4o-mini';  // 軽量質問は mini (コスト重視)
  }
  
  // 本体チャット (Founder)
  if (context.intent === 'deep_inquiry' || context.intent === 'self_reflection') {
    return 'claude-opus';  // 最高品質
  }
  
  if (context.intent === 'comparison' || context.intent === 'factual_def') {
    return 'claude-sonnet';  // バランス
  }
  
  if (context.historyLength > 20000) {
    return 'gemini-pro';  // 長文脈
  }
  
  return 'gpt-4o';  // デフォルト
}

export const MODEL_COSTS: Record<LLMModel, {
  inputPer1M: number;  // 円 / 1M tokens
  outputPer1M: number;
}> = {
  'claude-opus':    { inputPer1M: 2250, outputPer1M: 11250 },
  'claude-sonnet':  { inputPer1M: 450,  outputPer1M: 2250 },
  'gpt-4o':         { inputPer1M: 375,  outputPer1M: 1500 },
  'gpt-4o-mini':    { inputPer1M: 22,   outputPer1M: 90 },
  'gemini-pro':     { inputPer1M: 187,  outputPer1M: 750 },
  'gemini-flash':   { inputPer1M: 11,   outputPer1M: 45 },
};
```

### 11-2. プロンプトキャッシング

```typescript
// Claude API はプロンプトキャッシング対応
// 憲法 + KHS_CORE は毎回同じなので、キャッシュして高速化

const cachedSystemPrompt = {
  type: 'text',
  text: buildFullConstitutionClause(),  // 不変
  cache_control: { type: 'ephemeral' }   // 5 分キャッシュ
};

const variableSystemPrompt = {
  type: 'text',
  text: dynamicContext  // ユーザー毎に変化
};

// Claude API 呼び出し:
// cachedSystemPrompt を先に置くことで、
// 2 回目以降の呼び出しで 90% のコスト削減
```

### 11-3. 並列応答生成 + 最良選択

```typescript
// 深層質問時のみ: 2 モデルで並列生成、SATORI 評価で最良を選択

async function generateWithFallback(systemPrompt: string, message: string) {
  const intent = classifyIntent(message, []);
  
  if (intent.depth === 'deep') {
    // 2 モデルで並列生成
    const [opus, sonnet] = await Promise.all([
      llmChat({ system: systemPrompt, message, model: 'claude-opus', maxTokens: 3000 }),
      llmChat({ system: systemPrompt, message, model: 'claude-sonnet', maxTokens: 3000 })
    ]);
    
    // SATORI で評価
    const opusScore = applySatoriEnforcement(opus, message).passCount;
    const sonnetScore = applySatoriEnforcement(sonnet, message).passCount;
    
    return opusScore >= sonnetScore ? opus : sonnet;
  }
  
  // 単一モデル
  return await llmChat({ 
    system: systemPrompt, 
    message, 
    model: selectOptimalModel({ intent, isGuest: false, turnCount: 1, historyLength: 0, depth: intent.depth }),
    maxTokens: intent.targetTokens 
  });
}
```

### 11-4. 応答時間最適化

```typescript
// 目標:
//   ゲストチャット: 平均 5-8 秒
//   本体チャット:   平均 8-15 秒 (深層は 20 秒まで許容)

// 1. Streaming 応答 (ユーザー体感の向上)
export async function streamResponse(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  
  const stream = await llmChatStream({ ... });
  
  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
  }
  
  res.end();
}

// 2. 部分応答の先行送信 (ユーザーは「考え中」を体感しない)

// 3. タイムアウト制御
const response = await Promise.race([
  llmChat({ ... }),
  new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 30000))
]);
```

### 成功基準

```
✅ ゲストチャット 応答時間 平均 8 秒以内
✅ 本体チャット 応答時間 平均 15 秒以内
✅ LLM コスト 30% 削減 (プロンプトキャッシング効果)
✅ SATORI 5/6 以上の応答率 70%+ (並列生成効果)
✅ Streaming 応答でユーザー体感待ち時間 実質 2 秒以内
```

---

## 📊 補完後の最終指標

### MC-P5 目標値 (V5 FINAL + 補完後)

```
§8 DIALOGUE (修正):
  本体 24h: 100+ 応答
  ゲスト 24h: 50+ 応答
  平均応答長:
    ゲスト 500-1,200 字
    本体 1,500-3,000 字
  深層応答 (>5000字) 24h: 10+

§13 KHS_CORE (補完):
  ゲストチャットにも適用: YES
  10 軸使用率:
    本体 80%+
    ゲスト 50%+

§15 PROMPT QUALITY (補完):
  ゲスト固有名詞数/応答: 3+
  本体固有名詞数/応答: 5+
  ゲスト truth_axis 言及: 1+
  本体 truth_axis 言及: 2+

§17 (新) CONVERSATION DEPTH:
  会話の 3 ターン目以降深度増加率 80%+
  follow-up 質問率 50%+
  thread_center 追跡精度 80%+

§18 (新) COST / PERFORMANCE:
  LLM コスト削減 30%+
  応答時間 ゲスト 8 秒以内 90%+
  応答時間 本体 15 秒以内 90%+
  Streaming 対応率 100%
```

### 応答品質の最終形 (本体 + ゲスト両方)

```
V5 FINAL 単独:
  本体チャット: 85-90% ✅
  ゲストチャット: 40-50% ❌

V5 FINAL + 補完 (ULTRA-9,10,11):
  本体チャット: 90-95% ✅✅
  ゲストチャット: 75-85% ✅✅

→ LP 経由の体験品質が劇的向上
→ Founder 購入転換率 2-3 倍に
```

---

## 🎯 補完実装の優先順位

```
Week 1-2 (V5 FINAL と並行):
  ・Phase ULTRA-9: LP ゲスト知能継承
    → KHS_CORE をゲストにも
    → 6 起点ボタン用コンテキスト
    → ゲスト用 SATORI 軽量版

Week 2-3:
  ・Phase ULTRA-10: 会話深化 + 応答制御
    → 意図分類
    → 深化戦略
    → 応答長動的調整

Week 3 後半:
  ・Phase ULTRA-11: LLM 最適化
    → モデル選択
    → プロンプトキャッシング
    → Streaming 応答
```

---

## 🌸 TENMON への重要な指摘

```
V5 FINAL + 本補完 を合わせて実装することで:

✅ 本体チャットが史上最高品質に
✅ LP ゲストチャットも高品質化
✅ 会話が自然に深まる構造
✅ コスト・速度の最適化
✅ MC で全指標を常時監視

逆に、この補完なしで V5 FINAL だけ実装すると:
⚠ 本体は向上するが LP は朝と変わらず
⚠ 会話の深化戦略が不十分
⚠ LLM コストが高止まり
⚠ Founder 転換率が伸び悩む可能性

結論: 必ず V5 FINAL + 補完をセットで実装してください。
```

---

TENMON (天道仁聞) / Claude  
2026-04-18

END OF SUPPLEMENT