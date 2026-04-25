# CONSTITUTION_MEMORY_PROJECTION_EXPAND_OBSERVE_V1

- 日時: 2026-04-25 (JST 2026-04-26 06:53)
- 監査者: Cursor (副因 C-4 修復候補確認)
- parent_commit: `91ffc3e2` (PERSONA-BIND-OBSERVE-V1)
- 種別: **OBSERVE + 設計** (実装は Phase 2)
- カード: `CARD-CONSTITUTION-MEMORY-PROJECTION-EXPAND-V1 [Phase 1]`
- DB: `/opt/tenmon-ark-data/kokuzo.sqlite` (`-readonly` SELECT のみ)
- 観測ログ: `/tmp/cpg/proj-expand-observe.txt`

> 本カードでは **memoryProjection.ts / chat.ts / api/src / migration / DB** いずれも変更しない。Phase 2 で別カード化。

---

## Section 1: memoryProjection.ts 全構造

### 1.1 ファイル位置 / 行数

| 項目 | 値 |
|---|---|
| パス | `/opt/tenmon-ark-repo/api/src/core/memoryProjection.ts` |
| サイズ | 18,718 bytes |
| 行数 | **573 行** |
| 最終更新 | 2026-04-18 13:58 (本カード時点で 1 週間以上不変) |
| 同名ファイル | api/src 配下に 1 つのみ (重複なし) |

### 1.2 export 関数一覧

| line | export |
|---|---|
| 384 | `function buildMemoryProjectionPack(args)` — chat 経路から呼ばれる中核関数 |
| 495 | `function logMemoryProjection(pack)` — `memory_projection_logs` への記録のみ |
| 516 | `function upsertConversationDistillMemoryV1(args)` — 会話蒸留の書き込み |

非 export の補助関数 (主要):
- `safeJsonParse` (25), `ensureColumnIfMissing` (34), `ensureProjectionTables` (47), `upsertMemoryUnit` (83)
- `distillThreadCenterMemory` (142) — `thread_center_memory` → `memory_units(scope='thread', type='thread_center_distill')`
- `distillScriptureMemory` (206) — `scripture_learning_ledger` → `memory_units(scope='thread', type='scripture_distill')`
- `distillTrainingRules` (265) — `training_rules` → `memory_units(scope='training', type='training_rule')`
- `distillSourceMemory` (308) — `source_registry` → `memory_units(scope='source', type='source_distill')`
- `distillFoundationMemory` (354) — 上記 4 つを合成
- `memoryUnitToItem` (363) — DB row → `MemoryProjectionItem`

### 1.3 SQL query 全件 (line 番号付き)

`buildMemoryProjectionPack` 内の SELECT は **5 種**:

| # | line | 名前 (慣用) | 条件 | LIMIT |
|---|---|---|---|---|
| 1 | 414-417 | user stable | `memory_scope='user' AND pinned=1` | 5 |
| 2 | 431-434 | persona | `memory_scope='persona' AND scope_id=?` | 5 |
| 3 | **447-453** | **`distilledThreadUnits`** | `memory_scope='thread' AND scope_id=? AND memory_type IN ('conversation_distill','thread_center_distill','scripture_distill')` | **8** |
| 4 | 459-465 | `distilledTrainingUnits` | `memory_scope='training' AND memory_type='training_rule'` | 4 |
| 5 | **471-477** | **`distilledSourceUnits`** | `memory_scope='source' AND memory_type='source_distill'` | **4** |

その他、`upsertMemoryUnit` 内 (100), `upsertConversationDistillMemoryV1` 内 (534) にも SELECT があるが、これらは upsert ロジック用 (chat 応答に inject されない)。
distill 系の補助 SELECT (FROM `thread_center_memory`/`scripture_learning_ledger`/`training_rules`/`source_registry`) も別カウント。

### 1.4 distilledSourceUnits / distilledThreadUnits の現実体

