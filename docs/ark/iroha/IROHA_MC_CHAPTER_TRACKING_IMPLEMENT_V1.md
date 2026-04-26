# CARD-IROHA-MC-CHAPTER-TRACKING-IMPLEMENT-V1: いろは章別 KPI tracking 実装記録

- **カード種別**: 実装小カード (最小 diff / 後方互換 100% / shared 新規作成なし / restart なし)
- **規律**: 4 ファイル以内 / `+60` 行以内 / `buildIrohaInjection` signature 不変 / 既存 7 章維持
- **生成 verdict (期待)**: **GREEN** (critical=0, warn=0)
- **commit 範囲**: API source + docs のみ (deploy 別カードへ持ち越し)

---

## 1. 背景

`CARD-IROHA-MC-CHAPTER-TRACKING-V1` (commit `9a04ebc7`) で確定した設計を最小 diff で実装する。

設計の柱 (前カード § 11 推奨):
- **approach Y (two-axis 併存)**: 既存 7 章 (思想史軸, `paragraph.chapter`) を維持しつつ、TENMON 5 章 (構造軸) を `paragraph.chapterTagsV5: string[]` (multi-tag) で並列追加
- 実装範囲は `irohaKotodamaLoader.ts` / `chat.ts` / `intelligenceFireTracker.ts` の 3 ファイル
- 推定差分 +46 行 / 後方互換 100%

TENMON 補足 (本カード冒頭):
- `shared/iroha/chapterTagsV5.ts` は **新規作成しない** → `CHAPTER_KEYWORDS_V5` は `irohaKotodamaLoader.ts` 内 **private const** として保持
- 4 ファイル以内 / +60 行以内 を厳守

---

## 2. 設計方針 (再掲)

| 軸 | 既存 / 新規 | 単一 / 複数 | source |
|----|-------------|--------------|--------|
| 思想史軸 (普遍叡智 / イゑす / モせす / トカナクテシス / 聖書誤解 / 空海 / 結論) | 既存 (維持) | `paragraph.chapter: string \| null` | `CHAPTER_KEYWORDS` (regex) |
| 構造軸 (47ji / ongi / seimei / shisei / hokekyo) | **新規** | `paragraph.chapterTagsV5?: string[]` (multi-tag) | `CHAPTER_KEYWORDS_V5` (string array, private const) |
| 理 (水火 / 結び / 生死 / 発顕 / 浄化 / 凝固) | 既存 (維持) | `paragraph.principleTags: string[]` | `PRINCIPLE_KEYWORDS` (regex) |

3 軸が paragraph に並列 tag されるが、既存軸 2 つは **意味を変えない**。

---

## 3. 実装変更ファイル一覧 (3 ファイル, +57 行)

| ファイル | +行 | -行 | 変更概要 |
|---------|-----|-----|----------|
| `api/src/core/irohaKotodamaLoader.ts`        | +49 | 0  | private const 辞書 + IrohaParagraph 型拡張 + classify export + autotag + summarize export |
| `api/src/mc/fire/intelligenceFireTracker.ts` | +3  | 0  | PromptTraceClauseLengthsV1 拡張 + 24h summary 集計 |
| `api/src/routes/chat.ts`                     | +6  | -1 | import 拡張 + outer-scope summary + clause_lengths に章別 keys |
| **合計**                                      | **+58** | **-1** (実 net +57) | 3 ファイル / 4 ファイル以内 ✓ / +60 行以内 ✓ |

`docs/ark/iroha/IROHA_MC_CHAPTER_TRACKING_IMPLEMENT_V1.md` (本ファイル) は別途追加。

`shared/iroha/chapterTagsV5.ts` は **作成していない**。

---

## 4. CHAPTER_KEYWORDS_V5 を private const として置く理由

TENMON 補足の通り:

1. **最小 diff**: 新規ファイル作成によるパス解決・build 影響を回避 (3 ファイル / +57 行で完了)
2. **shared/ の依存複雑化を避ける**: `shared/kotodama/` 配下の `iroha_kotodama_hisho.json` 以外は触らない
3. **rollback 容易性**: 1 ファイル削除で済まず、import 経路の戻しが必要にならないように
4. **影響半径**: 5 章 keyword 辞書を loader だけが使う限り、loader 1 ファイルで完結する
5. **将来 shared 化**: 後続カードで他 module からの参照が必要になった場合のみ
   `CARD-IROHA-CHAPTER-KEYWORDS-SHARE-V1` で shared 化する

---

## 5. IrohaParagraph 型拡張

