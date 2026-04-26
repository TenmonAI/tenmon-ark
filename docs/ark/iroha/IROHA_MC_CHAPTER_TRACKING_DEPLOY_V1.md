# CARD-IROHA-MC-CHAPTER-TRACKING-DEPLOY-V1: 本番 deploy + verify probe 結果

- **カード種別**: DEPLOY + VERIFY 小カード (restart 1 回限定の許可)
- **deploy 対象 commit**: `8651985c` (CARD-IROHA-MC-CHAPTER-TRACKING-IMPLEMENT-V1)
- **追加実装**: ゼロ (本カードはコード変更なし、restart + probe のみ)
- **生成 verdict**: **GREEN** (critical=0, warn=0, info あり)

---

## 1. 背景 (IMPLEMENT-V1 commit `8651985c` の概要)

前カード `CARD-IROHA-MC-CHAPTER-TRACKING-IMPLEMENT-V1` で:
- `irohaKotodamaLoader.ts` に private const `CHAPTER_KEYWORDS_V5` (5 章 × 32 keyword) を追加
- `IrohaParagraph` に optional `chapterTagsV5?: string[]` を追加
- `classifyIrohaChapterTagsV5` / `summarizeIrohaInjectionByChapterV1` を export
- `chat.ts` で `__irohaChapterSummaryV1` を outer scope に保持し、`prompt_trace.clause_lengths` に `iroha_chapters` / `iroha_chapter_hits` (両方 optional) を追加
- `intelligenceFireTracker.ts` に optional 章別 keys + `buildPromptTraceSummary24hV1` の集計を追加
- 計 3 ファイル / +57 / -1 / shared/iroha/ 未作成 / `buildIrohaInjection` signature 不変

本カードはこの commit を本番に反映 (build + restart 1 回) し、実機 probe で章別 KPI が立つことを確認する。

---

## 2. deploy 前 baseline

### 2-1. /api/health (deploy 前)

```
ok: true
gitSha: 8651985c     ← git CLI 由来 (本実装は HEAD に存在するが dist 未反映)
ready: true
stage: READY
uptimeMs: 31816980   ← ~8.8 時間前から起動 (古い build)
listenReady: true
dbReady: { kokuzo: true, audit: true, persona: true }
kokuzoVerified: true
```

### 2-2. dist artifact (deploy 前)

```
api/dist/index.js mtime  : 2026-04-26 07:28
→ IMPLEMENT-V1 commit (~16:00) より 9 時間前 = 古い build (chapterTagsV5 未焼き込み)
```

### 2-3. mc_intelligence_fire.jsonl baseline

```
total rows           : 499
最後の row           : 旧 schema (clause_lengths.iroha=596 のみ、iroha_chapters/iroha_chapter_hits は無し)
clause_lengths keys  : amaterasu / iroha / katakamuna_* / khs_* / kotodama_* / meaning_arbitration / truth_layer / unified_sound (15 keys, iroha_chapters 不在)
```

### 2-4. DB mtime baseline

```
kokuzo.sqlite : 2026-04-26 16:18:43
audit.sqlite  : 2026-04-18 14:01:13
```

---

## 3. restart 実行ログ要約

### 3-1. 実行コマンド

```
systemctl restart tenmon-ark-api.service
sleep 4
systemctl is-active tenmon-ark-api.service
```

### 3-2. プロセス遷移

```
BEFORE PID : 1631512  (etime 08:51:33, 古い build)
AFTER  PID : 2014399  (etime 00:04, 新 build)
```

### 3-3. journal 起動完了行 (新 PID 2014399)

```
[KOTODAMA_HISHO] loaded: いろは言霊解 天道仁聞 (1037 paragraphs)
[KOTODAMA_HISHO] init OK: 1037 paragraphs
[CONSTITUTION_SEAL] KOTODAMA_CONSTITUTION_V1 seal VERIFIED (3eec740366e76298...)
[CONSTITUTION_SEAL] KHS_CORE_v1 seal VERIFIED (e2e80e945d45614c...)
[KOTODAMA_ENFORCER_V1] clean: 6 checks passed (KOTODAMA_CONSTITUTION_V1)
[SERVER-START] PID=2014399 startTime=2026-04-26T07:20:15.041Z
[SERVER-LISTEN] PID=2014399 port=3000 elapsed=16ms
API listening on http://0.0.0.0:3000
[READY] listenReady=true
[DB-WAL-CHECKPOINT] timer started intervalMs=600000
```

エラー / 警告: SQLite ExperimentalWarning (Node.js native flag、無害) のみ。
クリティカルエラー: **なし**。

---

