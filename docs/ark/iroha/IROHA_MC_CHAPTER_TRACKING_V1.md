# CARD-IROHA-MC-CHAPTER-TRACKING-V1: いろは章別 KPI tracking 設計 (OBSERVE only)

- **カード種別**: OBSERVE / 設計のみ (実装は別カード)
- **規律**: READ-ONLY only / Python3 stdlib only / DB write 禁止 / Notion write 禁止 / API 改修禁止 / MC bearer token 不使用
- **生成 verdict**: **YELLOW** (critical=0, warn=2, info=6)
- **観測実行**: 1 回 (2026-04-26 06:30 UTC, sqlite3 read-only mode)

---

## 1. 背景

### 1-1. 親カードと唯一の warn

`CARD-IROHA-MC-CONNECTION-AUDIT-V1` (commit `8bb4a5d3`) で **YELLOW** が出た唯一の根拠は、
`prompt_trace_summary_24h.iroha` が **単一の `iroha` 合計 chars (24h avg = 766.73)** しか露出しておらず、
TENMON 想定の 5 章 (47ji / ongi / seimei / shisei / hokekyo) のどれが
**どれだけ会話に効いているか** が分解できないことだった。

### 1-2. 本カードの目的

実装変更を一切せず、READ-ONLY だけで以下を確定する:

1. iroha 関連 DB schema (`iroha_units` / `iroha_khs_alignment` / `iroha_actionpacks`) に章分類 column はあるか
2. `iroha_kotodama_hisho.json` 1037 paragraphs に章メタデータはあるか
3. `irohaKotodamaLoader.ts` に既に章分類実装はあるか
4. 既存 / TENMON 5 章 / 既存 6 理 のどれが章別 KPI として使えるか (カバレッジ推定)
5. `buildIrohaInjection` / `queryIrohaByUserText` / `checkIrohaGrounding` の戻り値拡張で
   後方互換を保ちつつ章別 chars を出すための最小 diff
6. MC intelligence (`PromptTraceClauseLengthsV1` + `buildPromptTraceSummary24hV1`) への章別 keys 追加最小 diff
7. `decisionFrame.ku.irohaGrounding` への章接続案
8. 旧 VPS `automation/out/` への章別 audit JSON 保存スキーマ
9. 次カード (実装) の前提条件と推奨案

### 1-3. 参照済み所見

- IROHA SOURCE OBSERVE: L1〜L5 connected 100%
- IROHA NOTION STRUCTURE COMPLEMENT: 5 章未掲示確認 / Notion write 保留
- IROHA-MC-CONNECTION-AUDIT-V1: PASS (commit `8bb4a5d3`, verdict YELLOW)
  - `slot_chat_binding.iroha = __irohaClause` ✓
  - 24h iroha clause: n=244, min=342, max=1436, avg=766.73 chars
  - chat.ts iroha hits=24 / guest.ts iroha hits=11
  - decisionFrame.ku.irohaGrounding: dict ✓
- 唯一の warn: chapter_tracking missing → 本カードの起点

---

## 2. 章カテゴリ 5 章の確定

TENMON 提示の構造軸 5 章:

| ID | 名称 | 概要 |
|----|------|------|
| `47ji`    | 47 字構造  | いろは 47 文字 / 五十音 / 京の字 議論 |
| `ongi`    | 音義表     | 音義 / 音意 / 音律 / 響き / 声韻 |
| `seimei`  | 生命観     | いのち / 魂 / 誕生 / 生きる |
| `shisei`  | 死生観     | 死生 / 別れ / 転化 / 再生 / 輪廻 / 涅槃 / 往生 |
| `hokekyo` | 法華経対応 | 法華 / 妙法 / 蓮華 / 如来寿量 / 観音 / 普門品 |

KPI key 名は `iroha_47ji_chars` / `iroha_ongi_chars` / `iroha_seimei_chars` / `iroha_shisei_chars` / `iroha_hokekyo_chars` を採用予定。

**重大な観測**: `irohaKotodamaLoader.ts` には **既に別の章分類 (思想史軸 7 章)** が実装されている (§ 5 参照)。
本カードはこの 2 軸の併存設計 (案 Y) を主推奨とする。

---

## 3. iroha_units 21 行の章分類可能性