```ts
export type IrohaParagraph = {
  index: number;
  text: string;
  chapter: string | null;          // 既存 (思想史軸, 維持)
  soundAnchors: string[];          // 既存
  principleTags: string[];         // 既存 (構造軸 6 理, 維持)
  healthRelated: boolean;          // 既存
  chapterTagsV5?: string[];        // 新規 (構造軸 5 章, optional, multi-tag)
};
```

新フィールドは **optional**。既存呼出は壊れない。

`loadIrohaKotodama` の paragraph 構築直後に一括付与:
```ts
for (const p of paragraphs) p.chapterTagsV5 = classifyIrohaChapterTagsV5(p);
```

---

## 6. classifyIrohaChapterTagsV5 仕様

```ts
export function classifyIrohaChapterTagsV5(paragraph: IrohaParagraph): string[]
```

- 入力: `IrohaParagraph` 1 件
- 出力: 該当する 5 章の ID 配列 (例: `["seimei", "shisei"]`)
- 判定対象: `paragraph.text + " " + paragraph.principleTags + " " + paragraph.chapter`
  (既存 7 章名や 6 理タグも一緒にマッチング素材にすることでヒット率を上げる)
- 1 paragraph が複数章にヒットしうる (multi-tag)
- 章 ID: `"47ji" / "ongi" / "seimei" / "shisei" / "hokekyo"` のいずれか

カバレッジ実測 (前カードの観測値):
- 1037 paragraphs に対し 25.65% (266 件) が分類
- 内訳: 47ji=29 / ongi=13 / seimei=191 / shisei=68 / **hokekyo=2** (warn 対象)
- 本カードでは hokekyo の keyword を 10 語に拡充: `法華 / 妙法 / 蓮華 / 如来寿量品 / 薬王菩薩 / 観世音菩薩 / 普門品 / 常不軽菩薩 / 舍利弗 / 提婆達多`

実機での章別 chars / hits 値は **DEPLOY 後の verify probe** (次カード) で確認する。

---

## 7. summarizeIrohaInjectionByChapterV1 仕様

```ts
export type IrohaChapterSummaryV1 = {
  totalChars: number;
  chapters: Record<string, { chars: number; hits: number }>;
};

export function summarizeIrohaInjectionByChapterV1(paragraphs: IrohaParagraph[]): IrohaChapterSummaryV1
```

- 入力: 注入対象の paragraph 配列 (chat.ts では `__irohaHits` = `queryIrohaByUserText(userText)` の戻り値)
- 出力: 5 章別 chars / hits + 総 chars
- chars = `paragraph.text.length` の和 (注入時の cap 1500 字を考慮しない素の長さ)
- hits = 章にヒットした paragraph の件数
- `paragraph.chapterTagsV5` が無い paragraph には `classifyIrohaChapterTagsV5` を fallback 適用 (Cache 不在時にも動く)

呼出側では `buildIrohaInjection(paragraphs, 1500)` の **隣** で並列に呼ぶ:
```ts
__irohaClause = buildIrohaInjection(__irohaHits, 1500);
__irohaChapterSummaryV1 = summarizeIrohaInjectionByChapterV1(__irohaHits);
```

`buildIrohaInjection` の signature は **一切変更しない** (既存呼出 4 箇所すべて互換):
- `api/src/core/irohaKotodamaLoader.ts:223` (定義)
- `api/src/mc/intelligence/mcContextInjectionEffectAuditV1.ts:121`
- `api/src/routes/chat.ts:1971`
- `api/src/routes/guest.ts:206`

---

## 8. prompt_trace 章別 key の追加箇所

`api/src/routes/chat.ts:2581` 周辺の NATURAL_GENERAL_LLM_TOP route の `clause_lengths`:

```ts
clause_lengths: {
  // ... 既存全 keys 維持 ...
  unified_sound: (__unifiedSoundClause ?? "").length,
  iroha: (__irohaClause ?? "").length,           // 既存 (合計 chars, 維持)
  iroha_chapters: __irohaChapterSummaryV1
    ? Object.fromEntries(Object.entries(__irohaChapterSummaryV1.chapters).map(([k, v]) => [k, v.chars]))
    : undefined,                                 // 新規 (5 章別 chars, optional)
  iroha_chapter_hits: __irohaChapterSummaryV1
    ? Object.fromEntries(Object.entries(__irohaChapterSummaryV1.chapters).map(([k, v]) => [k, v.hits]))
    : undefined,                                 // 新規 (5 章別 hits, optional)
  amaterasu: (__amaterasuClause ?? "").length,
  // ... 既存全 keys 維持 ...
}
```

新キー仕様:
- `iroha_chapters?: { "47ji": number; "ongi": number; "seimei": number; "shisei": number; "hokekyo": number }`
- `iroha_chapter_hits?: { "47ji": number; "ongi": number; "seimei": number; "shisei": number; "hokekyo": number }`
- `__irohaHits` が空 (= iroha 無注入) のとき **`undefined`** (JSON serialize 時には field が消える, JSONL の log volume を増やさない)