## 4. /api/health (post-restart)

```json
{
  "ok": true,
  "timestamp": "2026-04-26T07:20:34.922Z",
  "gitSha": "8651985c",
  "readiness": {
    "ready": true,
    "stage": "READY",
    "uptimeMs": 19981,
    "listenReady": true,
    "dbReady": { "kokuzo": true, "audit": true, "persona": true },
    "kokuzoVerified": true
  }
}
```

- `gitSha` = `8651985c` ✓ (HEAD と一致)
- `ready` = true ✓
- `stage` = READY ✓
- `uptimeMs` = 19981 (~20 秒) ✓ (新プロセスを示す reset)
- `listenReady` = true ✓
- 全 DB ready ✓

---

## 5. probe 1 結果 (hokekyo 系 query)

### 5-1. リクエスト

```
POST /api/chat
threadId: chapter-deploy-probe-1
message : "いろはの五十音と法華経の関係を教えてください"
HTTP    : 200
response_length: 597 chars (sha8=56f76a21)
```

### 5-2. mc_intelligence_fire.jsonl 最新行 (probe 1 由来)

```
ts                : 1777188067827
route_reason      : NATURAL_GENERAL_LLM_TOP
provider          : gemini
prompt_total      : 12164
response_len      : 589
user_msg_len      : 22

clause_lengths.iroha (existing)   : 915                           ← 既存 key 残存 ✓
clause_lengths.iroha_chapters     : { 47ji: 435, ongi: 0,
                                      seimei: 0, shisei: 528,
                                      hokekyo: 213 }              ← 新 key 出現 ✓
clause_lengths.iroha_chapter_hits : { 47ji: 2, ongi: 0,
                                      seimei: 0, shisei: 2,
                                      hokekyo: 1 }                ← 新 key 出現 ✓
```

**観察**:
- `hokekyo: 213 chars / 1 hit` — 法華経関連 query で **hokekyo 章が立った**
  (前カード design 時点では coverage 2/1037、本カードで強化した 10 keyword 辞書が機能)
- `47ji: 2 hits` — 「五十音」query で 47 字構造が拾われた (multi-tag 想定通り)
- `shisei: 2 hits` — 法華経関連 paragraph が「死/再生/輪廻」も含むため共起

---

## 6. probe 2 結果 (seimei/shisei 系 query)

### 6-1. リクエスト

```
POST /api/chat
threadId: chapter-deploy-probe-2
message : "いろはにおける生命と死生観、生きるとは何か誕生と再生の意味を教えてください"
HTTP    : 200
response_length: 469 chars (sha8=6709cd9c)
```

### 6-2. mc_intelligence_fire.jsonl 最新行 (probe 2 由来)

```
ts                : 1777188072351
route_reason      : NATURAL_GENERAL_LLM_TOP
provider          : gemini
prompt_total      : 12418
response_len      : 469
user_msg_len      : 37

clause_lengths.iroha (existing)   : 1138                          ← 既存 key 残存 ✓
clause_lengths.iroha_chapters     : { 47ji: 0, ongi: 0,
                                      seimei: 629, shisei: 944,
                                      hokekyo: 0 }                ← 新 key 出現 ✓
clause_lengths.iroha_chapter_hits : { 47ji: 0, ongi: 0,
                                      seimei: 2, shisei: 3,
                                      hokekyo: 0 }                ← 新 key 出現 ✓
```

**観察**:
- `seimei: 2 hits / 629 chars` — 「生命/誕生」関連で立った
- `shisei: 3 hits / 944 chars` — 「死生観/再生」関連で立った
- `47ji / ongi / hokekyo: 0` — query が seimei/shisei 寄りのため、他章は不発 (期待通り)

---

## 7. 既存 iroha key 残存確認

| probe | 旧 schema baseline | 新 schema |
|-------|--------------------|-----------|
| baseline (probe 0, deploy 前) | `iroha=596` (single key) | n/a |
| probe 1 (post-deploy) | n/a | `iroha=915` (既存) + `iroha_chapters` + `iroha_chapter_hits` |
| probe 2 (post-deploy) | n/a | `iroha=1138` (既存) + `iroha_chapters` + `iroha_chapter_hits` |

→ 既存 `iroha` key は **両 probe で残存** (後方互換 ✓)。

---

## 8. iroha_chapters / iroha_chapter_hits 出現確認

```
clause_lengths keys (新 schema)  : 17 keys (旧 15 + 2 新規)
新規追加 keys                     : iroha_chapters, iroha_chapter_hits
存在確認                          : probe 1 / probe 2 両方で出現 ✓
旧 schema 行 (deploy 前)         : 新規 keys 不在 (None)
```