### 3-1. schema (sqlite3 read-only)

```text
PRAGMA table_info(iroha_units);
=> 0|unitId|TEXT|0||1            (PK)
   1|doc|TEXT|1||0
   2|pdfPage|INTEGER|0||0
   3|anchor|TEXT|0||0
   4|kw|TEXT|0||0                 (keyword 候補)
   5|quote|TEXT|1||0              (引用本文 - OCR 出力で文字配列が崩れている)
   6|quoteHash|TEXT|1||0
   7|status|TEXT|1|'UNRESOLVED'|0
   8|createdAt|TEXT|1|''|0

SELECT COUNT(*) FROM iroha_units => 21
```

### 3-2. 各 column の章分類適性

| column     | 章分類に使えるか | 理由 |
|------------|------------------|------|
| `unitId`   | △                | `IROHA.P{page}.{kind}.{hash}` 形式: page (P2〜P6) と kind (ENTRY/DEF/U/SUP/N) が抽出可能だが、page と章は 1:1 ではない |
| `doc`      | ×                | ほぼ全件 `DOCXxxPDF:いろは最終原稿.pdf` の単一値 (18/21) |
| `pdfPage`  | △                | 9〜124 / 10 distinct ページ。章境界の手動マッピングが必要 |
| `anchor`   | △                | 詳細未確認、有用な可能性あり (今後の調査余地) |
| `kw`       | ◯ (低密度)       | キーワード文字列、章分類 regex の候補 |
| `quote`    | ×                | OCR 由来で文字配列が壊れており、章キーワード regex が機能しない |
| `quoteHash`| ×                | hash |
| `status`   | ×                | 全件 `UNRESOLVED` の管理ステータス |
| `createdAt`| ×                | timestamp |

→ **章分類に直接使える column は無い**。これが本カードの 1 つ目の `warn`。

### 3-3. 対処方針

**iroha_units 単体では章分類できない** ため、以下のいずれかが必要:

| 案 | 概要 | コスト | 章対応の精度 |
|----|------|--------|--------------|
| A | **`iroha_kotodama_hisho.json` の content[1037] にキーワード regex** を当て、`paragraph.chapter` を `irohaKotodamaLoader.ts` 内で計算する。`iroha_units` は対応 paragraph index を hash → idx で逆引きする補助マップを作る | 低 | 中 (regex 精度依存) |
| B | 補助テーブル `iroha_chapter_map (iroha_unit_id, chapter, confidence)` を新設し、初期 21 行は手動投入 | 中 | 高 (人手) |
| C | iroha_kotodama_hisho.json に章 key を追加投入 (正典改変) | 中〜高 | 高 (但しデータ責任が増える) |

**現状の `irohaKotodamaLoader.ts` は既に案 A を別軸 (思想史 7 章) で実装済**:
`paragraph.chapter` 値は `CHAPTER_KEYWORDS` regex で `detectChapter(text)` 算出 → 1037 paragraphs に既に章 tag が付いている。
TENMON 5 章を追加するのは案 A の **辞書追加** だけで済む可能性が高い。

---

## 4. iroha_khs_alignment 10 件の hokekyo KPI 利用可否

### 4-1. schema

```text
PRAGMA table_info(iroha_khs_alignment);
=> alignId(PK) / irohaUnitId / khsLawKey / relation / score / note / createdAt
COUNT(*) = 10
```

### 4-2. 内訳 (read-only 集計)

| 項目 | 値 |
|------|----|
| 行数 | 10 |
| distinct `khsLawKey` | 8 |
| distinct `irohaUnitId` | 3 (`IROHA.U.c5055cf0` が 7 件占有, `IROHA.DEF.65801a7d` 1件, `IROHA.DEF.8c26b936` 1件) |
| `relation` 分布 | `SUPPORTS_VERIFIED` 9 件 / `SEED` 1 件 |

### 4-3. khsLawKey の正体と hokekyo KPI への適性

- 全 `khsLawKey` の prefix は `KHSL:LAW:KHSU:41c0bff9cfb8:p0:` (= 言霊秘書 [hisho] の law key hash)
- すなわちこのテーブルは「**いろは × 言霊秘書 (hisho)** 対応表」であって、「いろは × **法華経**」ではない
- `note` 列を覗くこともできるが、本カードの read-only 観測では本文展開を避ける
- → **hokekyo (法華経対応) の KPI ソースとしては直接転用できない**

