# TENMON-ARK 深層解析レポート
**作成日**: 2026-01-13  
**目的**: 「思考と会話」を100%完成へ進めるための現状分析と実装計画  
**対象**: Gemini共有用

---

## 1. 現状サマリ（何が動いていて何が未達か）

### ✅ 実装済み・動作中
1. **HYBRID(domain)モードの基本フロー**: `chat.ts`で`retrieveAutoEvidence`→`buildCoreAnswerPlanFromEvidence`→`verifyCorePlan`の流れが実装済み
2. **自動証拠検索**: `retrieveAutoEvidence.ts`が実装され、doc/pdfPage未指定時に候補提示 or 暫定回答を返す
3. **Truth-Core（躰/用＋空仮中）**: `truthCore.ts`で正中命題算出と空仮中検知が実装済み
4. **Verifier（捏造防止）**: `verifier.ts`でclaimのevidenceIds検証が実装済み
5. **CorePlan生成**: `kanagiCore.ts`で`buildCoreAnswerPlanFromEvidence`が実装済み
6. **パターンローダー**: `loadPatterns.ts`で`amatsuKanagi50Patterns.json`をロード（ビルド時にコピー）
7. **Version API**: `/api/version`で`gitSha`/`builtAt`を返す
8. **受入テスト**: `acceptance_test.sh`で主要機能を検証

### ⚠️ 未達・課題
9. **コーパスファイルの存在確認**: `/opt/tenmon-corpus/db/*_text.jsonl`の存在が未確認（VPS環境依存）
10. **GROUNDEDモードの根拠候補生成**: 実装はあるが、詳細な検証が必要

---

## 2. データフロー図（Retrieval→Plan→Verifier→Speaker）

```
[User Request]
    │
    ├─ "言灵とは？" (doc/pdfPage未指定)
    │   │
    │   ├─→ retrieveAutoEvidence(message, 3)
    │   │       │
    │   │       ├─ keywordsFrom(message) → 重要語抽出
    │   │       ├─ scoreText(text, kws) → スコア計算
    │   │       └─ 決定論ソート → hits[0..2], confidence
    │   │
    │   ├─ confidence < 0.6 → 候補提示（1) doc Pxx ...）
    │   │
    │   └─ confidence >= 0.6 → 暫定採用
    │           │
    │           └─→ buildCoreAnswerPlanFromEvidence(message, evidence)
    │                   │
    │                   ├─ makeFallbackLawsFromText(...) → laws (fallback)
    │                   ├─ pickTaiYo(laws) → TaiYo
    │                   ├─ runTruthCore(question, taiyo, response, claims, evidence)
    │                   │       │
    │                   │       ├─ calculateThesis(tai, yo, question) → thesis
    │                   │       └─ detectKokakechu(response, claims, evidence) → flags
    │                   │
    │                   ├─ filterValidClaims(claims, evidence) → validClaims
    │                   │       │
    │                   │       └─ verifyClaimEvidence(claim, evidence)
    │                   │               └─ quoteがpageTextに存在するか検証
    │                   │
    │                   └─ CorePlan生成
    │                           │
    │                           ├─ thesis, tai, yo, kokakechuFlags
    │                           ├─ claims (validClaimsのみ)
    │                           └─ responseDraft, detailDraft
    │
    └─ "言霊秘書.pdf pdfPage=6 言灵とは？" (doc/pdfPage指定)
            │
            ├─→ getCorpusPage(doc, pdfPage) → pageText
            ├─→ getPageCandidates(doc, pdfPage, 12) → candidates
            │       │
            │       └─ (candidatesが空の場合) makeFallbackLawsFromText(...)
            │
            └─→ buildCoreAnswerPlanFromEvidence(message, evidence)
                    │
                    └─ (同上: pickTaiYo → runTruthCore → filterValidClaims → CorePlan)
```

### 重要ポイント
- **LLM禁止**: HYBRIDモードでは`decisionFrame.llm: null`を維持（LLMは最後の整形に限定、引用生成禁止）
- **捏造防止**: `verifyCorePlan`でclaimのevidenceIdsを検証し、quoteがpageTextに存在することを確認
- **空仮中検知**: `detectKokakechu`で一般テンプレ/根拠なし断定/循環説明を検知
- **決定論**: `retrieveAutoEvidence`のソートは決定論的（score desc → doc asc → pdfPage asc）
- **GROUNDED資産保護**: 既存のGROUNDEDモードの根拠候補生成ロジックは壊さない