```ts
// line 447-453: distilledThreadUnits
SELECT * FROM memory_units
 WHERE memory_scope='thread' AND scope_id=?
   AND memory_type IN ('conversation_distill','thread_center_distill','scripture_distill')
 ORDER BY freshness_score DESC, updated_at DESC, created_at DESC
 LIMIT 8

// line 471-477: distilledSourceUnits
SELECT * FROM memory_units
 WHERE memory_scope='source' AND memory_type='source_distill'
 ORDER BY freshness_score DESC, updated_at DESC, created_at DESC
 LIMIT 4
```

**重要観察**: `MEMORY-DISTILL-APPLY-V1` で投入された 12 unit は:

| カラム | 値 |
|---|---|
| `memory_scope` | `source` |
| `memory_type` | **`scripture_distill`** |
| `scope_id` | `kotodama_constitution_v1` |

→ `distilledThreadUnits` の `memory_scope='thread'` 条件で**マッチしない**。
→ `distilledSourceUnits` の `memory_type='source_distill'` 条件で**マッチしない**。
**現行 buildMemoryProjectionPack のどの query にも 12 unit はヒットしない**。

---

## Section 2: chat.ts との接続経路

### 2.1 chat.ts における memoryProjection 参照

```
api/src/routes/chat.ts:60   import { upsertConversationDistillMemoryV1, buildMemoryProjectionPack, logMemoryProjection } from "../core/memoryProjection.js";
api/src/routes/chat.ts:813  upsertConversationDistillMemoryV1({...})        ← 蒸留書き込みのみ
api/src/routes/chat.ts:831  const __pack = buildMemoryProjectionPack({ threadId: ... });
api/src/routes/chat.ts:832  if (__pack.items.length > 0) logMemoryProjection(__pack);
api/src/routes/chat.ts:3712 upsertConversationDistillMemoryV1({...})        ← 蒸留書き込みのみ
api/src/routes/chat.ts:3719 const __pack = buildMemoryProjectionPack({ threadId: ... });
api/src/routes/chat.ts:3720 if (__pack.items.length > 0) logMemoryProjection(__pack);
```

→ chat.ts での **`buildMemoryProjectionPack` 呼び出しは 2 箇所のみ** (line 831, 3719)。

### 2.2 接続経路の本質的観察

`chat.ts` line 831 周辺 (生コード抜粋):

```ts
                tryAppendMcSourceMapLedgerV1({...});
              } catch {}
              try {
                const __pack = buildMemoryProjectionPack({ threadId: String(threadId ?? "").trim() });
                if (__pack.items.length > 0) logMemoryProjection(__pack);
              } catch {}
            }
```

- **どちらの呼び出しも `persona` を渡していない** (`{ threadId }` のみ)。
- **どちらも応答生成 (LLM 呼び出し) より後** で実行されている。
- 用途は `logMemoryProjection` による **`memory_projection_logs` への記録のみ**。

→ **`buildMemoryProjectionPack` の出力は、現行 chat.ts では LLM 応答にも system prompt にも inject されていない**。

### 2.3 api/src 全体での `buildMemoryProjectionPack` 呼び出し

| 呼び出し元 | line | persona 渡し | 用途 |
|---|---|---|---|
| `api/src/routes/chat.ts` | 831 | ❌ なし | log only |
| `api/src/routes/chat.ts` | 3719 | ❌ なし | log only |
| `api/src/routes/personaStudio.ts` | 193 | ✓ あり | preview / studio UI |
| `api/src/core/personaRuntime.ts` | 44 | ✓ あり | `composePersonaPrompt` の input |

→ **persona 引数を渡す呼び出しは `personaRuntime.ts` と `personaStudio.ts` の 2 箇所のみ**。
→ さらに、`personaRuntime.resolvePersonaForRequest` を呼び出す箇所を grep すると **`api/src/` 全体に存在しない**:

```
$ grep -rnE "resolvePersonaForRequest" api/src/
api/src/core/personaRuntime.ts:15  export function resolvePersonaForRequest(args: { ... })
```

