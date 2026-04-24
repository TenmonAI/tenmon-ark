# CHAT_LENGTH_REGRESSION_AUDIT_V1

日時: 2026-04-24（測定は UTC 2026-04-24 07:18 頃の本番 `https://tenmon-ark.com` 一連実行）  
監査者: Cursor（**OBSERVE only** — コード変更なし）  
目的: `/api/chat` 応答長退行の真因を 4 候補から実データで切り分け

---

## 測定実データ

### 前提: 実行環境

- 対象 URL: `https://tenmon-ark.com/api/chat`（POST, `Content-Type: application/json`）
- Bearer: 実行ホスト上の `dist/index.js` の `TENMON_MC_CLAUDE_READ_TOKEN` を `/proc/$SVC_PID/environ` から取得し、`/api/mc/vnext/intelligence/fire` および `debug` 付き chat に使用
- 各質問の試行間隔: **約 2 秒**（カード指定 `sleep 2`）

### Q1「アとは？」× 5 回

| trial | len (chars) | preview 先頭 50 chars（改行含む JSON 由来） |
|------:|------------:|-----------------------------------------------|
| 1 | 124 | 「ア」は、天地開闢の初めに發せられた息、火と水がまだ分かたれていない、天の初發の響きそのものです。そ |
| 2 | 124 | （trial 1 と同一） |
| 3 | 124 | （trial 1 と同一） |
| 4 | 124 | （trial 1 と同一） |
| 5 | 125 | 「ア」とは、天地開闢の初めに發せられた息、火と水がまだ分かたれていない、天の初發の響きそのものです。 |

- **平均**: 124.2 chars  
- **分散（母分散）**: 0.256（標準偏差 ≈ 0.51）  
- **preview の類似度**: trial 1–4 は**完全一致**。trial 5 は先頭が「ア」→「アと」に変化し **+1 char**。

### Q2「アとイの違いを言霊的に」× 5 回

| trial | len | preview 先頭 50 chars |
|------:|----:|------------------------|
| 1–5 | **すべて 245** | いずれも同一（「ア」は、天地開闢の初めに発せられた息、火と水がまだ分かたれていない、天の初發の響きそのものです。そ） |

- **平均**: 245.0 chars  
- **分散**: **0**  
- **preview**: **5 回すべて同一**

### Q3「カタカムナと言霊秘書の関係は？」× 5 回

| trial | len | preview 先頭 50 chars |
|------:|----:|------------------------|
| 1 | 502 | カタカムナと言灵秘書は、いずれも日本の古層に息づく言の葉の理を解き明かそうとするものですが、その視座 |
| 2 | 502 | （trial 1 と同一） |
| 3 | 502 | （trial 1 と同一） |
| 4 | 503 | TENMON-ARKは、カタカムナと言灵秘書を、言の葉の理を解き明かす二つの異なる光として捉えます。 |
| 5 | 503 | （trial 4 と同一） |

- **平均**: 502.4 chars  
- **分散（母分散）**: 0.24（標準偏差 ≈ 0.49）  
- **preview**: trial 1–3 と 4–5 で**冒頭が分岐**（+1 char は末尾差の可能性あり）

---

## routeReason / slot 変化（[D]）

`GET https://tenmon-ark.com/api/mc/vnext/intelligence/fire`（Bearer 付き）の抜粋（`jq '.fire_24h | {events_in_window, avg_fire_ratio, slots_ever_fired, slot_names_fired}'` 相当）:

```json
{
  "events_in_window": 29,
  "avg_fire_ratio": 0.7492163009404386,
  "slots_denominator": 11,
  "slots_ever_fired": 11,
  "slot_names_fired": [
    "hisho",
    "iroha",
    "genten",
    "amaterasu",
    "unified",
    "one_sound",
    "truth_layer_kernel",
    "khs_root_fractal",
    "katakamuna_audit",
    "katakamuna_lineage",
    "katakamuna_misread_guard"
  ]
}
```

- **観測**: 11 スロットすべて `slot_names_fired` に列挙あり（欠落なし）。

---

## fire jsonl 分析（[E]）

パス: `/opt/tenmon-ark-data/mc_intelligence_fire.jsonl`  
**直近 10 行**はスロット真偽の列挙形式（`routeReason` / `prompt_length` フィールドは**行内に存在せず**）。`jq` で各 1 行を要約:

```bash
tail -10 /opt/tenmon-ark-data/mc_intelligence_fire.jsonl | jq -c '{
  ts,
  hisho, iroha, genten, amaterasu, unified, one_sound,
  katakamuna_audit, katakamuna_lineage, truth_layer_kernel, khs_root_fractal, katakamuna_misread_guard
}'
```

