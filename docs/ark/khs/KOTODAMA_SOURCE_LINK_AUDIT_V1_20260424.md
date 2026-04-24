# KOTODAMA_SOURCE_LINK_AUDIT_V1

**revision:** 2026-04-24-B（憲法成立後版）  
**parent_commit:** `5c1144ca`（`KOTODAMA_CONSTITUTION_V1` SEAL 済み前提）  
**監査日:** 2026-04-24  
**監査者:** Cursor（コード変更なし・本ファイルの生成のみ）

---

## 0. 監査方針（カード準拠）

- **推測禁止**: 判定は `rg` / `sqlite3` / ファイル実読に基づく。Notion 生ページの有無・最終更新は **Notion MCP 未接続のため A1 は原則 ⚪ 不明**。
- **5 状態**: 🟢 接続済 / 🟡 部分接続 / 🟠 未接続 / 🔴 未封印 / ⚪ 不明（定義はカード本文どおり）。
- **憲法 V1 参照**: `docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt`（`KOTODAMA_CONSTITUTION_V1.sha256` 併記）を C 層の権威テキストとして引用。

---

## 1. グローバル証跡（コマンド出力）

### 1.1 橋渡し Page ID（28・29）— リポジトリ全域 `rg`

```bash
rg -n "33d65146-58e6-8187-b8dd-d7638fdddaa5|33d6514658e68187b8ddd7638fdddaa5" \
  /opt/tenmon-ark-repo/api/src /opt/tenmon-ark-repo/api/scripts \
  /opt/tenmon-ark-repo/docs /opt/tenmon-ark-repo/canon /opt/tenmon-ark-repo/shared
# 結果: 0 件（ハイフン有・無ともにヒットなし）
```

```bash
rg -n "33d65146-58e6-8124-85f9-fab4c366cc5a|33d6514658e6812485f9fab4c366cc5a" \
  /opt/tenmon-ark-repo/api/src /opt/tenmon-ark-repo/api/scripts \
  /opt/tenmon-ark-repo/docs /opt/tenmon-ark-repo/canon /opt/tenmon-ark-repo/shared
# 結果: 0 件
```

### 1.2 `sacred_corpus_registry` / `memory_units` / `source_registry`（kokuzo.sqlite）

```text
$ sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite \
  "SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%kotodama%' OR name LIKE '%khs%' OR name LIKE '%memory_units%' OR name LIKE '%sacred%') ORDER BY 1;"
comparative_sacred_links
iroha_khs_alignment
khs_*（複数）
memory_units
sacred_corpus_registry
sacred_segments

$ sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite "SELECT COUNT(1) FROM sacred_corpus_registry;"
1014

$ sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite "SELECT COUNT(1) FROM sacred_segments;"
2211

$ sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite "SELECT COUNT(1) FROM memory_units;"
252941

$ sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite "SELECT COUNT(1) FROM source_registry;"
107

$ sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite \
  "SELECT COUNT(1) FROM sacred_corpus_registry WHERE title_original LIKE '%水穂%';"
0

$ sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite \
  "SELECT COUNT(1) FROM sacred_corpus_registry WHERE title_original LIKE '%五十連%';"
0

$ sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite -header -column \
  "SELECT id, tradition, substr(title_original,1,40) AS t FROM sacred_corpus_registry WHERE title_original LIKE '%言霊%' OR title_original LIKE '%KHS%' LIMIT 8;"
id=kotodama_hisho_khs | tradition=yamato_kotodama | t=KHS
id=CORPUS:KHS         | tradition=GENERAL        | t=KHS
id=CORPUS:言霊秘書.pdf   | tradition=KOTODAMA      | t=言霊秘書.pdf
id=CORPUS:いろは言霊解   | tradition=KOTODAMA      | t=いろは言霊解
id=CORPUS:KHS_UTF8    | tradition=GENERAL        | t=KHS_UTF8
```

**解釈:** コーパス表に **個別巻題（水穂伝序・火之巻一…）で機械検索できる行は 0**。一方で **`言霊秘書.pdf` / `いろは言霊解` / `KHS` 系**の束縛は存在する。

### 1.3 `EVIDENCE_UNITS_KHS_v1.jsonl`（先頭サンプル）

`docs/ark/khs/EVIDENCE_UNITS_KHS_v1.jsonl` に `doc=NOTION:PAGE:<uuid>` + `pdfPage=` 形式の **KHS 単位証跡**あり（例: `国学第一の書` `ア` `ワ` `水火` `正中` `井の灵` `濁/澄` 等）。**個別の「水穂伝序」タイトル文字列はファイル先頭スキャン範囲では未確認**（全文検索は別コマンド推奨）。

### 1.4 主要 loader / `chat.ts` 注入（grep 行番号）

`api/src/routes/chat.ts`（抜粋・import / 使用付近）:

