-- ============================================================================
-- CARD-CONSTITUTION-MEMORY-DISTILL-V1
-- KOTODAMA_CONSTITUTION_V1 12 条を memory_units に蒸留する idempotent migration
-- ============================================================================
--
-- 目的:
--   docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt (sha256:
--   3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab) の
--   12 条本文を memory_units に scope_id='kotodama_constitution_v1' で
--   蒸留する。これにより記憶層検索で憲法が hit する。
--
-- 設計原則:
--   - INSERT OR IGNORE で冪等 (再適用安全、何度実行しても 12 件のみ存在)
--   - BEGIN TRANSACTION / COMMIT で整合性保護
--   - memory_scope='source', memory_type='scripture_distill' (既存パターン準拠)
--   - id は kotodama_constitution_v1_article_NN (PK 衝突回避で固定)
--   - 12 条本文を改変・要約・捏造しない (raw 転記、source seed script で検証)
--
-- 適用方法 (TENMON 裁定後、別 ONE_STEP で手動実行):
--   sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite \
--     < api/migrations/2026042500_kotodama_constitution_distill_v1.sql
--
-- 適用後 verify:
--   sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite \
--     "SELECT COUNT(*) FROM memory_units WHERE scope_id='kotodama_constitution_v1';"
--   期待: 12
--
-- rollback (もし必要):
--   sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite <<EOF
--   BEGIN TRANSACTION;
--   DELETE FROM memory_units
--    WHERE scope_id='kotodama_constitution_v1'
--      AND id LIKE 'kotodama_constitution_v1_article_%';
--   COMMIT;
--   EOF
--
-- 生成 source: api/scripts/seed_kotodama_constitution_v1.mjs --dry-run --sql
-- 生成日時: 2026-04-25
-- ============================================================================

BEGIN TRANSACTION;

-- 第 分母の固定 条
INSERT OR IGNORE INTO memory_units
  (id, memory_scope, scope_id, memory_type, title, summary,
   structured_json, evidence_json, confidence, freshness_score, pinned,
   created_at, updated_at)
VALUES (
  'kotodama_constitution_v1_article_01',
  'source',
  'kotodama_constitution_v1',
  'scripture_distill',
  '言霊憲法 V1 第1条 分母の固定',
  '分母の固定

言霊の分母は 46 ではなく 50。基準は「五十連十行」である。
『言霊秘書』には「其数五十。不可加一減一」とある。
coverage / completeness / canonical count / one_sound index の分母は
常に五十連十行 = 50 を基準とする。
46音前提の表示は現代表記の便宜であって、正典基準ではない。',
  '{"article_no":1,"article_title":"分母の固定","source":"KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","seal":"kotodama_constitution_v1","scriptureKey":"kotodama_constitution_v1","resolvedLevel":"scripture"}',
  '{"source_table":"KOTODAMA_CONSTITUTION_V1.txt","source_path":"docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","article_no":1,"promoted_from":"CARD-CONSTITUTION-MEMORY-DISTILL-V1","hasEvidence":true,"hasLawTrace":true,"createdAt":"2026-04-25T00:00:00.000Z"}',
  1,
  1,
  1,
  '2026-04-25T00:00:00.000Z',
  '2026-04-25T00:00:00.000Z'
);

-- 第 五十連十行を正文骨格とする 条
INSERT OR IGNORE INTO memory_units
  (id, memory_scope, scope_id, memory_type, title, summary,
   structured_json, evidence_json, confidence, freshness_score, pinned,
   created_at, updated_at)