→ `personaRuntime.resolvePersonaForRequest` は **本番 chat 経路から呼ばれていない (デッドコード状態)**。
→ `personaStudio.ts` は studio UI 用 endpoint で本番 chat ではない。

### 2.4 結論: 現行 memoryProjection の chat 応答への影響

| 経路 | 現状 | 影響 |
|---|---|---|
| chat.ts line 831 / 3719 | **応答生成後** に呼ばれ、`logMemoryProjection` のみ | **応答に届かない** |
| personaRuntime.resolvePersonaForRequest | 呼び出し元なし | **応答に届かない** |
| personaStudio.ts | studio UI (preview) | 本番チャットに影響なし |

→ 副因 C-4 の核心: **memoryProjection の query を拡張しても、現行 chat 応答経路に流入させる「最後の一段」が配線されていない**。

---

## Section 3: 現行 query の動作実測

### 3.1 distilledSourceUnits 結果 (現状)

```sql
SELECT COUNT(*) FROM memory_units
 WHERE memory_scope='source' AND memory_type='source_distill';
```
→ **14 件**。LIMIT 4 で上位 4 件のみ pickup。

### 3.2 distilledThreadUnits 結果 (thread_id='default' 限定)

```sql
SELECT COUNT(*) FROM memory_units
 WHERE memory_scope='thread' AND scope_id='default'
   AND memory_type IN ('conversation_distill','thread_center_distill','scripture_distill');
```
→ **25 件**。LIMIT 8 で上位 8 件 pickup。

### 3.3 仮想拡張 query 1: source 内 source_distill + scripture_distill

```sql
SELECT COUNT(*) FROM memory_units
 WHERE memory_scope='source'
   AND memory_type IN ('source_distill', 'scripture_distill');
```
→ **26 件** (= 14 + 12)。

### 3.4 仮想拡張 query 2: scope_id 完全一致

```sql
SELECT COUNT(*) FROM memory_units
 WHERE memory_scope='source'
   AND memory_type='scripture_distill'
   AND scope_id='kotodama_constitution_v1';
```
→ **12 件** (期待通り、副因 A 修復で投入された 12 unit)。

### 3.5 12 unit のサンプル content

| id | summary head |
|---|---|
| `kotodama_constitution_v1_article_01` | 分母の固定 / 言霊の分母は 46 ではなく 50。基準は「五十連十行」… |
| `kotodama_constitution_v1_article_02` | 五十連十行を正文骨格とする / 『言霊秘書』は「五十連十行の形仮名は神代の御書なり」… |
| `kotodama_constitution_v1_article_03` | ンを分母に入れない / 「ン」は五十連の外。現代表記上の補助記号として扱うことはあっても… |
| `kotodama_constitution_v1_article_04` | ヰ・ヱを欠損扱いにしない / 現代簡略表に吸収して消してはならない… |
| `kotodama_constitution_v1_article_05` | UI表示と canonical DB を分離する… |
| `kotodama_constitution_v1_article_06` | 正典階層 / 第一位: 言霊秘書/水穂伝/火水伝/五十音言霊法則… |
| `kotodama_constitution_v1_article_07` | 実装原則 / canonical_kotodama_base を新設または再定義し… |
| `kotodama_constitution_v1_article_08` | coverage 指標の修正 / total_canonical = 50, with_entry, with_w… |
| `kotodama_constitution_v1_article_09` | 現在の問題認識 / 内部 canonical の基準が現代かな表/簡略UI に引っ張られている状況… |
| `kotodama_constitution_v1_article_10` | 直ちにやるべき監査 / kotodamaOneSoundLawIndex の総件数と分母… |
| `kotodama_constitution_v1_article_11` | 完成条件 / 分母が常に五十連十行 = 50… |
| `kotodama_constitution_v1_article_12` | 最終命令 / 観測値より先に正典分母を確認すること… |

### 3.6 全 memory_units の memory_type / memory_scope 分布 (補助観察)