---

## 3. 重要ファイル一覧（フルパス）と役割

### コア実装
- `/opt/tenmon-ark/api/src/routes/chat.ts`
  - **役割**: メインのチャットAPIエンドポイント
  - **機能**: MODE決定（NATURAL/HYBRID/GROUNDED/LIVE）、HYBRID未指定時の自動検索、CorePlan生成と検証

- `/opt/tenmon-ark/api/src/kotodama/retrieveAutoEvidence.ts`
  - **役割**: doc/pdfPage未指定時の自動証拠検索
  - **機能**: キーワード抽出、スコア計算、決定論ソート、confidence算出

- `/opt/tenmon-ark/api/src/kanagi/kanagiCore.ts`
  - **役割**: CorePlan生成の核
  - **機能**: `buildCoreAnswerPlanFromEvidence`、`extractTaiYo`、`makeFallbackLawsFromText`

- `/opt/tenmon-ark/api/src/kanagi/truthCore.ts`
  - **役割**: Truth-Core（躰/用＋空仮中）判定器
  - **機能**: `runTruthCore`、`calculateThesis`、`detectKokakechu`

- `/opt/tenmon-ark/api/src/kanagi/verifier.ts`
  - **役割**: claim検証（捏造防止）
  - **機能**: `verifyCorePlan`、`filterValidClaims`、`verifyClaimEvidence`

### サポート実装
- `/opt/tenmon-ark/api/src/kotodama/textLoader.ts`
  - **役割**: PDFテキスト抽出結果のキャッシュ
  - **機能**: `initTextLoader`、`getPageText`

- `/opt/tenmon-ark/api/src/kotodama/corpusLoader.ts`
  - **役割**: コーパスJSONLのロード
  - **機能**: `getCorpusPage`、`getAvailableDocs`

- `/opt/tenmon-ark/api/src/kanagi/patterns/loadPatterns.ts`
  - **役割**: 天津金木50パターンのロード
  - **機能**: `loadPatterns`、`getPatternBySound`

- `/opt/tenmon-ark/api/src/routes/health.ts`
  - **役割**: ヘルスチェックとバージョン情報
  - **機能**: `/api/health`、`/api/version`（gitSha/builtAt）

### テスト・検証
- `/opt/tenmon-ark/api/scripts/acceptance_test.sh`
  - **役割**: 受入テストスクリプト
  - **機能**: version/gitSha/builtAt検証、domain未指定検証、detail=string検証、捏造ID検証

### データファイル（VPS環境依存）
- `/opt/tenmon-corpus/db/khs_text.jsonl` - 言霊秘書のテキスト抽出結果
- `/opt/tenmon-corpus/db/ktk_text.jsonl` - カタカムナ言灵解のテキスト抽出結果
- `/opt/tenmon-corpus/db/iroha_text.jsonl` - いろは最終原稿のテキスト抽出結果
- `/opt/tenmon-corpus/db/*_law_candidates.jsonl` - 法則候補データ（存在確認必要）

---

## 4. 未達・バグ・リスクTop10

### 🔴 高優先度

#### 1. コーパスファイルの存在確認不足
- **原因**: `/opt/tenmon-corpus/db/*_text.jsonl`の存在がコード内で確認されていない
- **影響**: `retrieveAutoEvidence`が空の結果を返す可能性
- **修正案**: 起動時にコーパスファイルの存在をチェックし、ログに出力
- **テスト**: `ls -la /opt/tenmon-corpus/db/*_text.jsonl`で確認

#### 2. `retrieveAutoEvidence`の同期処理によるパフォーマンス問題
- **原因**: `fs.readFileSync`で全ファイルを同期的に読み込んでいる
- **影響**: 大量のJSONLファイルがある場合、レスポンスが遅くなる
- **修正案**: 非同期処理に変更、またはキャッシュを導入
- **テスト**: 1000行以上のJSONLファイルでパフォーマンステスト

#### 3. `verifyClaimEvidence`のquote検証が簡易すぎる
- **原因**: `pageText.includes(quoteLower.slice(0, 50))`で50文字のみ検証
- **影響**: 長いquoteが正しく検証されない可能性
- **修正案**: 全文検証またはより高度なマッチングアルゴリズム
- **テスト**: 長いquoteを含むclaimで検証

### 🟡 中優先度

#### 4. `calculateThesis`の実装が簡易すぎる
- **原因**: 躰/用を単純に結合しているだけ
- **影響**: 正中命題の精度が低い
- **修正案**: 正中軸での照合・生成鎖展開を実装
- **テスト**: 様々な躰/用の組み合わせでthesisの品質を評価