VALUES (
  'kotodama_constitution_v1_article_02',
  'source',
  'kotodama_constitution_v1',
  'scripture_distill',
  '言霊憲法 V1 第2条 五十連十行を正文骨格とする',
  '五十連十行を正文骨格とする

『言霊秘書』は「五十連十行の形仮名は神代の御書なり」と述べる。
内部 canonical DB は、以下を保持すること:
- 行
- 段
- 位相
- 音
- 水火分類
- 正典本文
- 出典ページ
- 文字形差
- 同音異位相
内部 canonical DB は「文字」ではなく「五十連十行上の存在位置」を基準に持つ。',
  '{"article_no":2,"article_title":"五十連十行を正文骨格とする","source":"KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","seal":"kotodama_constitution_v1","scriptureKey":"kotodama_constitution_v1","resolvedLevel":"scripture"}',
  '{"source_table":"KOTODAMA_CONSTITUTION_V1.txt","source_path":"docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","article_no":2,"promoted_from":"CARD-CONSTITUTION-MEMORY-DISTILL-V1","hasEvidence":true,"hasLawTrace":true,"createdAt":"2026-04-25T00:00:00.000Z"}',
  1,
  1,
  1,
  '2026-04-25T00:00:00.000Z',
  '2026-04-25T00:00:00.000Z'
);

-- 第 ンを分母に入れない 条
INSERT OR IGNORE INTO memory_units
  (id, memory_scope, scope_id, memory_type, title, summary,
   structured_json, evidence_json, confidence, freshness_score, pinned,
   created_at, updated_at)
VALUES (
  'kotodama_constitution_v1_article_03',
  'source',
  'kotodama_constitution_v1',
  'scripture_distill',
  '言霊憲法 V1 第3条 ンを分母に入れない',
  'ンを分母に入れない

「ン」は五十連の外。現代表記上の補助記号として扱うことはあっても、
五十連正典の総数に含めない。',
  '{"article_no":3,"article_title":"ンを分母に入れない","source":"KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","seal":"kotodama_constitution_v1","scriptureKey":"kotodama_constitution_v1","resolvedLevel":"scripture"}',
  '{"source_table":"KOTODAMA_CONSTITUTION_V1.txt","source_path":"docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","article_no":3,"promoted_from":"CARD-CONSTITUTION-MEMORY-DISTILL-V1","hasEvidence":true,"hasLawTrace":true,"createdAt":"2026-04-25T00:00:00.000Z"}',
  1,
  1,
  1,
  '2026-04-25T00:00:00.000Z',
  '2026-04-25T00:00:00.000Z'
);

-- 第 ヰ・ヱを欠損扱いにしない 条
INSERT OR IGNORE INTO memory_units
  (id, memory_scope, scope_id, memory_type, title, summary,
   structured_json, evidence_json, confidence, freshness_score, pinned,
   created_at, updated_at)
VALUES (
  'kotodama_constitution_v1_article_04',
  'source',
  'kotodama_constitution_v1',
  'scripture_distill',
  '言霊憲法 V1 第4条 ヰ・ヱを欠損扱いにしない',
  'ヰ・ヱを欠損扱いにしない

ヰ・ヱは現代簡略表に吸収して消してはならない。
見かけ上同じ「イ」「エ」に見えても、
ア行・ヤ行・ワ行などにおける位相差は保持する。
「同字形に見えるから統合する」のではなく、
「五十連上の位置が異なるなら別存在として保持する」。',
  '{"article_no":4,"article_title":"ヰ・ヱを欠損扱いにしない","source":"KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","seal":"kotodama_constitution_v1","scriptureKey":"kotodama_constitution_v1","resolvedLevel":"scripture"}',
  '{"source_table":"KOTODAMA_CONSTITUTION_V1.txt","source_path":"docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","article_no":4,"promoted_from":"CARD-CONSTITUTION-MEMORY-DISTILL-V1","hasEvidence":true,"hasLawTrace":true,"createdAt":"2026-04-25T00:00:00.000Z"}',
  1,
  1,
  1,
  '2026-04-25T00:00:00.000Z',
  '2026-04-25T00:00:00.000Z'
);

-- 第 UI表示と canonical DB を分離する 条
INSERT OR IGNORE INTO memory_units
  (id, memory_scope, scope_id, memory_type, title, summary,
   structured_json, evidence_json, confidence, freshness_score, pinned,
   created_at, updated_at)