### 4-4. 別の hokekyo KPI 候補

- iroha_kotodama_hisho.json content[1037] への `hokekyo` keyword regex (本カード § 7 で coverage 検証済 = **2 件のみ**)
- → 法華経対応はキーワード辞書を相当強化する必要がある (§11 案 A の弱点)

---

## 5. queryIrohaByUserText の戻り値拡張案

### 5-1. 現状 (`api/src/core/irohaKotodamaLoader.ts:145-181`)

```ts
export type IrohaParagraph = {
  index: number;
  text: string;
  chapter: string | null;          // 既存 7 章 (思想史軸) のうち 1 つ
  soundAnchors: string[];
  principleTags: string[];         // 既存 6 理 (構造軸) の複数タグ
  healthRelated: boolean;
};

export function queryIrohaByUserText(
  userText: string,
  maxParagraphs = 3
): IrohaParagraph[]
```

つまり **章 (chapter) と 理 (principleTags) は既に paragraph に貼られて返ってきている**。
chat.ts はこの戻り値をそのまま `buildIrohaInjection(__irohaHits, 1500)` へ渡しており、
`paragraph.chapter` を独自に集計したり MC へ伝搬してはいない。

### 5-2. 既存 7 章の正体 (loader 内 CHAPTER_KEYWORDS)

```text
第一章_普遍叡智       (空海/天地創造/普遍叡智)
第二章_イゑす          (イエス/命の普遍的展開/天之御中主)
第三章_モせす          (モーセ/律法と境界/結び)
第四章_トカナクテシス  (咎なくて死す/解組と再発)
第五章_聖書的誤解      (聖書的誤解/贖罪の悲劇)
第六章_空海の霊的役割  (空海/天照/遍照金剛)
第七章_結論            (死を悲劇ではなく/再生と光明の扉)
```

これは **思想史軸** で、TENMON 5 章 (構造軸) とは概念が異なる。

### 5-3. TENMON 5 章を加える最小 diff (推奨 = 案 Y)

```ts
export type IrohaParagraph = {
  index: number;
  text: string;
  chapter: string | null;          // 既存 7 章 (維持)
  chapterTagsV5?: string[];        // ← 新規 optional, TENMON 5 章 (multi-tag)
  soundAnchors: string[];
  principleTags: string[];
  healthRelated: boolean;
};

const CHAPTER_KEYWORDS_V5: Record<string, RegExp> = {
  "47ji":    /四十七|47字|47文字|五十音|いろは47|ヰ|ヱ|京の字/,
  "ongi":    /音義|音意|音響|響き|霊響|音灵|声韻|音律/,
  "seimei":  /生命|いのち|生きる|誕生|命の|魂/,
  "shisei":  /死生|死ぬ|別れ|終わり|転化|再生|輪廻|涅槃|往生/,
  "hokekyo": /法華|妙法|蓮華|如来寿量|観音|普門品|薬王|常不軽/,
};

function detectChapterTagsV5(text: string): string[] {
  const hit: string[] = [];
  for (const [k, re] of Object.entries(CHAPTER_KEYWORDS_V5)) {
    if (re.test(text)) hit.push(k);
  }
  return hit;
}
```

`queryIrohaByUserText` のシグネチャは **変更不要**: 戻り値は引き続き `IrohaParagraph[]`、
新フィールドは optional なので既存呼出は壊れない。

推定 diff: `irohaKotodamaLoader.ts` で **+12 行** (V5 keyword 5 + helper 関数 + paragraph タグ付け)。

---

## 6. buildIrohaInjection の章別 chars 計測案

### 6-1. 現状 (`api/src/core/irohaKotodamaLoader.ts:187-217`)

```ts
export function buildIrohaInjection(
  paragraphs: IrohaParagraph[],
  maxCharsPerParagraph = 300
): string
```

戻り値は **string のみ** (LLM の system prompt に直接結合される)。
内部では `[${p.chapter}]` と `[理: ${p.principleTags.join("・")}]` をテキスト中に埋め込んでいる
(LLM には章名が届くが、ホスト側はメタデータとして取り出していない)。