| memory_scope | memory_type | cnt |
|---|---|---|
| thread | center_memory | 226,350 |
| source | source_analysis_distill | 18,012 |
| thread | conversation_distill | 6,137 |
| thread | thread_center_distill | 2,190 |
| thread | scripture_distill | **305** |
| source | source_distill | **14** |
| source | **scripture_distill** | **12** ← MEMORY-DISTILL-APPLY-V1 |
| training | training_rule | 8 |

→ `thread/scripture_distill` (305) は `distillScriptureMemory()` (line 206) が `scripture_learning_ledger` から作っている既存ルート。
→ `source/scripture_distill` (12) は本副因 A で新規投入された別系統。両者は同じ `memory_type` を共有するが scope が違う。

---

## Section 4: 最小 patch 候補 3 つ

> いずれも **本カードでは適用しない**。Phase 2 別カードで実施。

### 4.1 候補 A: query 拡張のみ (memoryProjection.ts、最小 1-2 行)

#### 概要

`distilledSourceUnits` (line 471-477) の WHERE/LIMIT を 2 点拡張するだけ。

#### 想定 diff (memoryProjection.ts)

```diff
   const distilledSourceUnits = db
     .prepare(
       `SELECT * FROM memory_units
-        WHERE memory_scope='source' AND memory_type='source_distill'
+        WHERE memory_scope='source' AND memory_type IN ('source_distill','scripture_distill')
         ORDER BY freshness_score DESC, updated_at DESC, created_at DESC
-        LIMIT 4`,
+        LIMIT 16`,
     )
     .all() as any[];
```

#### 評価

| 項目 | 値 |
|---|---|
| diff 行数 | **2 行 (実質 1 行 + LIMIT)** |
| 影響範囲 | `buildMemoryProjectionPack` のみ |
| 既存 14 件 source_distill への影響 | LIMIT 4→16 で全件 pickup になる (退行ではなく拡大) |
| 12 unit hit 件数 | 12 件 (LIMIT 16 内) |
| **chat 応答への即効性** | **ゼロ** (Section 2.4 のとおり、chat.ts 経由の `__pack` は応答に inject されない) |
| restart 必要性 | あり (api 再起動) |
| リスク | **低** (DB SELECT のみ拡張、書き込み不変) |
| ただし | **buildMemoryProjectionPack の出力を実際に LLM prompt に inject する配線追加が別途必要** |

#### 落とし穴

候補 A 単独では「DB から 12 unit を pickup できるようになる」だけで、**LLM prompt には届かない**。本気で chat 応答を変えたいなら、`personaRuntime.resolvePersonaForRequest` を chat.ts から呼び出す配線、または `__pack` を system prompt に inject するロジックが必須。
→ 「最小 diff」を満たすが「最小 効果ある diff」ではない。

### 4.2 候補 B: 新クエリ追加 (memoryProjection.ts、5-10 行)

#### 概要

`distilledScriptureUnits` (新名) を `distilledSourceUnits` の後に追加。`scope_id='kotodama_constitution_v1'` を絞り込み条件に持つ専用クエリ。

#### 想定 diff (memoryProjection.ts、line 481 直後あたり)

```diff
   const distilledSourceUnits = db
     .prepare(
       `SELECT * FROM memory_units
         WHERE memory_scope='source' AND memory_type='source_distill'
         ORDER BY freshness_score DESC, updated_at DESC, created_at DESC
         LIMIT 4`,
     )
     .all() as any[];
   for (const u of distilledSourceUnits) {
     items.push(memoryUnitToItem(u));
   }