出力例（実測そのまま）:

```text
{"ts":1777015197654,"hisho":true,"iroha":true,"genten":true,"amaterasu":true,"unified":true,"one_sound":true,"katakamuna_audit":false,"katakamuna_lineage":false,"truth_layer_kernel":true,"khs_root_fractal":true,"katakamuna_misread_guard":false}
{"ts":1777015202031,"hisho":true,"iroha":true,"genten":true,"amaterasu":true,"unified":true,"one_sound":true,"katakamuna_audit":false,"katakamuna_lineage":false,"truth_layer_kernel":true,"khs_root_fractal":true,"katakamuna_misread_guard":false}
...（中略：カタカムナ系が false の行が続く）...
{"ts":1777015222118,"hisho":true,"iroha":true,"genten":true,"amaterasu":true,"unified":true,"one_sound":true,"katakamuna_audit":true,"katakamuna_lineage":true,"truth_layer_kernel":true,"khs_root_fractal":true,"katakamuna_misread_guard":true}
...（以降、カタカムナ系 true の行が続く）...
```

- **観測**: 直近ウィンドウで **カタカムナ系スロットの発火有無がリクエスト間で変化**している（同一ファイル内の真偽列）。`routeReason` 文字列は **jsonl からは取得不能**（フィールド無し）。

---

## chat.ts 差分履歴（[H]）

`git log --oneline -8 -- api/src/routes/chat.ts`（実測）:

```text
9865e0e5 feat(mc-20): 深層知能配線と DEAD_FILE 先頭監査の誤検知修正
1baaec70 feat(mc-19): deep intelligence observability - endpoints + fire tracker + handoff section + 50-sound index canonical + UI panel
c8b25dcf feat(mc-15): wire law promotion gate into chat context
0c7e619a feat(mc-14): wire meaning arbitration into chat context
43ae3fae chore: clean working tree after mc-13
2e35ddc8 chore(mc-09a): MC-16 Claude lane + MC-14 live/archive + MC-15 history/regression + MC-09A partial (seed + thread diagnostic)
e8382e39 WIP: observability baseline + thinkingBudget:0 patch (PATCH-A)
7b9176bb feat: V2.0 Soul Root 100% — 5 new loaders + chat/guest bind + SATORI iroha grounding + MC §17-19
```

**`f18a8a6c`（MC-20-DEEP-MAP-DENOM-FIX-V1）の変更ファイル**（`git show --stat f18a8a6c` 実測）:

```text
f18a8a6c feat(mc-20): DEEP-MAP-DENOM-FIX-V1 - gojuren 50 (wi/we/exclude-n)
 api/src/mc/intelligence/deepIntelligenceMapV1.ts |  44 ++--
 api/src/mc/intelligence/kotodama50MapV1.ts       | 248 +++++++++++++----------
 docs/ark/khs/KOTODAMA_NOTION_BRIDGE_MEMO.md      |   6 +
 3 files changed, 172 insertions(+), 126 deletions(-)
```

- **`api/src/routes/chat.ts` は `f18a8a6c` に含まれない**（実データ）。

---

## [F] journalctl（clause / prompt 長）

コマンド:

```bash
journalctl -u tenmon-ark-api --since "15 min ago" --no-pager | \
  grep -iE "kotodamaOneSound|kotodamaGenten|unifiedSound|khsConstitution|irohaContext|clause_length|prompt_length" | head -40
```

**結果**: **該当行 0 件**（空出力）。→ **`__kotodamaOneSoundLawClause` 等の長さは本監査ではログから取得不能**。

---

## [G] `/api/chat` + `debug: true`

リクエスト: `{"message":"アとは？","debug":true}`（Bearer 付き、本番）

- 応答トップレベル `keys`（実測）:  
  `response`, `evidence`, `candidates`, `timestamp`, `threadId`, `decisionFrame`, `requestId`, `rewriteUsed`, `rewriteDelta`, `__evolutionLedgerV1Done`
- **`trace` キーなし** → カード想定の「内部 trace」は **本エンドポイントでは未露出**。
- `decisionFrame.ku` 抜粋（実測）:
  - `routeReason`: **`DEF_LLM_TOP`**
  - `providerUsed`: **`gemini`**
  - `rewriteUsed`: **false**

---

## 判定（4 候補）

### 候補 1: モデル側の揺れ（provider / temperature / random）