両 probe 共に 5 章すべて (47ji / ongi / seimei / shisei / hokekyo) の値が
`iroha_chapters` / `iroha_chapter_hits` object 内に存在。

---

## 9. MC intelligence iroha_chapters 確認

### 9-1. /api/mc/vnext/intelligence

```
GET /api/mc/vnext/intelligence
HTTP : 401
body : {"ok": false, "error": "UNAUTHENTICATED"}

→ 戦略 C 維持 (auth missing → info 扱い、警告でも error でもない)
```

### 9-2. /api/mc/vnext/claude-summary

```
GET /api/mc/vnext/claude-summary
HTTP : 401
body : {"ok": false, "error": "UNAUTHENTICATED"}
```

### 9-3. 代替: jsonl 経由で 24h summary を直接計算 (READ-ONLY)

`buildPromptTraceSummary24hV1` のロジックを Python で再現し、jsonl 直接読みで集計:

```
24h sample (total)                  : 239 rows
24h sample (new schema, iroha_chapters present): 2 rows (本カードの probe 1 + 2)
avg iroha (existing, all rows)      : 765 chars (n=239)

avg iroha_chapters (new schema only, n=2):
  47ji    : chars_avg=218, hits_avg=1
  ongi    : chars_avg=0,   hits_avg=0   ← 0 (info, dictionary tune 候補)
  seimei  : chars_avg=314, hits_avg=1
  shisei  : chars_avg=736, hits_avg=2
  hokekyo : chars_avg=106, hits_avg=0   ← rounded down (probe1=213/1, probe2=0/0)
```

**観察**:
- 24h 集計が `iroha_chapters?.[k] ?? 0` の後方互換ロジックで正しく動く
- 新 schema row が 24h 中 2 行のみ (deploy 直後で当然) — 時間経過とともに増加見込み
- `ongi=0` は coverage 課題 (info、別カード `DICTIONARY-TUNE-V1` 候補)

---

## 10. regression 確認結果

```
POST /api/chat
threadId: chapter-deploy-regression
message : "こんにちは"
HTTP    : 200
response_length: 58 chars (sha8=b1c926e4)
mode    : NATURAL
intent  : chat
threadId echoed: chapter-deploy-regression
decisionFrame present: true
```

短挨拶は既存 routing で **NATURAL_GENERAL_LLM_TOP 非到達** のため `__mc20NatFire` の append 経路を通らず、
jsonl 行数は 501 のまま (probe 1 + 2 の +2 行で固定) — これは **既存の short_greeting 分岐挙動** であり、
本カードによる挙動変化ではない。response 200 / 本文あり / decisionFrame 正常で regression なし。

---

## 11. 副作用ゼロ確認

| 項目 | baseline | post-deploy | 結果 |
|------|----------|-------------|------|
| DB mtime (kokuzo.sqlite) | 2026-04-26 16:18:43 | 2026-04-26 16:18:43 | **不変** (DB write 0 件) ✓ |
| DB mtime (audit.sqlite)  | 2026-04-18 14:01:13 | 2026-04-18 14:01:13 | **不変** ✓ |
| nginx | active | active | 維持 ✓ |
| tenmon-ark-api.service | active | active | restart 1 回のみ ✓ |
| tenmon-nas-watch.service | inactive | inactive | 不変 ✓ |
| tenmon-mc-collector.* | inactive | inactive | 不変 ✓ |
| 旧 VPS 操作 | 0 | 0 | 0 件 ✓ (本カード scope 外) |
| Notion write | 0 | 0 | 0 件 ✓ |
| migration | 0 | 0 | 0 件 ✓ |
| pip/npm/apt install | 0 | 0 | 0 件 ✓ |
| code commit (本カード期間中) | 0 | 0 | docs 1 件のみ (本ファイル) |
| mc_intelligence_fire.jsonl rows | 499 | 501 | +2 (probe 1 + 2 の正規 append のみ) |

---

## 12. verdict

| 軸 | 判定 |
|----|------|
| **critical** | 0 (restart 成功 / health ready / probe 200 / iroha key 残存 / 5 章 keys 出現 / regression OK) |
| **warn**     | 0 (gitSha 一致 / 章別 chars が実機で立つ / MC 401 は戦略 C で info 扱い) |
| **info**     | 24h 新 schema sample = 2 rows (deploy 直後で当然) / `ongi` chars=0 (dictionary tune 候補) / hokekyo は probe で 213/1 出現 (10 keyword 強化機能) |

→ **GREEN**

---

## 13. 次カード推奨 (A〜D)