### 6-2. 章別 chars 計測の最小 diff (後方互換)

`buildIrohaInjection` の signature は **変更しない**。代わりに同じファイルで helper を **追加** export:

```ts
export type IrohaInjectionByChapterV1 = {
  byChapterV5: Record<string, { chars: number; hits: number }>;
  byChapterV7: Record<string, { chars: number; hits: number }>;
  byPrinciple: Record<string, { chars: number; hits: number }>;
  totalChars: number;
};

export function summarizeIrohaInjectionByChapterV1(
  paragraphs: IrohaParagraph[],
  maxCharsPerParagraph = 300
): IrohaInjectionByChapterV1
```

呼出側 (chat.ts) は `buildIrohaInjection` の戻り値 (string) を引き続き使い、
別途 `summarizeIrohaInjectionByChapterV1(__irohaHits)` を呼んで MC fire payload に渡す。

推定 diff: **+8 行** (helper 関数の追加)。

### 6-3. cap 維持

各 paragraph は `slice(0, maxCharsPerParagraph)` で 300 字に切られる (chat.ts は 1500 字、guest.ts は 800 字)。
helper も同じ切り方で集計するため、章別 chars の合計は LLM に届く実 chars と一致する。

---

## 7. prompt_trace 追加 keys (最小 diff)

### 7-1. 現状 (`api/src/mc/fire/intelligenceFireTracker.ts:32-51`)

```ts
export type PromptTraceClauseLengthsV1 = {
  khs_constitution: number;
  kotodama_constitution_v1?: number;
  kotodama_constitution_memory?: number;
  kotodama_hisho: number;
  kotodama_one_sound: number;
  kotodama_genten: number;
  unified_sound: number;
  iroha: number;                     // ← 単一 chars
  amaterasu: number;
  truth_layer: number;
  meaning_arbitration: number;
  katakamuna_audit: number;
  katakamuna_lineage: number;
  katakamuna_misread_guard: number;
  khs_root_fractal: number;
};
```

### 7-2. 追加案 (optional / 後方互換)

```ts
export type PromptTraceClauseLengthsV1 = {
  // ... 既存全 fields 維持 ...
  iroha: number;                                                  // 既存合計、維持
  iroha_chapters?: Record<"47ji" | "ongi" | "seimei" | "shisei" | "hokekyo", number>;  // 新規
  iroha_chapter_hits?: Record<string, number>;                    // 新規 (hits per chapter)
};
```

### 7-3. chat.ts:2580 周辺の patch 想定

```ts
// 既存
clause_lengths: {
  // ...
  iroha: (__irohaClause ?? "").length,
  // ...
}

// 追加 (chapter summary を直前に算出)
const __irohaChapV1 = summarizeIrohaInjectionByChapterV1(__irohaHits, 1500);
// ...
clause_lengths: {
  // ...
  iroha: (__irohaClause ?? "").length,
  iroha_chapters: {
    "47ji": __irohaChapV1.byChapterV5["47ji"]?.chars ?? 0,
    "ongi": __irohaChapV1.byChapterV5["ongi"]?.chars ?? 0,
    "seimei": __irohaChapV1.byChapterV5["seimei"]?.chars ?? 0,
    "shisei": __irohaChapV1.byChapterV5["shisei"]?.chars ?? 0,
    "hokekyo": __irohaChapV1.byChapterV5["hokekyo"]?.chars ?? 0,
  },
  iroha_chapter_hits: Object.fromEntries(
    Object.entries(__irohaChapV1.byChapterV5).map(([k, v]) => [k, v.hits])
  ),
  // ...
}
```

推定 diff: **+5 行** (chat.ts 1 か所 + 型 1 行)。

`guest.ts` は現状 prompt_trace を書かないので、本実装フェーズで guest 経路の章別追跡は対象外。
別カードで guest 用の軽量 trace を追加する余地あり (本カードでは設計のみ)。

---

## 8. MC intelligence 追加 keys (最小 diff)

### 8-1. 現状 (`buildPromptTraceSummary24hV1`, `intelligenceFireTracker.ts:195-`)

```ts
export type PromptTraceSummary24hV1 = {
  sample_size: number;
  route_reasons: string[];
  providers: string[];
  avg_clause_lengths: PromptTraceClauseLengthsV1;
  avg_prompt_total_length: number;
  avg_response_length: number;
  avg_user_message_length: number;
  note: string;
};
```