- `buildConstitutionClause` … L69 import, **L361** で `_khsConstitutionClause` 構築
- `loadKotodamaHisho` / hisho … **L95 import**, **L384** init
- `queryIrohaByUserText` / iroha … **L97 import**, **L1935** 付近
- `buildKotodamaGentenInjection` … **L100 import**, **L1957** 付近
- `buildUnifiedSoundInjection` … **L104 import**, **L1993** 付近
- `buildKotodamaOneSoundLawSystemClauseV1` … **L82 import**, **L2009**, **L2178** 付近

### 1.5 憲法 V1 ・ SHA256 ファイル一覧（`docs/ark/khs/*.sha256`）

実在確認:

- `KOTODAMA_CONSTITUTION_V1.sha256`
- `KHS_CORE_CONSTITUTION_v1.sha256`
- `TENMON-ARK KHS CORE CONSTITUTION v1.sha256`
- `KHS_SEAL_v1.sha256`

起動時 `journalctl` ログ（**本監査環境では** `[CONSTITUTION] KOTODAMA_CONSTITUTION_V1 loaded (6002 bytes)` / `[CONSTITUTION_SEAL] KOTODAMA_CONSTITUTION_V1 seal VERIFIED (3eec740366e76298...)` / KHS seal VERIFIED が出ることを MC-20-B 完了報告で確認済み）— **再実行ログは運用側で `journalctl -u tenmon-ark-api` を参照**。

### 1.6 憲法整合（C5）— **五十連 50 分母 vs 観測コード**

`api/src/mc/intelligence/kotodama50MapV1.ts` **L7–54** `GOJUON_BASE`: **46 音 + `ン` の 47 キー**。**`ヰ`・`ヱ` は配列に含まれない**。

対照: `api/src/routes/chat_refactor/define_trunk_v1.ts` の正規表現に **`ワヰヱヲン`** が含まれる（ルーティング上は古形を許容）。

**憲法 V1 第 2・3・4 条との緊張:** 観測用 `kotodama_50` 監査は **50 分母・ン除外・ヰヱ保持**の命令と **完全一致していない**（後続カード C–I で是正予定 — `KOTODAMA_NOTION_BRIDGE_MEMO.md` 参照）。

---

## 2. 32 資料マスター表（A / B / C / 総合）

凡例: **A1**=Notion実在、**A2**=PDF/正本束、**A3**=json/jsonl/txt、**B1**=repo grep、**B2**=loader、**B3**=DB、**B4**=chat.ts、**C**=封印・憲法整合。

| # | 資料 | A1 | A2 | A3 | B1 | B2 | B3 | B4 | C | **総合** |
|---:|------|----|----|----|----|----|----|----|---|----------|
| 1 | 水穂伝序 | ⚪ | △ | △ | △ | ○ | × | ○ | △ | 🟡 |
| 2 | 水穂伝附言 | ⚪ | △ | △ | △ | ○ | × | ○ | △ | 🟡 |
| 3 | 五十連十行之発伝 | ⚪ | △ | △ | △ | ○ | × | ○ | △ | 🟡 |
| 4 | 五十行一言法則 | ⚪ | △ | ○ | ○ | ○ | × | ○ | △ | 🟡 |
| 5 | 水穂伝重解誌一言法則（上） | ⚪ | △ | ○ | ○ | ○ | × | ○ | △ | 🟡 |
| 6–9 | 水火伝 火之巻一/三・水之巻一/二 | ⚪ | △ | △ | △ | △ | × | △ | △ | 🟠 |
| 10 | 水火伝 詞縦緯 | ⚪ | △ | △ | ○ | ○ | × | ○ | △ | 🟡 |
| 11 | 火水與伝 | ⚪ | △ | △ | △ | △ | × | △ | △ | 🟠 |
| 12 | イロハ口伝 | ⚪ | △ | △ | ○ | ○ | × | ○ | △ | 🟡 |
| 13 | 時刻 | ⚪ | × | × | △ | × | × | ○ | ○ | 🟠 |
| 14–19 | 布斗麻邇・稲荷古伝群 | ⚪ | △ | △ | △ | △ | × | ○ | △ | 🟠 |
| 20 | カタカムナウタヒ八十首 | ⚪ | △ | ○ | ○ | △ | × | ○ | △ | 🟡 |
| 21 | 辞（テニヲハ）と文明の繋がり | ⚪ | × | △ | ○ | △ | × | ○ | △ | 🟠 |
| 22 | ラリルレ 助言 | ⚪ | × | × | × | × | × | × | ○ | 🟠 |
| 23 | 国学第一の書 | ⚪ | × | ○ | ○ | △ | × | △ | △ | 🟡 |
| 24–27 | Index / 親DB / 入口 / カテゴリ | ⚪ | × | × | △ | △ | × | △ | △ | 🟠 |
| 28 | 言灵→天聞アーク橋渡し（指定 UUID） | ⚪ | × | × | **×** | × | × | × | × | **🟠** |
| 29 | 言灵DB・開発DB 分離完成メモ（指定 UUID） | ⚪ | × | × | **×** | × | × | × | × | **🟠** |
| 30–32 | 運用ルール・完成メモ・TODO | ⚪ | × | △ | △ | △ | × | △ | △ | 🟠 |