`guest.ts` は MC fire を呼ばないため、本カードでは触らない (前カードの観測通り)。

---

## 9. MC intelligence iroha_chapters 追加箇所

### 9-1. 型拡張 (`api/src/mc/fire/intelligenceFireTracker.ts:32-`)

```ts
export type PromptTraceClauseLengthsV1 = {
  // ... 既存全 fields 維持 ...
  iroha: number;                                       // 既存 (合計, 維持)
  iroha_chapters?: Record<string, number>;             // 新規 (optional)
  iroha_chapter_hits?: Record<string, number>;         // 新規 (optional)
  amaterasu: number;
  // ... 既存全 fields 維持 ...
};
```

### 9-2. 24h summary 集計 (`buildPromptTraceSummary24hV1`)

```ts
avg_clause_lengths: {
  // ... 既存全 fields 維持 ...
  iroha: z((t) => t.clause_lengths.iroha),       // 既存 (合計平均, 維持)
  iroha_chapters: Object.fromEntries(            // 新規 (5 章別平均)
    (["47ji", "ongi", "seimei", "shisei", "hokekyo"] as const)
      .map((k) => [k, z((t) => t.clause_lengths.iroha_chapters?.[k] ?? 0)])
  ),
  amaterasu: z((t) => t.clause_lengths.amaterasu),
  // ... 既存全 fields 維持 ...
}
```

`z()` は既存の avg helper (Round(sum/n))。
`iroha_chapters?.[k] ?? 0` で旧 trace (新キーなし) でも 0 として安全に集計される (後方互換)。

### 9-3. `iroha_chapter_hits` の 24h 集計について

24h 平均は `chars` に集中させ、`hits` の集計は本カードでは見送り。
理由: hits の平均は意味が薄い (sample あたり 0〜1 の値) → DEPLOY 後の probe で個別 trace を見る方が役立つ。

将来 `iroha_chapter_hits_total` (24h 合計) を追加する余地は残す (別カード)。

---

## 10. 後方互換性確認 (Acceptance 1〜10 対応)

| 観点 | 確認方法 | 結果 |
|------|----------|------|
| TypeScript build PASS | `cd api && npx tsc --noEmit` | ✓ (warning/error 0) |
| 既存テスト fail なし | `api/tests/` に jest/mocha なし、`tsc --noEmit` のみ | ✓ |
| `buildIrohaInjection` signature 不変 | grep `export function buildIrohaInjection` | `(paragraphs: IrohaParagraph[], maxCharsPerParagraph = 300): string` 維持 |
| `queryIrohaByUserText` signature 不変 | grep | `(userText: string, maxParagraphs = 3): IrohaParagraph[]` 維持 |
| 既存 `paragraph.chapter` (7 章) 削除なし | grep `chapter: string \| null` / `chapter: detectChapter(text)` | 両方残存 (line 15, 139) |
| `principleTags` 意味変更なし | grep `principleTags: string[]` / `principleTags: detectPrinciples(text)` | 両方残存 (line 17, 141) |
| `IrohaParagraph.chapterTagsV5?: string[]` 追加 | grep | line 19 |
| `classifyIrohaChapterTagsV5` export | grep | line 100 |
| `summarizeIrohaInjectionByChapterV1` export | grep | line 262 |
| `CHAPTER_KEYWORDS_V5` private const | grep `^const CHAPTER_KEYWORDS_V5` (export なし) | line 71, export なし ✓ |
| prompt_trace 既存 `iroha` 維持 + 章別 5 keys + `iroha_chapter_hits` | chat.ts grep | 全部追加済 |
| MC `iroha_chapters` 24h summary 追加 | intelligenceFireTracker.ts grep | line 213-216 |
| diff +60 行以内 / 4 ファイル以内 | `git diff --numstat api/src/` | 3 ファイル / `+57 / -1` ✓ |
| `shared/iroha/` 新規作成なし | `ls shared/iroha/` | not exist ✓ |
| token / IP / SSH 鍵 leak なし | regex check | 0 件 |

---

## 11. 章分類キーワード辞書 (CHAPTER_KEYWORDS_V5 の方針)

`api/src/core/irohaKotodamaLoader.ts` 内 private const として定義 (export なし):