VALUES (
  'kotodama_constitution_v1_article_05',
  'source',
  'kotodama_constitution_v1',
  'scripture_distill',
  '言霊憲法 V1 第5条 UI表示と canonical DB を分離する',
  'UI表示と canonical DB を分離する

簡略表示UIは許容する。ただし内部 canonical DB は絶対に簡略化しない。
表示用46 / 正典50 / 補助記号 / 現代仮名 / 古形 / 異位相同音
これらを混線させない。UI都合で canonical を書き換えることは禁止。',
  '{"article_no":5,"article_title":"UI表示と canonical DB を分離する","source":"KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","seal":"kotodama_constitution_v1","scriptureKey":"kotodama_constitution_v1","resolvedLevel":"scripture"}',
  '{"source_table":"KOTODAMA_CONSTITUTION_V1.txt","source_path":"docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","article_no":5,"promoted_from":"CARD-CONSTITUTION-MEMORY-DISTILL-V1","hasEvidence":true,"hasLawTrace":true,"createdAt":"2026-04-25T00:00:00.000Z"}',
  1,
  1,
  1,
  '2026-04-25T00:00:00.000Z',
  '2026-04-25T00:00:00.000Z'
);

-- 第 正典階層 条
INSERT OR IGNORE INTO memory_units
  (id, memory_scope, scope_id, memory_type, title, summary,
   structured_json, evidence_json, confidence, freshness_score, pinned,
   created_at, updated_at)
VALUES (
  'kotodama_constitution_v1_article_06',
  'source',
  'kotodama_constitution_v1',
  'scripture_distill',
  '言霊憲法 V1 第6条 正典階層',
  '正典階層

第一位: 『言霊秘書』『水穂伝』『火水伝』『五十音言霊法則』『水穂伝重解誌一言法則』
第二位: 稲荷古伝・布斗麻邇御靈系の正文参照
第三位: カタカムナ（圧縮核として参照）
第四位: 特設ページ、UI説明文、比較資料
UIページや説明用JSONが『言霊秘書』を上書きすることは許されない。',
  '{"article_no":6,"article_title":"正典階層","source":"KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","seal":"kotodama_constitution_v1","scriptureKey":"kotodama_constitution_v1","resolvedLevel":"scripture"}',
  '{"source_table":"KOTODAMA_CONSTITUTION_V1.txt","source_path":"docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","article_no":6,"promoted_from":"CARD-CONSTITUTION-MEMORY-DISTILL-V1","hasEvidence":true,"hasLawTrace":true,"createdAt":"2026-04-25T00:00:00.000Z"}',
  1,
  1,
  1,
  '2026-04-25T00:00:00.000Z',
  '2026-04-25T00:00:00.000Z'
);

-- 第 実装原則 条
INSERT OR IGNORE INTO memory_units
  (id, memory_scope, scope_id, memory_type, title, summary,
   structured_json, evidence_json, confidence, freshness_score, pinned,
   created_at, updated_at)
VALUES (
  'kotodama_constitution_v1_article_07',
  'source',
  'kotodama_constitution_v1',
  'scripture_distill',
  '言霊憲法 V1 第7条 実装原則',
  '実装原則

canonical_kotodama_base を新設または再定義し、
source_of_truth を『言霊秘書』に固定する。

各音の必須フィールド:
- canonical_id
- 五十連上の位置
- 行
- 段
- 位相
- 音
- 水火分類
- 正典本文要約
- textual_grounding
- source_page
- source_text_ref
- modern_alias
- ui_alias
- confidence
- notes

現代用 alias は持ってよいが、canonical 本体を書き換えてはならない。',
  '{"article_no":7,"article_title":"実装原則","source":"KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","seal":"kotodama_constitution_v1","scriptureKey":"kotodama_constitution_v1","resolvedLevel":"scripture"}',
  '{"source_table":"KOTODAMA_CONSTITUTION_V1.txt","source_path":"docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","article_no":7,"promoted_from":"CARD-CONSTITUTION-MEMORY-DISTILL-V1","hasEvidence":true,"hasLawTrace":true,"createdAt":"2026-04-25T00:00:00.000Z"}',
  1,
  1,
  1,
  '2026-04-25T00:00:00.000Z',
  '2026-04-25T00:00:00.000Z'
);