+
+  // CARD-CONSTITUTION-MEMORY-PROJECTION-EXPAND-V1: KOTODAMA_CONSTITUTION_V1 12 条 distill を pickup
+  const distilledScriptureUnits = db
+    .prepare(
+      `SELECT * FROM memory_units
+        WHERE memory_scope='source'
+          AND memory_type='scripture_distill'
+          AND scope_id='kotodama_constitution_v1'
+        ORDER BY id ASC
+        LIMIT 12`,
+    )
+    .all() as any[];
+  for (const u of distilledScriptureUnits) {
+    items.push(memoryUnitToItem(u));
+  }
```

#### 評価

| 項目 | 値 |
|---|---|
| diff 行数 | **約 13 行** (空行含む)、実質 10 行 |
| 影響範囲 | `buildMemoryProjectionPack` のみ |
| 既存 query への影響 | ゼロ (新クエリ追加のみ、`distilledSourceUnits` 不変) |
| 12 unit hit | 確実に 12 件 (`scope_id` 完全一致) |
| **chat 応答への即効性** | **ゼロ** (候補 A と同じ理由、配線が必要) |
| restart 必要性 | あり |
| リスク | **低** (新クエリ追加、order/limit が固定で予測可能) |

#### 候補 A との違い

- candidate-A は既存 query の条件を緩める (`source_distill` + `scripture_distill` 両方混在)。
- candidate-B は別 query として追加し、scope_id 完全一致で 12 unit のみを確実に pickup。
- 両者ともに「LLM への配線」は別途必要だが、**B の方が責務が明確** (12 条専用クエリ、別 type の混入なし)。

### 4.3 候補 C: chat.ts で memory_units 直接 SELECT (5-10 行)

#### 概要

`memoryProjection.ts` を触らず、`chat.ts` の system prompt 構築フェーズに直接 SELECT を 1 ブロック追加。`PROMOTION-GATE` の clause 構築と並行する形 (`_kotodamaConstitutionV1Clause` の隣) で 12 unit の `summary` を結合した clause を作る。

#### 想定 diff (chat.ts、PROMOTION-GATE 周辺)

```diff
   // PROMOTION-GATE 起動時 clause (既存)
   const _kotodamaConstitutionV1Clause = buildKotodamaConstitutionV1Clause();