#### 5. `detectKokakechu`のパターンが限定的
- **原因**: 固定の正規表現パターンのみ
- **影響**: 新しいタイプの空仮中を検知できない
- **修正案**: 機械学習ベースの検知またはより包括的なパターン
- **テスト**: 様々な空仮中のケースで検証

#### 6. `makeFallbackLawsFromText`のID生成が単純
- **原因**: `T${String(laws.length + 1).padStart(3, "0")}`で連番生成
- **影響**: 同じページで複数回呼ばれるとIDが重複する可能性
- **修正案**: ハッシュベースのID生成またはUUID
- **テスト**: 同じページで複数回呼び出してIDの一意性を確認

#### 7. `acceptance_test.sh`のテストカバレッジが不十分
- **原因**: 一部のエッジケースがテストされていない
- **影響**: 本番環境で予期しない動作が発生する可能性
- **修正案**: より包括的なテストケースを追加
- **テスト**: エッジケース（空文字列、特殊文字、長文など）を追加

### 🟢 低優先度

#### 8. `textLoader.ts`のキャッシュがメモリ内のみ
- **原因**: 起動時に全ファイルをメモリにロード
- **影響**: 大量のページがある場合、メモリ使用量が増加
- **修正案**: ディスクキャッシュまたはLRUキャッシュ
- **テスト**: メモリ使用量の監視

#### 9. `loadPatterns.ts`のエラーハンドリングが不十分
- **原因**: パターンファイルが見つからない場合、空のMapを返すだけ
- **影響**: パターンが使えない状態でもエラーが検知されにくい
- **修正案**: より明確なエラーログとアラート
- **テスト**: パターンファイルを削除してエラーハンドリングを確認

#### 10. `version.ts`のgitSha取得が失敗した場合の処理
- **原因**: gitコマンドが失敗した場合、`unknown`を返すだけ
- **影響**: ビルド識別が困難になる
- **修正案**: 環境変数での注入を必須化、またはビルド時に固定値を埋め込む
- **テスト**: `.git`ディレクトリがない環境で動作確認

---

## 5. 次の3スプリントの実装計画

### Sprint 1: 安定性と検証の強化（1週間）

#### DONE条件
- [ ] コーパスファイルの存在確認を起動時に実装
- [ ] `retrieveAutoEvidence`のパフォーマンステストを実施（1000行以上のJSONLで1秒以内）
- [ ] `verifyClaimEvidence`のquote検証を改善（全文検証またはより高度なマッチング）
- [ ] `acceptance_test.sh`にエッジケーステストを追加（空文字列、特殊文字、長文）
- [ ] すべてのテストがPASSすることを確認

#### 実装タスク
1. `/opt/tenmon-ark/api/src/kotodama/corpusLoader.ts`に起動時チェックを追加
2. `retrieveAutoEvidence.ts`のパフォーマンス最適化（非同期処理またはキャッシュ）
3. `verifier.ts`の`verifyClaimEvidence`を改善
4. `acceptance_test.sh`にエッジケーステストを追加

### Sprint 2: Truth-Coreの高度化（1週間）

#### DONE条件
- [ ] `calculateThesis`を正中軸での照合・生成鎖展開に対応
- [ ] `detectKokakechu`のパターンを拡張（より包括的な検知）
- [ ] `makeFallbackLawsFromText`のID生成を改善（ハッシュベースまたはUUID）
- [ ] Truth-Coreの品質評価テストを実施（様々な躰/用の組み合わせでthesisの品質を評価）

#### 実装タスク
1. `truthCore.ts`の`calculateThesis`を高度化
2. `detectKokakechu`のパターンを拡張
3. `kanagiCore.ts`の`makeFallbackLawsFromText`のID生成を改善
4. Truth-Coreの品質評価テストを追加

### Sprint 3: 運用監視と最適化（1週間）

#### DONE条件
- [ ] `textLoader.ts`のメモリ使用量を最適化（LRUキャッシュまたはディスクキャッシュ）
- [ ] `loadPatterns.ts`のエラーハンドリングを改善（より明確なエラーログとアラート）
- [ ] `version.ts`のgitSha取得を改善（環境変数での注入を必須化）
- [ ] 運用監視用のメトリクスを追加（レスポンス時間、メモリ使用量、エラー率）