-- 第 coverage 指標の修正 条
INSERT OR IGNORE INTO memory_units
  (id, memory_scope, scope_id, memory_type, title, summary,
   structured_json, evidence_json, confidence, freshness_score, pinned,
   created_at, updated_at)
VALUES (
  'kotodama_constitution_v1_article_08',
  'source',
  'kotodama_constitution_v1',
  'scripture_distill',
  '言霊憲法 V1 第8条 coverage 指標の修正',
  'coverage 指標の修正

- total_canonical = 50
- with_entry
- with_water_fire
- with_textual_grounding
- with_source_page
- with_shape_position
- with_modern_alias

「46で100%」のような表示は正典分母の誤設定である可能性が高く、今後は禁止。',
  '{"article_no":8,"article_title":"coverage 指標の修正","source":"KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","seal":"kotodama_constitution_v1","scriptureKey":"kotodama_constitution_v1","resolvedLevel":"scripture"}',
  '{"source_table":"KOTODAMA_CONSTITUTION_V1.txt","source_path":"docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","article_no":8,"promoted_from":"CARD-CONSTITUTION-MEMORY-DISTILL-V1","hasEvidence":true,"hasLawTrace":true,"createdAt":"2026-04-25T00:00:00.000Z"}',
  1,
  1,
  1,
  '2026-04-25T00:00:00.000Z',
  '2026-04-25T00:00:00.000Z'
);

-- 第 現在の問題認識 条
INSERT OR IGNORE INTO memory_units
  (id, memory_scope, scope_id, memory_type, title, summary,
   structured_json, evidence_json, confidence, freshness_score, pinned,
   created_at, updated_at)
VALUES (
  'kotodama_constitution_v1_article_09',
  'source',
  'kotodama_constitution_v1',
  'scripture_distill',
  '言霊憲法 V1 第9条 現在の問題認識',
  '現在の問題認識

内部 canonical の基準が現代かな表・簡略UI・観測用配列に引っ張られている状況を是正する。
特に危険なのは以下:
- 46を分母にして completion を出すこと
- ヰ・ヱを実質欠損扱いにすること
- 五十連十行の位相差を潰すこと
- explanation layer を canonical layer と誤認すること
- coverage 100% を「正典完成」と誤認すること',
  '{"article_no":9,"article_title":"現在の問題認識","source":"KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","seal":"kotodama_constitution_v1","scriptureKey":"kotodama_constitution_v1","resolvedLevel":"scripture"}',
  '{"source_table":"KOTODAMA_CONSTITUTION_V1.txt","source_path":"docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","article_no":9,"promoted_from":"CARD-CONSTITUTION-MEMORY-DISTILL-V1","hasEvidence":true,"hasLawTrace":true,"createdAt":"2026-04-25T00:00:00.000Z"}',
  1,
  1,
  1,
  '2026-04-25T00:00:00.000Z',
  '2026-04-25T00:00:00.000Z'
);

-- 第 直ちにやるべき監査 条
INSERT OR IGNORE INTO memory_units
  (id, memory_scope, scope_id, memory_type, title, summary,
   structured_json, evidence_json, confidence, freshness_score, pinned,
   created_at, updated_at)
VALUES (
  'kotodama_constitution_v1_article_10',
  'source',
  'kotodama_constitution_v1',
  'scripture_distill',
  '言霊憲法 V1 第10条 直ちにやるべき監査',
  '直ちにやるべき監査

1. kotodamaOneSoundLawIndex の総件数と分母
2. deepIntelligenceMapV1 の total / coverage の分母
3. ヰ・ヱ・同音異位相の保持状況
4. 各音の『言霊秘書』ページ紐付け状況
5. UI簡略表が canonical を上書きしていないか',
  '{"article_no":10,"article_title":"直ちにやるべき監査","source":"KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","seal":"kotodama_constitution_v1","scriptureKey":"kotodama_constitution_v1","resolvedLevel":"scripture"}',
  '{"source_table":"KOTODAMA_CONSTITUTION_V1.txt","source_path":"docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","article_no":10,"promoted_from":"CARD-CONSTITUTION-MEMORY-DISTILL-V1","hasEvidence":true,"hasLawTrace":true,"createdAt":"2026-04-25T00:00:00.000Z"}',
  1,
  1,
  1,
  '2026-04-25T00:00:00.000Z',
  '2026-04-25T00:00:00.000Z'
);