`avg_clause_lengths.iroha` は単一 chars の 24h 平均。

### 8-2. 追加案

`PromptTraceClauseLengthsV1` に optional fields が増えるだけで型は自動連動する (struct mirror)。
集約関数 `buildPromptTraceSummary24hV1` 内に章別集計を追加:

```ts
// 追加 helper
const z5 = (key: "47ji" | "ongi" | "seimei" | "shisei" | "hokekyo") =>
  Math.round(
    traces.reduce((s, t) => s + (t.clause_lengths.iroha_chapters?.[key] ?? 0), 0) /
    Math.max(traces.length, 1)
  );

avg_clause_lengths: {
  // ... 既存 ...
  iroha: z((t) => t.clause_lengths.iroha),
  iroha_chapters: {
    "47ji":    z5("47ji"),
    "ongi":    z5("ongi"),
    "seimei":  z5("seimei"),
    "shisei":  z5("shisei"),
    "hokekyo": z5("hokekyo"),
  },
}
```

### 8-3. slot_chat_binding への章 alias 追加 (任意)

```ts
export const INTELLIGENCE_FIRE_SLOT_CHAT_BINDING_V1 = {
  // ... 既存 ...
  iroha: { chat_binding: "__irohaClause", module_file: "core/irohaKotodamaLoader.ts" },
  iroha_chapters: {
    chat_binding: "__irohaChapV1.byChapterV5",
    module_file: "core/irohaKotodamaLoader.ts (summarizeIrohaInjectionByChapterV1)",
  },
};
```

推定 diff: **+15 行** (集約 helper + 型修飾 + binding alias)。

---

## 9. decisionFrame.ku.irohaGrounding と章分類の接続案

### 9-1. 現状 (`api/src/core/satoriEnforcement.ts:317-323` + `chat.ts:893-908`)

```ts
export interface IrohaGroundingResult {
  passed: boolean;
  irohaSound: { found: boolean; sounds: string[] };
  actionPattern: { found: boolean; pattern: string | null };
  amaterasuAxis: { found: boolean; axis: string | null };
  score: number;          // 0..3
}

// chat.ts:899-906 で
df.ku.irohaGrounding = {
  passed, score,
  sounds: grounding.irohaSound.sounds.slice(0, 3),
  actionPattern: grounding.actionPattern.pattern,
  amaterasuAxis: grounding.amaterasuAxis.axis,
};
```

guest.ts は `irohaGroundingScore` (scalar) のみ。

### 9-2. 章分類の接続案

```ts
export interface IrohaGroundingResult {
  passed: boolean;
  irohaSound: { found: boolean; sounds: string[] };
  actionPattern: { found: boolean; pattern: string | null };
  amaterasuAxis: { found: boolean; axis: string | null };
  score: number;
  matchedChaptersV5?: string[];   // ← 新規 optional
}

// 関数末尾 (responseText に対する V5 keyword 検出)
const matchedChaptersV5: string[] = [];
for (const [k, re] of Object.entries(CHAPTER_KEYWORDS_V5)) {
  if (re.test(responseText)) matchedChaptersV5.push(k);
}
return { passed, irohaSound, actionPattern, amaterasuAxis, score,
         matchedChaptersV5 };

// chat.ts:899 で pass-through
df.ku.irohaGrounding = {
  passed, score, sounds: ..., actionPattern: ..., amaterasuAxis: ...,
  matchedChapters: grounding.matchedChaptersV5,
};
```

### 9-3. probe での観測

`CARD-IROHA-MC-CONNECTION-AUDIT-V1` で実施した chat probe と同形式で:

```text
decisionFrame.ku.irohaGrounding.matchedChapters: ["47ji", "hokekyo"]
```

が取れるようになり、「どの章で grounded したか」が監査可能になる。

推定 diff: **+5 行** (`satoriEnforcement.ts`) + **+1 行** (`chat.ts:899` pass-through)。

---

## 10. 旧 VPS automation/out 保存 schema

### 10-1. 保存先

```
<TENMON_DOCTOR_OUT_DIR>/iroha_mc_chapter_tracking_observe_latest.json
<TENMON_DOCTOR_OUT_DIR>/iroha_mc_chapter_tracking_observe_latest.md
```