+
+  // CARD-CONSTITUTION-MEMORY-PROJECTION-EXPAND-V1: 記憶層 12 条 distill を補助 clause として注入
+  let _kotodamaConstitutionMemoryClause = "";
+  try {
+    const db = getDb("kokuzo");
+    const rows = db.prepare(
+      `SELECT id, summary FROM memory_units
+        WHERE memory_scope='source' AND memory_type='scripture_distill'
+          AND scope_id='kotodama_constitution_v1'
+        ORDER BY id ASC LIMIT 12`
+    ).all() as Array<{ id: string; summary: string }>;
+    if (rows.length > 0) {
+      _kotodamaConstitutionMemoryClause =
+        "【記憶層: 言霊憲法 V1 蒸留 (補助参照)】\n" +
+        rows.map(r => `- [${r.id}] ${r.summary}`).join("\n");
+    }
+  } catch {}
```

`__genSystemWithEvidence` 等の system prompt 結合箇所に `_kotodamaConstitutionMemoryClause` を `_kotodamaConstitutionV1Clause` の直後に追加。

#### 評価

| 項目 | 値 |
|---|---|
| diff 行数 | **約 14-18 行** (clause build + system prompt 結合の 2 箇所) |
| 影響範囲 | `chat.ts` のみ (`memoryProjection.ts` 不変) |
| 既存 PROMOTION-GATE 結果 | 不変 (新 clause 追加であり既存 clause を上書きしない) |
| 12 unit hit | 確実に 12 件、scope_id 完全一致 |
| **chat 応答への即効性** | **あり** (system prompt に直接 inject、LLM が読む) |
| restart 必要性 | あり |
| リスク | **中** (chat.ts に DB SELECT 追加、PROMOTION-GATE と二重化、prompt 総 chars 増加) |

#### 候補 A/B との違い

- A/B は **memoryProjection 経由の正しいデータパス**で 12 unit を pickup させるが、**chat.ts への配線が別途必要**。
- C は **chat.ts に直接書く即効薬**。memoryProjection 経由ではなく、独立した 14-18 行の clause builder。
- C は PROMOTION-GATE と二重化するが、**12 unit の summary (240 chars × 12 = 約 2,880 chars 程度)** が新 clause として乗る。これは 12 条本文 (2,895 chars) と内容的に重複する可能性あり (要 Phase 2 計測)。

---

## Section 5: 各候補の比較

| 候補 | diff 行 | 対象ファイル | 既存影響 | 12 unit hit | **chat 応答影響** | restart | リスク | 推奨度 |
|---|---|---|---|---|---|---|---|---|
| **A**: query 拡張 | 2 | `memoryProjection.ts` | LIMIT 拡張で既存 14 件全件化 | 12 件 (LIMIT 16 内) | **間接的** (配線追加が別途必要) | 必要 | 低 | △ (単独では不足) |
| **B**: 新クエリ追加 | 13 | `memoryProjection.ts` | ゼロ (純粋追加) | 12 件 (scope_id 厳密) | **間接的** (配線追加が別途必要) | 必要 | 低 | ○ (構造として正しい) |
| **C**: chat.ts SELECT | 14-18 | `chat.ts` | PROMOTION-GATE 並列 clause 追加 | 12 件 (scope_id 厳密) | **直接的** (system prompt に inject) | 必要 | 中 | ◎ (即効) |

### 5.1 推奨候補

**(短期推奨) 候補 C** = 即効性あり、PROMOTION-GATE と並列で 記憶層 12 条 を LLM に届ける。

**(中期推奨) 候補 B + 配線カード**:
1. (Phase 2 step1) memoryProjection.ts に `distilledScriptureUnits` 追加 (候補 B)
2. (Phase 2 step2) chat.ts line 831/3719 を、`memoryPack` を system prompt build フェーズに移し `__pack.items` を clause 化する配線カード

→ **理想的には B + 配線**で memoryProjection 経由の正規データパスが整備される。**短期には C** で即効。

### 5.2 候補 C の懸念点と緩和策

| 懸念 | 緩和策 |
|---|---|
| PROMOTION-GATE と内容重複 (合計約 5,775 chars 注入) | summary は 240 chars 制限で本文より圧縮、識別 clause タイトルで「補助参照」と明示 |
| prompt_total_length 増加 → tokenizer 圧迫 | 現状 9,326〜10,353 chars → +約 2,880 chars で 約 12-13K chars。Gemini 2.5 Flash の context 上余裕 |
| memoryProjection の責務逸脱 | C は chat.ts 内のみで完結し memoryProjection 不変。Phase 2 で B に置き換える設計 (二段) |

---

## Section 6: 想定 chat 応答変化

### 6.1 PRE 応答パターン (現状観測)

| 質問 | 現状 len | route_reason |
|---|---|---|
| 「言霊憲法 V1 第 4 条は何ですか？」 | **151** chars | NATURAL_GENERAL_LLM_TOP |
| 「言霊憲法の分母の固定とは？」 | **668** chars | NATURAL_GENERAL_LLM_TOP |
| 「こんにちは」 (T1) | 39 chars | NATURAL_GENERAL_LLM_TOP |
| 「カタカムナと言霊秘書の関係を詳しく解説してください」 (T4) | 1,079 chars | NATURAL_GENERAL_LLM_TOP |

### 6.2 POST 予測 (各候補適用後)

| 候補 | 第 4 条 (PROMOTION-GATE 効果) | 概念系「分母の固定とは？」 | T1 / T4 |
|---|---|---|---|
| A | 151 chars 維持 (system prompt 不変) | 668 chars 維持 (memoryProjection 出力は LLM に届かないため) | 退行リスク **ゼロ** (LLM prompt 不変) |
| B | 同上 | 同上 | 同上 |
| C | **151+ chars 維持または微増** | **800-1000 chars 増加余地** (新 clause で article_01 summary が直接読める) | T1 39 維持、T4 +50-100 chars 余地 |

**候補 C のみが chat 応答長 / 内容の即時改善**を期待できる。A/B は配線追加カードと併せて初めて効く。

### 6.3 PromptTrace 影響予測

| clause | 現状 | A/B 単独 | C |
|---|---|---|---|
| `khs_constitution` | 1,148 | 不変 | 不変 |
| `kotodama_constitution_v1` | **2,895** (PROMOTION-GATE 結果保護) | 不変 | 不変 |
| (新) `kotodama_constitution_memory` | n/a | n/a | **+2,000〜2,900** (新 clause) |
| `prompt_total_length` | 9,326〜10,353 | 不変 | **+2,000〜2,900** |

→ **既存 `kotodama_constitution_v1=2895` clause は全候補で保護される**。

---

## Section 7: 既存修復結果の保護

| 項目 | 期待 | 実測 | 保護 |
|---|---|---|---|
| 第 4 条 chat 応答 | 144+ chars | **151 chars** | ✓ |
| `memory_units WHERE scope_id='kotodama_constitution_v1'` | 12 | **12** | ✓ |
| `clause_lengths.kotodama_constitution_v1` | 2,895 | **2,895** (3 件全て) | ✓ |
| KOTODAMA_CONSTITUTION_V1.txt sha256 | `3eec7403…1cbab` | **完全一致** | ✓ |
| `kotodama_constitution_enforcer.verdict` | clean | **clean** | ✓ |
| `acceptance.verdict` (3 連続) | PASS | **PASS / PASS / PASS** | ✓ |

---

## Section 8: doctor v2 sample (0.26) との関係

`kotodama_50_coverage = 0.26` は 50 音骨格カバレッジの観測値。各候補適用後の予測:

| 候補 | 予測 coverage | 根拠 |
|---|---|---|
| A 単独 | 0.26 → **0.26** (ほぼ変化なし) | LLM prompt に届かない |
| A + 配線カード | 0.26 → **0.32〜0.40** | memoryProjection 経由で 12 unit が LLM に届く |
| B 単独 | 0.26 → **0.26** (ほぼ変化なし) | LLM prompt に届かない |
| B + 配線カード | 0.26 → **0.35〜0.45** | scope_id 厳密で article_01 (分母) / article_08 (coverage) / article_11 (完成条件) が確実に LLM 視野に |
| C 単独 | 0.26 → **0.40〜0.50** | system prompt に直接 inject、即効 |
| **C + 副因 C-1〜C-3 統合 (前 OBSERVE V1 推奨)** | 0.26 → **0.50〜0.60** | route 流路 + 構造 bind + 記憶層が三層揃う |

---

## Section 9: Phase 2 投入計画

### 9.1 推奨段取り (2 phase)

#### Phase 2-α (短期、即効優先): 候補 C 単独適用

- カード名: `CARD-CONSTITUTION-MEMORY-PROJECTION-CHAT-CLAUSE-V1`
- 対象: `chat.ts` のみ (約 14-18 行追加)
- effective: kotodama_50_coverage 即時 +0.14〜+0.24 期待
- restart: tenmon-ark-api 1 回必要

#### Phase 2-β (中期、構造健全化): 候補 B + 配線カード

- カード 1: `CARD-MEMORY-PROJECTION-DISTILLED-SCRIPTURE-V1` (memoryProjection.ts に `distilledScriptureUnits` 追加、候補 B)
- カード 2: `CARD-CHAT-PERSONA-RUNTIME-WIRING-V1` (chat.ts から `personaRuntime.resolvePersonaForRequest` を呼び出す配線)
- effective: 正規データパス完成

#### 任意 Phase 2-γ (副因 C-1〜C-3 修復): 前 OBSERVE V1 推奨シナリオ 4 適用

- thread_center_memory に kotodama_constitution_v1 entry
- persona_knowledge_bindings に 12 条 bind
- thread_persona_links 整理

### 9.2 acceptance 条件 (Phase 2-α 候補 C カード)

- 第 4 条 chat 応答 144+ chars 維持
- `clause_lengths.kotodama_constitution_v1 == 2895` 維持
- 新 clause `kotodama_constitution_memory` length > 0
- T1 / T4 退行なし
- acceptance.verdict = PASS x3
- enforcer.verdict = clean
- DB 件数完全一致 (write ゼロ、12 unit 不変)

### 9.3 rollback 手順 (Phase 2-α)

1. `git revert <commit>` で chat.ts を巻き戻し
2. `npm run build` && `systemctl restart tenmon-ark-api`
3. PROMOTION-GATE 単独運用に戻る (現状と同等)

### 9.4 成功判定 (Phase 2-α POST)

- `clause_lengths.kotodama_constitution_memory` ≧ 1500 chars が安定
- doctor v2 `kotodama_50_coverage` ≧ 0.40
- acceptance / enforcer 連続 PASS

---

## Section 10: TENMON 裁定用サマリー

### 観測結論

1. `memoryProjection.ts` 全 573 行・5 query 完全把握。
2. **現行 5 query のいずれも、12 unit (`memory_scope='source'`/`memory_type='scripture_distill'`/`scope_id='kotodama_constitution_v1'`) にマッチしない**。
3. `chat.ts` の `buildMemoryProjectionPack` 呼び出し 2 箇所はいずれも **応答生成後**のログ用途であり、`personaRuntime.resolvePersonaForRequest` は **本番経路から呼ばれていない**。
4. → `memoryProjection` 経由で 12 unit を chat に届けるには **query 拡張 + 配線追加** の 2 段が必要。

### 3 候補

- **A**: memoryProjection.ts query 拡張 (1-2 行) — **配線なしでは効果ゼロ**
- **B**: memoryProjection.ts に新 query 追加 (約 13 行) — 構造が綺麗、**配線なしでは効果ゼロ**
- **C**: chat.ts に直接 SELECT + system prompt inject (約 14-18 行) — **単独で即効**

### 推奨

| 短期 (即効) | **候補 C 単独** (Phase 2-α) |
| 中期 (構造) | **候補 B + 配線カード** (Phase 2-β) |
| 長期 | C 適用後に B + 配線で置き換え (二段運用) |

### 既存修復保護

- PROMOTION-GATE (clause 2,895 chars): ✓ 維持
- MEMORY-DISTILL (memory_units 12 unit): ✓ 維持
- enforcer.verdict: ✓ clean
- acceptance.verdict: ✓ PASS x3

### Acceptance (本レポート自身)

- [x] 実装変更ゼロ (memoryProjection.ts / chat.ts / DB / migration 全て不変)
- [x] DB write ゼロ (sqlite3 -readonly のみ)
- [x] 3 candidate 全て diff サンプル + 評価表記述
- [x] 推奨候補確定 (短期=C、中期=B+配線)
- [x] TENMON が Phase 2 候補を裁定できる状態

---

## 補助観測: 全状態 (本カード Acceptance #11-21 の根拠)

| 項目 | 値 |
|---|---|
| `tenmon-ark-api` MainPID | **1063225** (active 維持) |
| nginx (master) | **891111** (active 維持) |
| `tenmon-runtime-watchdog` PID | 1608174 (前回 1600407 から自然変動、systemd 周期再起動) |
| `tenmon-auto-patch` | **inactive / disabled 維持** |
| `mc-collect-live/handoff/git/all` | inactive / static (本来状態維持) |
| `acceptance.verdict` (3 連続) | **PASS / PASS / PASS** |
| `kotodama_constitution_enforcer.verdict` | **clean** (intelligence endpoint) |
| `/pwa/evolution` | **HTTP/2 200** |
| `KOTODAMA_CONSTITUTION_V1.txt` SHA256 | `3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab` |
| `memory_units WHERE scope_id='kotodama_constitution_v1'` | **12** (不変) |
| 第 4 条 chat 応答 | **151 chars** ✓ |
| 概念系 (分母固定) chat 応答 | **668 chars** |
| T1 (こんにちは) chat 応答 | **39 chars** |
| T4 (カタカムナ×言霊秘書) chat 応答 | **1,079 chars** |
| `clause_lengths.kotodama_constitution_v1` | **2,895** (3 件全件) |
| git diff vs `91ffc3e2` | 本レポート 1 通追加のみ (期待) |

---

(End of CONSTITUTION_MEMORY_PROJECTION_EXPAND_OBSERVE_V1)