#### 実装タスク
1. `textLoader.ts`のキャッシュ戦略を改善
2. `loadPatterns.ts`のエラーハンドリングを改善
3. `version.ts`のgitSha取得を改善
4. 運用監視用のメトリクスを追加

---

## 6. 証拠（検証コマンドと期待値）

### domain(HYBRID)未指定が「候補提示 or 暫定回答」になるか

```bash
curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"言灵とは？ #詳細"}' | jq '{mode:.decisionFrame.mode, response:.response, detailType:(.detail|type), llm:.decisionFrame.llm}'
```

**期待値**:
- `mode`: `"HYBRID"`
- `response`: 「候補を見つけました。どれを参照しますか？」または暫定回答
- `detailType`: `"string"`
- `llm`: `null`

### domain(HYBRID)で捏造が出ないこと

```bash
curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"言灵とは？ #詳細"}' | jq -r '.detail' | grep -oE '(KHS|KTK|IROHA)-P[0-9]{4}-T[0-9]{3}'
```

**期待値**:
- すべてのlawIdが`KHS-P####-T###`、`KTK-P####-T###`、`IROHA-P####-T###`形式のみ
- `言霊-001`、`言灵-001`、`カタカムナ-001`、`いろは-001`などの捏造IDが存在しない

### GROUNDEDで根拠候補が出ること

```bash
curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"言霊秘書.pdf pdfPage=6 言灵の定義 #詳細"}' | jq '{mode:.decisionFrame.mode, detail:.detail, evidence:.evidence}'
```

**期待値**:
- `mode`: `"GROUNDED"`
- `detail`: lawId/quote/根拠候補が含まれる
- `evidence.laws`: 配列が存在し、各要素に`id`、`title`が含まれる

### /api/version が gitSha/builtAt を返すか

```bash
curl -sS http://127.0.0.1:3000/api/version | jq '{version, gitSha, builtAt}'
```

**期待値**:
- `version`: `"0.9.0"`
- `gitSha`: 7文字以上の文字列（例: `"aed5167"`）
- `builtAt`: ISO 8601形式の日時文字列（例: `"2026-01-13T04:16:14.993Z"`）

### kanagi patterns が Loaded になっているか

```bash
journalctl -u tenmon-ark-api.service | grep "KANAGI-PATTERNS"
```

**期待値**:
- `[KANAGI-PATTERNS] Loaded 45 patterns from ...` というログが存在
- `[KANAGI-PATTERNS] Failed to load patterns` というログが存在しない

---

## 7. Geminiに渡す質問文

```
【TENMON-ARK 思考と会話システムの完成度向上】

Tenmon-Arkは、言霊秘書・カタカムナ言灵解・いろは最終原稿を根拠とした「思考と会話」システムです。
現状、HYBRID(domain)モードでdoc/pdfPage未指定時に自動検索を行い、候補提示 or 暫定回答を返す機能が実装されています。

【現状】
- retrieveAutoEvidence: キーワード抽出→スコア計算→決定論ソートで候補を返す
- buildCoreAnswerPlanFromEvidence: 躰/用抽出→Truth-Core実行→Verifier検証でCorePlan生成
- Truth-Core: 躰/用から正中命題を算出、空仮中検知を実施
- Verifier: claimのevidenceIdsを検証し、quoteがpageTextに存在することを確認

【制約】
- HYBRIDモードではLLMを呼ばない（decisionFrame.llm: null）
- domainは捏造ゼロ（detailはEvidence由来のみ）
- 既存のGROUNDED資産は壊さない

【課題】
1. calculateThesisの実装が簡易すぎる（躰/用を単純に結合しているだけ）
2. detectKokakechuのパターンが限定的（固定の正規表現パターンのみ）
3. verifyClaimEvidenceのquote検証が簡易すぎる（50文字のみ検証）
4. retrieveAutoEvidenceの同期処理によるパフォーマンス問題

【お願い】
上記の深層解析レポートを参考に、以下を提案してください：
1. calculateThesisを正中軸での照合・生成鎖展開に対応する実装案
2. detectKokakechuのパターンを拡張する実装案（より包括的な検知）
3. verifyClaimEvidenceのquote検証を改善する実装案（全文検証またはより高度なマッチング）
4. retrieveAutoEvidenceのパフォーマンス最適化案（非同期処理またはキャッシュ）

各提案には、実装コード、テストケース、期待される効果を含めてください。
```

---

**レポート作成日**: 2026-01-13  
**次回更新予定**: Sprint 1完了後