-- 第 完成条件 条
INSERT OR IGNORE INTO memory_units
  (id, memory_scope, scope_id, memory_type, title, summary,
   structured_json, evidence_json, confidence, freshness_score, pinned,
   created_at, updated_at)
VALUES (
  'kotodama_constitution_v1_article_11',
  'source',
  'kotodama_constitution_v1',
  'scripture_distill',
  '言霊憲法 V1 第11条 完成条件',
  '完成条件

- 分母が常に五十連十行 = 50
- 各音の説明が『言霊秘書』本文へ遡及できる
- coverage が正典基準で算出される
- simplified UI と canonical DB が分離されている
- ヰ・ヱ・位相差が保持されている
- 46音誤認に再落下しない
- Claude/GPT/Cursor の誰が見ても基準が揺れない',
  '{"article_no":11,"article_title":"完成条件","source":"KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","seal":"kotodama_constitution_v1","scriptureKey":"kotodama_constitution_v1","resolvedLevel":"scripture"}',
  '{"source_table":"KOTODAMA_CONSTITUTION_V1.txt","source_path":"docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","article_no":11,"promoted_from":"CARD-CONSTITUTION-MEMORY-DISTILL-V1","hasEvidence":true,"hasLawTrace":true,"createdAt":"2026-04-25T00:00:00.000Z"}',
  1,
  1,
  1,
  '2026-04-25T00:00:00.000Z',
  '2026-04-25T00:00:00.000Z'
);

-- 第 最終命令 条
INSERT OR IGNORE INTO memory_units
  (id, memory_scope, scope_id, memory_type, title, summary,
   structured_json, evidence_json, confidence, freshness_score, pinned,
   created_at, updated_at)
VALUES (
  'kotodama_constitution_v1_article_12',
  'source',
  'kotodama_constitution_v1',
  'scripture_distill',
  '言霊憲法 V1 第12条 最終命令',
  '最終命令

天聞アークの言霊に関する判断では、
「観測値」より先に「正典分母」を確認すること。
数値が正しくても、分母が誤っていれば、その完成判定は無効である。

言霊の source of truth は、必ず『言霊秘書』である。
これを憲法として固定する。',
  '{"article_no":12,"article_title":"最終命令","source":"KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","seal":"kotodama_constitution_v1","scriptureKey":"kotodama_constitution_v1","resolvedLevel":"scripture"}',
  '{"source_table":"KOTODAMA_CONSTITUTION_V1.txt","source_path":"docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt","source_sha256":"3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab","article_no":12,"promoted_from":"CARD-CONSTITUTION-MEMORY-DISTILL-V1","hasEvidence":true,"hasLawTrace":true,"createdAt":"2026-04-25T00:00:00.000Z"}',
  1,
  1,
  1,
  '2026-04-25T00:00:00.000Z',
  '2026-04-25T00:00:00.000Z'
);

COMMIT;

-- ============================================================================
-- VERIFY (apply 後に実行可)
-- ============================================================================
-- SELECT COUNT(*) AS distilled_count FROM memory_units
--  WHERE scope_id='kotodama_constitution_v1';
-- 期待: 12
--
-- SELECT id, title, SUBSTR(summary, 1, 30) AS head FROM memory_units
--  WHERE scope_id='kotodama_constitution_v1'
--  ORDER BY id;
-- 期待: kotodama_constitution_v1_article_01..12
-- ============================================================================