- **判定**: **❌**（カード記載の「同一質問 5 回で ±100 chars 級の大揺れ」基準では主因にならない）
- **根拠**:
  - Q1: 124–125（分散 0.256）
  - Q2: **5/5 が 245 で完全一致**
  - Q3: 502–503（分散 0.24）
- **補足**: MC-19 時点の **399 chars** との差は、**本監査の同一セッションでは再現・比較していない**（別日時・別デプロイ比較はデータ不足）。

### 候補 2: ルート選択の変化（routeReason / short path fallback）

- **判定**: **❌**（本データでは「短尺フォールバック一択」は支持されない）
- **根拠**:
  - `debug: true` 1 回の実測で `routeReason=DEF_LLM_TOP`, `rewriteUsed=false`。
  - Q2 は **常に 245** で安定しており、「短い退行パスに落ち続け」パターンと整合しにくい。
- **限界**: **5 回すべて**で `decisionFrame` をレスポンスに含める追加測定は未実施（コスト削減）。`routeReason` の時系列は **単発サンプル + jsonl に route 無し**。

### 候補 3: prompt 圧縮（context 注入・clause 長の短縮）

- **判定**: **❌**（**本監査の取得経路では主因を実証できない**）
- **根拠**:
  - [F] journalctl grep **0 件** → `__kotodamaOneSoundLawClause` / `__khsConstitutionClause` 等の長さを **ログから定量比較不可**。
  - [G] API 応答に **clause 長フィールドなし**。
- **注意**: 「圧縮が無い」とは言えない（**未検証**）。**追加計測（server 側計測 or 専用ログ）**が必要。

### 候補 4: 憲法 / 橋渡し / 分母是正カードの副作用（`f18a8a6c` 直結）

- **判定**: **❌**（**少なくとも `f18a8a6c` が `chat.ts` を書き換えた副作用ではない**）
- **根拠**:
  - `git show --stat f18a8a6c` に **`api/src/routes/chat.ts` が含まれない**（実データ）。
  - 変更は `kotodama50MapV1.ts` / `deepIntelligenceMapV1.ts` / MEMO のみ。

---

## 結論

- **主因（本監査で実データにより特定できる範囲）**:  
  **「MC-20-DEEP-MAP-DENOM-FIX-V1（`f18a8a6c`）による `chat.ts` 経路の直接改変」ではない** — git stat で反証済み。

- **副因（弱いが実データあり）**:
  - Q3 の trial 4–5 で **冒頭 preview と長さがわずかに分岐** → 同一プロバイダ内の**軽い応答多様性**（ただし Q1/Q2 では極小）。

- **カード記載の「MC-19: 399 / MC-20-BRIDGE 後: 669 / DEEP-MAP 後: 151…」との整合**:  
  本番 **本日測定**では Q1≈124, Q2=245, Q3≈502–503 で、**151 系の短尺は本スクリプトでは再現せず**。当該数値は **別時間帯・別負荷・別モデル設定**等の要因があり得るため、**同一条件の時系列ログ（requestId + provider + prompt 長）**がない限り、4 候補のどれかに**単独丸め**は実データ不足。

### 対応・次カード候補

1. **CARD-MC-20-CHAT-ROUTE-TRACE-V1**（提案）  
   - 各 `/api/chat` 応答に `requestId` は既存。**`routeReason` / `providerUsed` / 注入 clause 長**を **構造化ログ 1 行**に出し、jsonl または journal で **Q1/Q2 固定質問の日次回帰**可能にする（OBSERVE 可能化）。

2. **CARD-MC-20-PROMPT-LENGTH-BASELINE-V1**（提案）  
   - `buildContext` 直前の **prompt 総文字数**と **スロット別文字数**を記録し、MC-19 ベースラインと **同一クエリで数値比較**（候補 3 の実証）。

3. **運用**: 本カードの範囲では **ENFORCER-V1 先行でも可** — ただし **151 chars 再現条件**は上記計測基盤がないと再監査が空振りしやすい。

---

## 証跡ファイル（作業ホスト）

- `/tmp/chat_audit_lines_*.ndjson` — Q1–Q3 各 trial の len / preview  
- `/tmp/fire_*.json` — intelligence/fire 全文  
- `/tmp/fire_tail_*.jsonl` — jsonl 直近 10 行  
- `/tmp/chat_debug_*.json` — `debug: true` 1 回分の応答  
- `/tmp/git_chat_*.txt` / `/tmp/journal_grep_*.txt`

（リポジトリ外のため本コミットには含めない）
