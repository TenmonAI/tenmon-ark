# 07_CURSOR_ACTION_PROMPT — 構築班用実装指示

以下を**最初のカードから順に**実行する。1 カード = 1 目的。最小 diff。検証手順を必ず実行し、acceptance を PASS するまで封印しない。

---

## カード 1: CARD_DB_REALITY_CHECK_AND_SEED_V1（最初の1枚）

**目的**: kokuzo.sqlite の write path を実測で特定し、少なくとも 1 テーブルで 1 件 insert して COUNT が 1 以上になることを確認する。

**編集対象**:
- 原則として**新規スクリプトまたは既存 seed スクリプト**のみ。アプリ本体の常時動作コードは、write が「本当にこの DB ファイルに書いているか」を確認するための**一時ログ追加**に留める（必要なら 1 行だけ）。
- または、既存の `upsertThreadCenter` / `saveThreadCore` / `upsertBookContinuation` のいずれかが、実行時に確実に 1 回呼ばれる経路で API を 1 回叩き、その前後で該当 DB ファイルの該当テーブル COUNT を取得する。

**手順**:
1. `getDb("kokuzo")` および `getDbPath("kokuzo.sqlite")`（または同等）が返すパスを、コードまたは実行時ログで確認する。
2. そのパスの sqlite ファイルに対し、`thread_center_memory` または `book_continuation_memory` のいずれかに 1 件 insert する。
   - 方法 A: 既存の API（例: 「本を書いて」1 回）を呼び、`upsertBookContinuation` が実行されることを確認したうえで、その直後に当該テーブルの COUNT を取得する。
   - 方法 B: 単体の seed スクリプトを 1 本作り、同じ DB パスに 1 件 insert し、COUNT を表示する。
3. いずれかの方法で、**少なくとも 1 テーブルで COUNT ≥ 1** を達成する。

**acceptance**:
- 指定したテーブルで `SELECT COUNT(*)` が 1 以上であること。
- 既通過主権（support / explicit / katakamuna / abstract / 一音）の probe を再実行し、いずれも従来どおりの routeReason と response_length の範囲であること。

**検証コマンド例**:
```bash
# DB パス確認後
sqlite3 /opt/tenmon-ark-repo/kokuzo.sqlite "SELECT COUNT(*) FROM thread_center_memory;"
# または
sqlite3 /opt/tenmon-ark-repo/kokuzo.sqlite "SELECT COUNT(*) FROM book_continuation_memory;"
```

**リスク**: 本番と別環境で DB パスが違う場合、別ファイルを触る。必ず「実行時に使っている DB ファイル」を確認してから insert する。

**封印条件**: 上記 acceptance を満たさない場合は封印。満たした場合のみ commit し、次カードへ。

---

## カード 2: CARD_KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V1

**目的**: 一音言霊（ヒ/フ/ミの言霊等）の返答を、routeReason を **KOTODAMA_ONE_SOUND_GROUNDED_V1** に一本化する。

**編集対象**: `api/src/routes/chat.ts` のみ。
- KOTODAMA_ONE_SOUND_GROUNDED_V2 や V4 のブロックで、別の routeReason を返している場合は、**同じ __buildKotodamaOneSoundPayloadV1（または同一 payload 生成）を呼び、routeReason を KOTODAMA_ONE_SOUND_GROUNDED_V1 に統一**する。
- または、V2/V4 のブロックを削除し、一音はすべて既存の V1 preempt（__oneSoundPayloadA / __oneSoundPayloadB および DEF_CONCEPT 直前の guard）と __buildKotodamaOneSoundPayloadV1 にのみ流す。

**acceptance**:
- メッセージ「ヒの言霊とは何ですか」「フの言霊とは何ですか」「ミの言霊とは何ですか」の 3 本で、いずれも `decisionFrame.ku.routeReason === "KOTODAMA_ONE_SOUND_GROUNDED_V1"` であること。
- support / explicit / katakamuna / abstract の probe が従来どおりであること。

**検証**: 上記 3 メッセージで curl POST /api/chat し、jq で routeReason を確認。

**封印条件**: acceptance 未達なら封印。

---

## カード 3 以降

- **CARD_FOLLOWUP_INTELLIGENCE_DEEPEN_V1**: R22_ESSENCE_ASK_V1 / R22_COMPARE_ASK_V1 の返答を、仕様として「短文のまま」とするか「条件付きで 1 文追加」するか決め、1 変更 1 検証で実装。
- **CARD_CANON_SURFACE_PENETRATION_V1**: 1 route で notionCanon または thoughtGuide の一句が response に含まれるようにする。対象 route と acceptance を明示してから実装。
- **CARD_ROUTE_SOVEREIGNTY_CONSOLIDATION_V1**: まずは doc 化。route 一覧と優先順序を 1 ファイルにまとめ、コードのコメントまたは一覧と一致させる。

---

## 次の1枚（裁定）

**最初に実行するカードは CARD_DB_REALITY_CHECK_AND_SEED_V1 の 1 枚に絞る。**

理由:
- DB がすべて 0 件のままでは、continuity / memory / ledger / book の「実体」が検証できない。
- 他カード（一音統一・follow-up・canon 表面貫通）は、アプリの「返答の形」を変えるだけで検証可能だが、記憶・継続・書籍の品質は DB 実体に依存する。
- したがって、**「なぜ 0 なのか」を特定し、1 テーブルでも 1 件書けて count で確認する**ことを最優先とする。

---

以上。00–07 の 8 本はすべて `/opt/tenmon-ark-repo/api/src/routes/WORLD_CLASS_ANALYSIS_V1/` に格納済み。