旧 VPS では `/opt/tenmon-automation/out/` に解決される (前カード以来の標準)。
本カードでは write しない。実装カードで自動化する。

### 10-2. JSON schema (本カードで合意確定)

```jsonc
{
  "audit_version": "v1.0.0-chapter-tracking",
  "card": "CARD-IROHA-MC-CHAPTER-TRACKING-V1",
  "generated_at": "ISO8601",
  "verdict": "GREEN|YELLOW|RED",
  "summary": { "critical": 0, "warn": 0, "info": 0 },

  "db_schema": {
    "iroha_units":          { "row_count": 21, "columns": [...] },
    "iroha_khs_alignment":  { "row_count": 10, "distinct_khs_law_keys": 8 },
    "iroha_actionpacks":    { "row_count": 1 }
  },

  "canon_structure": {
    "primary": "shared/kotodama/iroha_kotodama_hisho.json",
    "top_level_keys": ["title", "total_paragraphs", "content"],
    "chapter_field_in_root": false,
    "content_len": 1037,
    "content_avg_len": 89.2
  },

  "existing_impl": {
    "loader_path": "api/src/core/irohaKotodamaLoader.ts",
    "iroha_paragraph_type_fields": ["index", "text", "chapter", "soundAnchors", "principleTags", "healthRelated"],
    "build_iroha_injection_returns_string": true,
    "build_iroha_injection_uses_chapter_tag": true,
    "chapter_keywords_count": 7,
    "principle_keywords_count": 6
  },

  "chapter_coverage": {
    "existing_7chap":      { "coverage_pct": 20.06, "counts": { ... } },
    "existing_6principle": { "coverage_pct": 53.33, "counts": { ... } },
    "tenmon_5chap":        { "coverage_pct": 25.65, "counts": { ... } }
  },

  "iroha_chapter_trace": {
    "iroha_total_chars": 0,
    "iroha_47ji_chars": 0,
    "iroha_ongi_chars": 0,
    "iroha_seimei_chars": 0,
    "iroha_shisei_chars": 0,
    "iroha_hokekyo_chars": 0,
    "iroha_chapter_hits": { "47ji": 0, "ongi": 0, "seimei": 0, "shisei": 0, "hokekyo": 0 }
  },

  "iroha_24h_chapter_trace": {
    "iroha_47ji_avg":    null,
    "iroha_ongi_avg":    null,
    "iroha_seimei_avg":  null,
    "iroha_shisei_avg":  null,
    "iroha_hokekyo_avg": null,
    "n_samples": 0
  },

  "diff_estimate": {
    "approach_y_two_axis": {
      "buildIrohaInjection_helper":  8,
      "loader_chapter_keywords_v5": 12,
      "prompt_trace_chat_ts":        5,
      "mc_intelligence_aggregator": 15,
      "iroha_grounding":             5,
      "df_ku_passthrough":           1,
      "total":                      46
    }
  },

  "card_candidates": [
    "CARD-IROHA-MC-CHAPTER-TRACKING-IMPLEMENT-V1",
    "CARD-IROHA-MEMORY-PROJECTION-AUDIT-V1",
    "CARD-IROHA-NOTION-STRUCTURE-WRITE-V1",
    "CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1"
  ],
  "findings": []
}
```

### 10-3. 同居設計

`doctor_v2_*.json` / `feedback_*.json` / `iroha_mc_connection_audit_*.json` と同じディレクトリに置く。
prefix `iroha_mc_chapter_tracking_observe_*` で固定。

---

## 11. 章分類アルゴリズム案 A / B / C と推奨

### 11-1. カバレッジ実測 (本観測スクリプトの結果, content[1037] paragraphs)

| 方式 | classified | unclassified | multi_match | coverage |
|------|------------|--------------|-------------|----------|
| 既存 7 章 (思想史軸)             | 208  | 829 | 11  | **20.06%** |
| 既存 6 理 (PRINCIPLE_KEYWORDS)  | 553  | 484 | 226 | **53.33%** |
| TENMON 5 章 (本カード初期 keyword) | 266  | 771 | 36  | **25.65%** |