| # | カード | 前提 | 効果 | 推奨度 |
|---|--------|------|------|--------|
| **A** | **CARD-IROHA-MC-CHAPTER-TRACKING-DICTIONARY-TUNE-V1** | 本カード PASS / 新 schema row 蓄積 | `ongi` coverage=0 を解消、CHAPTER_KEYWORDS_V5 を実機データから補強 | **1 (条件次第で即推奨)** |
| **B** | CARD-IROHA-MEMORY-PROJECTION-AUDIT-V1 | 並行可 | memory_units iroha 63 件 / 32 scope_id projection 適用率 (READ-ONLY) | 2 (A と並行可) |
| **C** | CARD-IROHA-NOTION-STRUCTURE-WRITE-V1 | A 後 (KPI 確立後) | 5 章地図を Notion に append-only write | 3 |
| **D** | CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1 | (前提なし、main-line 候補) | 断捨離 source observe / tone policy 前段 | 4 (常駐) |

**TENMON 裁定の判断材料**:
- 章別 KPI が立った (probe 1 で hokekyo=1 hit, probe 2 で seimei=2/shisei=3) → 実装は健全
- ただし `ongi=0` (2 probe) は dictionary 課題 — 24h で 10〜20 row 蓄積後に判定するか、A を即実行するかは TENMON 裁定
- B (memory projection) は本カードと独立で動かせる READ-ONLY observation

---

## Appendix A: Acceptance 16 項対応

| # | 観点 | 結果 |
|---|------|------|
| 1 | HEAD に commit `8651985c` | ✓ `git rev-parse HEAD` = 8651985c... |
| 2 | TypeScript build PASS | ✓ `npm run build` (tsc + copy-assets) 成功、追加実装ゼロ |
| 3 | tenmon-ark-api restart (1 回のみ) | ✓ PID 1631512 → 2014399、本カード期間中 1 回のみ |
| 4 | restart 後 active (running) | ✓ `systemctl is-active` = active |
| 5 | journal クリティカルエラーなし | ✓ SQLite ExperimentalWarning のみ (無害) |
| 6 | /api/health ready=true / stage=READY | ✓ 両方 |
| 7 | gitSha = 8651985c | ✓ |
| 8 | probe 1/2 status 200 | ✓ 両方 |
| 9 | probe 応答 (jsonl) に既存 `iroha` key 残存 | ✓ probe 1: 915 / probe 2: 1138 |
| 10 | 5 章 chars (47ji / ongi / seimei / shisei / hokekyo) 存在 | ✓ `iroha_chapters` object に全 5 keys 出現 |
| 11 | `iroha_chapter_hits` 存在 | ✓ 両 probe で出現 |
| 12 | MC intelligence の `iroha_chapters` 確認 | 401 (戦略 C) → jsonl 直接読みで 24h 集計確認、ロジック動作 ✓ |
| 13 | regression (greeting probe で response あり) | ✓ HTTP 200 / 58 chars / mode=NATURAL |
| 14 | DB write 0 / Notion write 0 / nginx 0 / 他 service 不変 | ✓ 全項目 |
| 15 | token / API key / IP / SSH 鍵 leak なし | ✓ docs / commit message 全走査 0 件 |
| 16 | docs 新規作成 + commit (実装変更を含まない) | ✓ 本ファイル + commit (code 変更ゼロ) |

---

## Appendix B: 検証ログサマリ

```
HEAD                            : 8651985c
dist build mtime (BEFORE)        : 2026-04-26 07:28 (古い)
dist build mtime (AFTER)         : 2026-04-26 16:19 (新)
restart count                    : 1
API PID (BEFORE)                 : 1631512 (etime 8h51m)
API PID (AFTER)                  : 2014399 (etime ~3 min)
gitSha (post-restart)            : 8651985c
ready / stage                    : true / READY
uptimeMs (post-restart)          : 19981 (~20s)
listenReady                      : true
chat probe count                 : 3 (probe 1 + probe 2 + regression)
fire jsonl rows (BEFORE)         : 499
fire jsonl rows (AFTER)          : 501 (+2: probe 1 + probe 2; regression skipped LLM_TOP)
new schema rows in 24h window    : 2
DB write count                   : 0
Notion write count               : 0
nginx ops                        : 0
systemctl ops (allowed)          : 1 (tenmon-ark-api restart)
systemctl ops (other)            : 0
old VPS ops                      : 0
leak check                       : 0 hits
code change                      : 0 lines (本カードはコード変更ゼロ)
docs new                         : 1 file (本ファイル)
```

---

## End of CARD-IROHA-MC-CHAPTER-TRACKING-DEPLOY-V1