| 章 ID | keyword 数 | 主な keyword |
|-------|-----------|--------------|
| `47ji`    | 6  | 四十七 / 47字 / 五十音 / いろは47 / ヰ / ヱ |
| `ongi`    | 5  | 音義 / 音意 / 音響 / 響き / 霊響 |
| `seimei`  | 5  | 生命 / 命 / いのち / 生きる / 誕生 |
| `shisei`  | 6  | 死 / 別れ / 終わり / 転化 / 再生 / 輪廻 |
| `hokekyo` | 10 | 法華 / 妙法 / 蓮華 / 如来寿量品 / 薬王菩薩 / 観世音菩薩 / 普門品 / 常不軽菩薩 / 舍利弗 / 提婆達多 |

合計 32 keyword (前カード初期辞書 32 と同数だが hokekyo を強化)。

**辞書精度の運用方針**:
- DEPLOY 後の verify probe (次カード) で章別 chars が実際に立つことを確認
- カバレッジが 50% に届かない場合、追加キーワード提案を別カードで提示
- 「音」単独はノイズ多すぎのため、`ongi` 章では除外 (音義 / 音意 / 音響 / 響き / 霊響 のみ)
- iroha_khs_alignment 10 件は **言霊秘書対応** (法華経対応ではない) のため、本辞書では参照しない

---

## 12. 失敗時 rollback 手順

### 12-1. revert (推奨)

```bash
cd /opt/tenmon-ark-repo
git revert HEAD            # 本カードの commit を取り消し
git push origin feature/unfreeze-v4
```

### 12-2. 手動 rollback (commit 未 push の場合のみ)

```bash
git reset --hard HEAD~1
```

### 12-3. rollback 完全性チェック

```bash
grep -rnE 'chapterTagsV5|classifyIrohaChapterTagsV5|summarizeIrohaInjectionByChapterV1|CHAPTER_KEYWORDS_V5|IrohaChapterSummaryV1' api/src/ 2>/dev/null
# 上記が 0 件であれば rollback 完全

ls -la shared/iroha/ 2>/dev/null && echo "WARN: shared/iroha exists" || echo "OK: shared/iroha not present"
```

### 12-4. deploy していないため、コードを戻すだけで完全戻し可能

本カードは:
- API restart していない (production の動作は変わっていない)
- DB write していない
- Notion write していない
- migration していない
- nginx 操作していない
- systemd 操作していない

→ commit を revert すれば本番への影響は完全にゼロ。

---

## 13. 残課題と次カード (A〜D)

| # | カード | 前提 | 効果 | 推奨順 |
|---|--------|------|------|--------|
| **A** | **CARD-IROHA-MC-CHAPTER-TRACKING-DEPLOY-V1** | 本カード PASS + TENMON 裁定 | 本実装を本番に deploy + verify probe (章別 chars が実機で立つことを確認) | **1 (即推奨)** |
| B | CARD-IROHA-MEMORY-PROJECTION-AUDIT-V1 | 並行可 | memory_units iroha 63 件 / 32 scope_id projection 適用率 (READ-ONLY) | 2 (A と並行可) |
| C | CARD-IROHA-NOTION-STRUCTURE-WRITE-V1 | A 後 | 5 章地図を Notion に append-only write | 3 (KPI が立った後) |
| D | CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1 | (前提なし) | 断捨離 source observe / tone policy 前段 | 4 (常駐候補) |

将来候補:
- `CARD-IROHA-CHAPTER-KEYWORDS-SHARE-V1` (必要になった場合のみ shared 化)
- `CARD-IROHA-MC-CHAPTER-TRACKING-COVERAGE-IMPROVE-V1` (verify probe で hokekyo coverage 不足が出た場合のみ)
- `CARD-IROHA-GROUNDING-CHAPTER-WIRING-V1` (`decisionFrame.ku.irohaGrounding.matchedChapters` 追加; 設計は前カード § 9 で確定済)

---

## Appendix A: 検証ログ (本カード commit 直前)

```
TypeScript noEmit check        : PASS (api/, 0 errors)
diff (api/src/* only)          : 3 files, +57 insertions, -1 deletion
shared/iroha/                   : not created
buildIrohaInjection signature   : unchanged
queryIrohaByUserText signature  : unchanged
existing CHAPTER_KEYWORDS (7)   : unchanged
existing PRINCIPLE_KEYWORDS (6) : unchanged
new export count                : 2 (classifyIrohaChapterTagsV5, summarizeIrohaInjectionByChapterV1)
new type export count           : 1 (IrohaChapterSummaryV1)
new private const               : 1 (CHAPTER_KEYWORDS_V5, no export)
Notion write                    : 0
DB write                        : 0
nginx ops                        : 0
systemctl ops                    : 0
restart                         : 0
```

verdict (期待): **GREEN** (critical=0, warn=0)

---

## End of CARD-IROHA-MC-CHAPTER-TRACKING-IMPLEMENT-V1