TENMON 5 章の章別件数 (初期 keyword):
- `47ji` 29 / `ongi` 13 / `seimei` 191 / `shisei` 68 / **`hokekyo` 2** ← 極少

→ `hokekyo` のキーワード辞書は **強化必須** (法華経関連語をかなり狭く絞っているため)。

### 11-2. 案 A: keyword regex (既存実装の延長)

```python
CHAPTER_KEYWORDS_V5 = {
  "47ji":    r"四十七|47字|47文字|五十音|いろは47|ヰ|ヱ|京の字",
  "ongi":    r"音義|音意|音響|響き|霊響|音灵|声韻|音律",
  "seimei":  r"生命|いのち|生きる|誕生|命の|魂",
  "shisei":  r"死生|死ぬ|別れ|終わり|転化|再生|輪廻|涅槃|往生",
  "hokekyo": r"法華|妙法|蓮華|如来寿量|観音|普門品|薬王|常不軽",
}
```

メリット: 最短 / 既存実装と同型 / 即適用 / 後方互換 100% / カバレッジ 25.65% (初期辞書) → 強化で 50% 級に届く見込み
デメリット: hokekyo の coverage が薄い / 重複分類 (multi_match=36) / 辞書精度に依存

### 11-3. 案 B: 補助テーブル `iroha_chapter_map` (永続化)

```sql
CREATE TABLE iroha_chapter_map (
  iroha_unit_id TEXT NOT NULL,
  chapter TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  PRIMARY KEY (iroha_unit_id, chapter)
);
```

メリット: 多次元タグを正確に表現 / 重み付け可 / 永続化
デメリット: migration が必要 (DB write を伴う実装フェーズで処理) / 初期投入は手作業 or 案 A の結果転写

### 11-4. 案 C: 正典 JSON (`iroha_kotodama_hisho.json`) に章 key 追加投入

メリット: ground truth 化
デメリット: 正典改変扱いになる (TENMON 禁止項目: `iroha_kotodama_hisho.json の改変`) → **採用不可**

### 11-5. 推奨

**案 A を主軸**として **既存 7 章と TENMON 5 章を併存** (= **approach Y, two-axis**) する。

- 既存 7 章 (思想史軸): 既に運用に乗っている / paragraph に貼られている / LLM 注入時の `[chapter]` tag に使われている → **そのまま維持**
- TENMON 5 章 (構造軸): 新規追加 / `chapterTagsV5: string[]` (multi-tag) / MC KPI へ集計

将来的に案 B (補助テーブル) は memory_units 連携カードで永続化する余地を残す (本カードでは設計のみ)。

---

## 12. 次カード候補 A〜D + TENMON 裁定用まとめ

### 12-1. 候補

| # | カード | 前提 | 効果 | 推定コスト | 推奨順 |
|---|--------|------|------|------------|--------|
| **A** | **CARD-IROHA-MC-CHAPTER-TRACKING-IMPLEMENT-V1** | 本カード PASS | 章別 KPI が MC `prompt_trace_summary_24h.iroha_chapters` に乗る / decisionFrame.ku.irohaGrounding.matchedChapters が出る | **+46 行 (推定)**, 中 | **1** |
| B | CARD-IROHA-MEMORY-PROJECTION-AUDIT-V1 | 並行可 | memory_units iroha 63 件 / 32 scope_id の projection 適用率の可視化 (READ-ONLY 観測) | 低 | 2 (A 並行可) |
| C | CARD-IROHA-NOTION-STRUCTURE-WRITE-V1 (保留解除候補) | A の後 | Notion 解析班ページに 5 章地図を append-only で追記 | Notion write 中、初発 | 3 (A 後) |
| D | CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1 | (前提なし) | 断捨離資料群 source observe / tone policy 前段 / main-line | 低 | 4 (常駐候補) |

### 12-2. 推奨ルート

```
本カード (V1 設計) → A: IMPLEMENT → B: MEMORY-PROJECTION-AUDIT
                                  ↘ C: NOTION-STRUCTURE-WRITE (保留解除)
                                  ↘ D: DANSHARI-CORPUS-SOURCE-OBSERVE
```