**記号の意味**

- **○** = 該当層で **肯定できる実体**（ファイル・grep ヒット・loader・`chat.ts` 経路のいずれか）。
- **△** = **間接のみ**（親コーパス「言霊秘書.pdf」、KHS unit、notionTopics 文字列、設計 MD / `kotodama_raw_text.txt` 断片等）。
- **×** = **本監査コマンド範囲では否定**（0 件、列なし、UUID 未登録）。

**A1 全行 ⚪:** Notion API / MCP 未使用のため **ページ実在・更新日は未検証**。

---

## 3. 層別サマリー

### Layer A（正典存在）

- **A2 PDF**: リポジトリに `CORPUS:言霊秘書.pdf` 行が DB に存在（§1.2）。790 ページ PDF 実体のパスは **本監査ではファイルシステム探索未実施**（別タスク）。
- **A3 静的 JSON**: `kotodama_genten_data.json`（repo root）、`api/src/data/iroha_kotodama_hisho.json` / `shared/kotodama/iroha_kotodama_hisho.json` **実在**（`Glob`）。`canon/*.json` に **カタカムナウタヒ・テニヲハ系**の語（`tenmon_scripture_canon_v1.json` 等）。
- **EVIDENCE_UNITS**: KHS コア語（ア/ワ/水火/正中/国学第一…）に **NOTION:PAGE** 束縛あり。

### Layer B（runtime 接続）

- **B1 文字列**: 橋渡し UUID **ヒット 0**（§1.1）。`水穂伝` / `五十連` / `言灵秘書データベース` は **`kotodamaOneSoundLawIndex.ts` / `guestSystemPrompt.ts` / `scripture_trunk_v1.ts` 等に分散**。
- **B2 loader 組込**: hisho / iroha / genten / unified / one_sound / constitution（KHS + KOTODAMA seal）は **`chat.ts` に明示的 import・NATURAL_GENERAL 系で使用**（§1.4）。`notionCanon.ts` は **ページ束の静的定義型**中心で、**本リスト 32 件の Notion pageId 直列挙はなし**（先頭 ~80 行読了）。
- **B3 DB**: `sacred_corpus_registry` **1014** 行、`sacred_segments` **2211** 行、`memory_units` **252941** 行、`source_registry` **107** 行。**巻題完全一致行は 0**（§1.2）。
- **B4 `chat.ts`**: 上記 loader 使用あり。**橋渡し UUID は未参照**。

### Layer C（運用封印・憲法）

- **C1**: `KOTODAMA_CONSTITUTION_V1.sha256` 実在（§1.5）。
- **C2**: `constitutionLoader.verifySeal()` 経由で **KOTODAMA + KHS** のログ方針は MC-20-B で成立（本ファイル §1.5 参照）。
- **C3 / C4**: 橋渡し・分離メモの **Page ID がコード・DB に出現しない** → **runtime からは未接続**（§1.1）。
- **C5 憲法整合**:
  - **第 2・8 条（分母 50）** と `kotodama50MapV1` **47 キー**の差: **不整合リスク明示**（§1.6）。
  - **第 4 条（ヰ・ヱ）** と `GOJUON_BASE` **欠番**: **不整合**（§1.6）。`define_trunk_v1` の正規表現との **二重基準**あり。
  - **第 6 条（階層）** は `katakamunaMisreadExpansionGuard.ts` 等で **カタカムナ＝mapping 先**の宣言あり — **コード上の優先順位は憲法文と整合的方向**だが、**Notion 階層 ID の直結は未観測**。

---

## 4. リスク・推奨次アクション（監査のみ・実装判断は別カード）

1. **橋渡し UUID の VPS 取り込み**（28・29）— `rg` 0 件 → **運用設計上の単一入口が runtime に未露出**。
2. **`sacred_corpus_registry` の粒度** — 親 PDF 行はあるが **巻・章レベルの source_uri / title が未正規化**で、32 資料トレースに弱い。
3. **`kotodama_50` 監査と憲法 50 分母の同期**（C5 / MC-20-C 系）。
4. **`EVIDENCE_UNITS` の `pdfPage` 表記** — KHS_CORE 側は `printedPage` 移行済み。**jsonl 側表記の統一**は別監査対象。

---

## 5. 成果物メタ

- **本レポートパス:** `docs/ark/khs/KOTODAMA_SOURCE_LINK_AUDIT_V1_20260424.md`
- **コード diff:** なし（本ファイル追加のみを想定）

---

**SEAL END（監査レポート）**
