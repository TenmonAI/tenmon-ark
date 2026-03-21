# 04_FINAL_DB_REALITY_REPORT — 完成版 DB 実態レポート

**根拠**: DB 実測（/opt/tenmon-ark-repo/kokuzo.sqlite、全 7 テーブル 0 件）/ api/src/db/index.ts の getDbPath, getDb の存在。憶測は可能性の列挙に限定。

---

## kokuzo.sqlite の実在評価

- **パス**: 確定観測で DB=/opt/tenmon-ark-repo/kokuzo.sqlite とされている。api/src/db/index.ts に getDbPath(kind), getDb(kind) が存在し、kind "kokuzo" 用のパス解決が実装されている。
- **テーブル**: kokuzo_pages, khs_laws, khs_units, scripture_learning_ledger, thread_center_memory, synapse_log, book_continuation_memory が言及されている。
- **実測**: 上記いずれも **COUNT = 0**。

---

## 0 件問題の原因候補整理

| 候補 | 内容 | 切り分け方法 |
|------|------|----------------|
| runtime DB 不一致 | 実行時に別の DB ファイルを開いている | getDbPath("kokuzo") の戻り値を実行時ログまたは一時ログで取得。実際に開いているファイルパスと /opt/tenmon-ark-repo/kokuzo.sqlite が一致するか確認。 |
| migration 未実行 | スキーマはあるがテーブルが作成されていない | sqlite3 で .tables または schema を表示。テーブル存在するが 0 件か、テーブル自体がないかを確認。 |
| seed 未投入 | 一度も insert していない | 既存 seed スクリプトの有無。手動で 1 件 insert して COUNT が増えるか。 |
| write path 未発火 | saveThreadCore / upsertThreadCenter / writeScriptureLearningLedger / upsertBookContinuation が呼ばれていない、または失敗している | 該当関数に一時ログを入れ、実行回数と成功/失敗を確認。 |
| ingest 未接続 | kokuzo_pages / khs_laws / khs_units への ingest パイプラインが動いていない | それらを書きにいくコードが実行されているか。KHS 中枢は「言灵中枢」として唯一であるが、現時点で実体が 0 件。 |

---

## KHS / kokuzo / ledger / continuity / synapse / book memory の実装実体評価

| 対象 | コード上の役割（ファイル名） | 実測 |
|------|------------------------------|------|
| khs_laws, khs_units | 法・ユニット。検索・recall で参照される想定。 | 0 件。 |
| kokuzo_pages | ページテキスト。検索でヒットする想定。 | 0 件。 |
| scripture_learning_ledger | writeScriptureLearningLedger で書く想定。 | 0 件。 |
| thread_center_memory | upsertThreadCenter, loadThreadCore（threadCoreStore が参照する可能性）で読む想定。 | 0 件。 |
| synapse_log | writeSynapseLogV1 等で書く想定。 | 0 件。 |
| book_continuation_memory | upsertBookContinuation（chat.ts 7988 で「本を書いて」時に呼ばれる）。 | 0 件。 |

---

## 器だけで中身が空の層の列挙

1. **thread_center_memory** — continuity の「前の center」が常に空。
2. **scripture_learning_ledger** — 学習・解像度の蓄積なし。
3. **kokuzo_pages / khs_laws / khs_units** — KHS 言灵中枢の実体が未投入。
4. **synapse_log** — route 集計が実行時ログに依存。
5. **book_continuation_memory** — 書籍継続が空（upsert は呼ばれていても、同一 DB に書けているか要確認）。

---

## DB reality check の最小カード化案

**cardId: CARD_DB_REALITY_CHECK_AND_SEED_V1**

- **目的**: (1) getDb("kokuzo") または実 runtime path が参照する DB 絶対パスを実行時で 1 回記録する。(2) **実運用経路**（API または既存 write 関数）からその DB に write が発火した証拠を採取する。(3) 指定テーブルで COUNT ≥ 1 を確認する。
- **対象**: 原則として新規スクリプトまたは既存 seed。アプリ本体は一時ログ（write 通過・パス記録）のみ。
- **acceptance**（「1件増えた」だけでなく「実運用経路からその DB に書かれた」まで含む）:
  - getDb("kokuzo") または実 runtime path が参照している DB 絶対パスを 1 回記録する。
  - その実 path に対して write が発火した証拠を採取する: **API call 時刻**、**write 関数通過ログ**、**COUNT before / after**。
  - 指定テーブルで COUNT ≥ 1 であること。
  - 既通過主権の probe が従来どおりであること。
- **封印条件**: acceptance 未達なら封印。

**次の1枚**: [05_FINAL_WORLD_CLASS_GAP_REPORT.md](./05_FINAL_WORLD_CLASS_GAP_REPORT.md)