A を最優先とする根拠:
1. 設計は本カードで確定済み / 推定 diff 46 行 (+5 ファイル変更) / 後方互換 100%
2. 既存実装 (`paragraph.chapter` / `chapterIndex` / `principleIndex`) の延長で済む
3. B の memory projection / C の Notion write のいずれも、章別 KPI が立った後の方が情報密度が高い
4. 本カードの warn 2 件のうち 1 件 (TENMON 5 章 coverage 25.65%) は実装時のキーワード辞書強化で 50% 級まで引き上げ可能

### 12-3. 1 枚要約

| 観点 | 結論 |
|------|------|
| 既存 章実装 | あり (`irohaKotodamaLoader.ts` `CHAPTER_KEYWORDS` 7 章 + `PRINCIPLE_KEYWORDS` 6 理) |
| iroha_units の章 column | 無し (warn) |
| iroha_kotodama_hisho.json の章 key | 無し (paragraph は flat string list) |
| iroha_khs_alignment 10 件 | 言霊秘書対応 (法華経対応ではない) |
| 既存 7 章 coverage | 20.06% (思想史軸、第三章モせすに偏重) |
| 既存 6 理 coverage | **53.33%** (構造軸、最高解像度) |
| TENMON 5 章 coverage (初期辞書) | 25.65% (warn: <50%, hokekyo 2 件のみ) |
| 推奨設計 | **approach Y (両軸併存): 既存 7 章維持 + TENMON 5 章を `chapterTagsV5` で追加** |
| 推定 diff | **+46 行 / 5 ファイル / 後方互換 100%** |
| 推奨次カード | **A: CARD-IROHA-MC-CHAPTER-TRACKING-IMPLEMENT-V1** |
| 副作用 | DB write 0 / Notion write 0 / 本番 API 改修 0 / 旧 VPS 干渉 0 |
| verdict | **YELLOW** (warn=2, info=6) |

---

## Appendix A: 観測スクリプトと出力

### A1. 任意スクリプト

`automation/tenmon_iroha_mc_chapter_tracking_observe_v1.py`

- Python3 stdlib only (json / sqlite3 / re / pathlib / argparse / collections / datetime)
- `self_check()` で危険コマンド (`rm` + ` -rf` 等、文字列分離で実装) を起動拒否
- HTTP 不使用 (本カードでは前カード IROHA-MC-CONNECTION-AUDIT-V1 の HTTP 観測値を再利用しない設計; 観測対象は静的データのみ)
- sqlite3 は **`file:.../kokuzo.sqlite?mode=ro` URI mode** で開く
- 出力は最後に **2 ファイル一括 write** (atomic)
- 1 領域の失敗で全体停止しない (例外を握る)

### A2. 環境変数 (read-only)

| 変数 | 既定 |
|------|------|
| `TENMON_DOCTOR_REPO_ROOT` | `/opt/tenmon-ark-repo` |
| `TENMON_DOCTOR_OUT_DIR`   | `<REPO_ROOT>/automation/out` |
| `TENMON_DOCTOR_DATA_DIR`  | `/opt/tenmon-ark-data` |

将来 IMPL カードでの env 候補 (本カードでは設計のみ):
- `TENMON_IROHA_CHAPTER_KEYWORDS_PATH` (章 keyword 辞書を外出しする場合)

### A3. 実行コマンド

```bash
cd /opt/tenmon-ark-repo
python3 automation/tenmon_iroha_mc_chapter_tracking_observe_v1.py observe
# → automation/out/iroha_mc_chapter_tracking_observe_latest.json
# → automation/out/iroha_mc_chapter_tracking_observe_latest.md
```

### A4. 1 回実行結果

```
verdict=YELLOW crit=0 warn=2 info=6
coverage existing_7=20.06% existing_6=53.33% tenmon_5=25.65%
recommended approach: approach_y_two_axis
estimated_diff_lines: 46
```

### A5. プライバシー

- 正典本文 / 引用本文は docs / json / md のいずれにも展開しない (件数 / column 名 / カバレッジ % のみ)
- token / API key / SSH 鍵パス / IP は code / docs / commit / log のいずれにも含めない
- `iroha_units.quote` は OCR 由来で本文として有用ではないため、章分類の検証には使わず内容も記録しない
- DB は read-only URI mode (`mode=ro`) でのみ開く

---

## End of CARD-IROHA-MC-CHAPTER-TRACKING-V1
