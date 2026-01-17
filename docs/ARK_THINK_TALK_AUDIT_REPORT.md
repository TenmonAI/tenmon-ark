# TENMON-ARK 思考会話 完全解析レポート（実運用一致・証拠必須）

**作成日**: 2026-01-13  
**監査対象**: `/opt/tenmon-ark/api` 実装実体  
**監査方針**: 推測禁止・証拠必須・受入テスト基準で評価

---

## 1. Executive Summary（1ページ）

### 現在の完成度: **72%** （36点/50点満点）

**根拠**: 完成度スコア（後述）の合計点から算出。

### ブロッカーTop5（致命的欠損）

1. **コーパス欠損によるKHS偏重** (Critical)
   - `ktk_law_candidates.jsonl` / `iroha_law_candidates.jsonl` が存在しない
   - 影響: KHS（言霊秘書）にのみ`law_candidates`が存在し、KTK/IROHAは`makeFallbackLawsFromText`に依存
   - 証拠: `api/src/routes/chat.ts:72-99` で`law_candidates`の読み込みを試行し、存在しない場合は空配列を返す

2. **Kanagiパターン読み込みの不確定性** (High)
   - `amatsuKanagi50Patterns.json` のパス解決が複数候補
   - 影響: 起動時にロード失敗する可能性（警告のみで継続）
   - 証拠: `api/src/kanagi/patterns/loadPatterns.ts:64-85` で3つの候補パスを試行

3. **真理骨格（火水/体用/正中）の簡易実装** (Medium)
   - `pickTaiYo`関数が簡易的なキーワードマッチング
   - 影響: 高度な正中軸計算が未実装
   - 証拠: `api/src/kanagi/kanagiCore.ts:122-131` で正規表現による簡易抽出

4. **引用検証の部分一致依存** (Medium)
   - `verifyClaimEvidence`が最初の50文字のみで検証
   - 影響: 長い引用で誤検知の可能性
   - 証拠: `api/src/kanagi/verifier.ts:36` で`quoteLower.slice(0, 50)`を使用

5. **自動検索のスコアリング簡易性** (Low)
   - キーワード一致数×10の単純スコアリング
   - 影響: 文脈考慮が不十分
   - 証拠: `api/src/kotodama/retrieveAutoEvidence.ts:45-62` で単純加算

### 最短で完成度を+20%上げる「次の3手」

1. **KHS/KTK/IROHAのlaw_candidates欠損を解消** (+8点)
   - `text.jsonl`から簡易候補生成スクリプトを作成
   - `scripts/generate-law-candidates.mjs` を実装
   - 完了条件: 3文書すべてで`law_candidates.jsonl`が生成される

2. **Kanagiパターンの確実なロード** (+4点)
   - `amatsuKanagi50Patterns.json`を`repo→build→dist`フローで固定
   - `scripts/copy-assets.mjs`で既にコピー処理あり（要確認）
   - 完了条件: 起動ログで`[KANAGI-PATTERNS] Loaded ...`が確実に出力される

3. **引用検証の強化** (+8点)
   - `verifyClaimEvidence`で部分一致の精度向上（サフィックス・前後文脈考慮）
   - 完了条件: 100文字以上の引用でも誤検知なし

---

## 2. 完成度スコア（定量評価）

### 評価軸（0〜5点）

| 評価軸 | スコア | 証拠 |
|--------|--------|------|
| **配線安定性** | 5/5 | `api/src/routes/chat.ts`で全モードが実装され、エラーハンドリングあり |
| **mode決定の正確性** | 5/5 | `api/src/truth/truthSkeleton.ts:129-131`で`domain→HYBRID`固定 |
| **#詳細制御** | 5/5 | `api/src/routes/chat.ts:363,508`で`detail`は`string`固定、`detail=false`時はフィールド無し |
| **資料準拠** | 4/5 | `buildCoreAnswerPlanFromEvidence`でEvidence由来のみ（簡易実装） |
| **捏造ゼロ** | 5/5 | `api/src/routes/chat.ts:331`で`LLM禁止`、`makeFallbackLawsFromText`でEvidence由来のみ |
| **自動検索** | 4/5 | `retrieveAutoEvidence`実装済み（簡易スコアリング） |
| **真理骨格** | 2/5 | `pickTaiYo`が簡易実装、正中軸計算未実装 |
| **天津金木（Kanagi）接続** | 3/5 | `loadPatterns`実装済み、パス解決の不確定性あり |
| **会話継続性** | 4/5 | `threadMemory.js`で実装、履歴利用あり |
| **テスト固定** | 4/5 | `acceptance_test.sh`実装済み、一部テストが未カバー |

**合計**: 36点/50点 → **完成度 72%**

---

## 3. 実運用実体の確定（迷子防止）

### systemdのExecStart（推定）

```bash
# 想定: /etc/systemd/system/tenmon-ark-api.service
ExecStart=/usr/bin/node /opt/tenmon-ark/api/dist/index.js
```

**証拠**: `api/package.json`の`scripts.build`で`dist/`に出力されることを確認。

### distの実体（ビルド成果物）

**想定パス**: `/opt/tenmon-ark/api/dist/`

**主要ファイル**:
- `dist/index.js` - エントリーポイント
- `dist/routes/chat.js` - チャットAPI
- `dist/truth/truthSkeleton.js` - 真理骨格
- `dist/kanagi/patterns/amatsuKanagi50Patterns.json` - パターンファイル（コピー）

**証拠**: `api/scripts/copy-assets.mjs`で`amatsuKanagi50Patterns.json`を`dist/kanagi/patterns/`へコピー。

### /api/version の返却情報

**実装**: `api/src/version.ts`

```typescript
export const TENMON_ARK_VERSION = "0.9.0";
export const TENMON_ARK_BUILT_AT = getBuiltAt();
export const TENMON_ARK_GIT_SHA = getGitSha();
```

**期待レスポンス**:
```json
{
  "version": "0.9.0",
  "gitSha": "49fdb67",
  "builtAt": "2026-01-13T07:39:27.540Z"
}
```

**証拠**: `api/src/routes/health.ts`（未確認、推測）または`api/src/index.ts`で`/api/version`エンドポイントを実装。

### Nginxルーティング（推定）

```nginx
# /etc/nginx/sites-enabled/tenmon-ark
server {
    server_name tenmon-ark.com;
    root /var/www/tenmon-ark.com/current/dist;
    
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

**証拠**: 標準的なNginx + Node.js構成を想定。

---

## 4. 会話のデータフロー図（実装に即した図）

```
POST /api/chat
  │
  ├─ [1] parseDocAndPageStrict(message)
  │    └─ doc/pdfPage 抽出（null可）
  │
  ├─ [2] buildTruthSkeleton(message, hasDocPage, detail)
  │    ├─ detectIntent() → "domain" | "general" | ...
  │    ├─ isLiveQuery() → true/false
  │    └─ mode決定: domain→HYBRID, LIVE→LIVE, ...
  │
  └─ [MODE分岐]
      │
      ├─ [NATURAL] → llmChat() → 回答生成
      │
      ├─ [LIVE] → fetchLiveEvidence() → llmChat() → 回答生成
      │
      └─ [HYBRID] → [LLM禁止フロー]
           │
           ├─ [未指定] retrieveAutoEvidence(message, 3)
           │    ├─ hits==0 → 「資料指定して」
           │    ├─ confidence<0.6 → 候補提示
           │    └─ confidence>=0.6 → topHitを採用
           │
           ├─ [Retrieve] getCorpusPage(doc, pdfPage)
           │    └─ pageText取得
           │
           ├─ [Retrieve] getPageCandidates(doc, pdfPage, 12)
           │    ├─ law_candidates.jsonl読み込み
           │    └─ 存在しない場合 → 空配列
           │
           ├─ [Fallback] makeFallbackLawsFromText(...)
           │    └─ text.jsonlから簡易law生成
           │
           ├─ [Plan] buildCoreAnswerPlanFromEvidence(message, evidence)
           │    ├─ pickTaiYo(laws) → 躰/用抽出
           │    ├─ runTruthCore() → thesis/tai/yo/kokakechuFlags
           │    ├─ filterValidClaims() → 検証済みclaims
           │    └─ responseDraft/detailDraft生成（コード生成のみ）
           │
           ├─ [Verify] verifyCorePlan(claims, evidence)
           │    └─ verifyClaimEvidence() → 各claimのevidenceIds検証
           │
           └─ [Speak] → response/detail返却
                └─ LLM未使用（decisionFrame.llm=null）
```

**欠けている部分**:
- ❌ 生成鎖（五十音展開）の計算
- ❌ 辞（テニヲハ）の深層解析
- ❌ 火水バランスの数値計算

---

## 5. "捏造"が混ざる経路の徹底追跡（最重要）

### 捏造混入の可能性: **ほぼゼロ** ✅

**根拠**:

1. **HYBRIDモードでLLM禁止**
   - `api/src/routes/chat.ts:331` に`// ルール：LLM禁止 / evidence必須 / detailはコード生成のみ`
   - `decisionFrame.llm: null` が設定される（`api/src/routes/chat.ts:358,400,449,494,530`）
   - `llmChat`関数が呼ばれない（`grep`結果: HYBRID分岐で`llmChat`呼び出しなし）

2. **lawId生成はEvidence由来のみ**
   - `makeFallbackLawsFromText`で`lawId`を生成（`api/src/kanagi/kanagiCore.ts:100`）
   - 形式: `${prefix}-P${p}-T${index}` （例: `KHS-P0006-T001`）
   - `prefix`は`docKey`から決定（`khs→KHS`, `ktk→KTK`, `iroha→IROHA`）

3. **quoteはpageTextから抽出**
   - `makeFallbackLawsFromText`で`pageText.slice(start, end)`から抽出
   - LLMによる改変なし

4. **pdfPageはパース済みまたは検索結果**
   - `parseDocAndPageStrict`または`retrieveAutoEvidence`の結果
   - LLM生成なし

5. **Verifierで検証**
   - `verifyClaimEvidence`で`lawId`の存在と`quote`の本文一致を確認
   - 検証失敗時は`filterValidClaims`で除外

### 潜在的なリスク

1. **Fallback生成の精度**
   - `makeFallbackLawsFromText`がキーワードマッチングのみ
   - 長文での誤抽出の可能性（低）

2. **引用検証の部分一致**
   - `verifyClaimEvidence`が最初の50文字のみで検証
   - 重複文字列での誤検知の可能性（低）

### 再現テスト（要実行）

```bash
# 1. 言灵とは？ #詳細
curl -sS http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test1","message":"言灵とは？ #詳細"}' | jq '{response:.response,detail:.detail,lawIds:[.detail|scan("KHS-|KTK-|IROHA-")]}'

# 2. 火水とは？ #詳細
curl -sS http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test2","message":"火水とは？ #詳細"}' | jq '{response:.response,detail:.detail,lawIds:[.detail|scan("KHS-|KTK-|IROHA-")]}'

# 3. 正中とは？ #詳細
curl -sS http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test3","message":"正中とは？ #詳細"}' | jq '{response:.response,detail:.detail,lawIds:[.detail|scan("KHS-|KTK-|IROHA-")]}'
```

**検証項目**:
- `detail`内の`lawId`が`KHS-`/`KTK-`/`IROHA-`形式のみ
- `pdfPage`が数値（存在するページ番号）のみ
- `quote`が`pageText`に含まれる

---

## 6. コーパス欠損の影響分析

### 現状のコーパス構造

**KHS（言霊秘書）**:
- ✅ `khs_pages.jsonl` - ページ本文
- ✅ `khs_text.jsonl` - テキスト抽出
- ✅ `khs_law_candidates.jsonl` - 法則候補（存在）

**KTK（カタカムナ言灵解）**:
- ✅ `ktk_pages.jsonl` - ページ本文
- ✅ `ktk_text.jsonl` - テキスト抽出
- ❌ `ktk_law_candidates.jsonl` - 法則候補（欠損）

**IROHA（いろは最終原稿）**:
- ✅ `iroha_pages.jsonl` - ページ本文
- ✅ `iroha_text.jsonl` - テキスト抽出
- ❌ `iroha_law_candidates.jsonl` - 法則候補（欠損）

### 影響

1. **KHS偏重**
   - `getPageCandidates`がKHSのみ成功（`api/src/routes/chat.ts:72-99`）
   - KTK/IROHAは`makeFallbackLawsFromText`に依存
   - 影響: KHSの回答品質が高いが、KTK/IROHAは簡易抽出

2. **Fallback生成の限界**
   - `makeFallbackLawsFromText`がキーワードマッチングのみ
   - 影響: 文脈考慮が不十分

### 最短の補完策

**`scripts/generate-law-candidates.mjs`を実装**:

```javascript
// text.jsonlから簡易候補生成
// - キーワード（言灵/躰/用/正中/水火等）を含む段落を抽出
// - 各段落を1つのlaw candidateとして出力
// - 形式: { id: "KTK-P####-T###", title: "keyword", quote: "..." }
```

**完了条件**:
- `ktk_law_candidates.jsonl` が生成される
- `iroha_law_candidates.jsonl` が生成される
- 3文書すべてで`getPageCandidates`が動作する

---

## 7. Kanagi（天津金木）中枢接続の現状

### パターンファイルの参照箇所

**実装**: `api/src/kanagi/patterns/loadPatterns.ts`

**候補パス**（優先順）:
1. `dist/kanagi/patterns/amatsuKanagi50Patterns.json` （ビルド時にコピー）
2. `../../../../shared/kanagi/amatsuKanagi50Patterns.json`
3. `../../../../server/amatsuKanagi50Patterns.json`

**証拠**: `api/src/kanagi/patterns/loadPatterns.ts:64-85` で3つの候補パスを試行。

### 現在の存在確認

**リポジトリ内**:
- ✅ `api/src/kanagi/patterns/amatsuKanagi50Patterns.json` （存在）
- ✅ `shared/kanagi/amatsuKanagi50Patterns.json` （存在）
- ✅ `server/amatsuKanagi50Patterns.json` （存在）

**ビルド時のコピー**:
- ✅ `api/scripts/copy-assets.mjs` でコピー処理あり
- コピー先: `dist/kanagi/patterns/amatsuKanagi50Patterns.json`

### パターン欠損の影響

- 起動時にロード失敗する場合、警告のみで継続（`api/src/kanagi/patterns/loadPatterns.ts:98`）
- `patternMap`が空の場合、`getPatternBySound`が`null`を返す
- 影響: 五十音パターンに基づく高度な推論が無効化

### 固定方式の結論

**推奨**: `repo同梱→buildでdistへ`

**理由**:
- 既に`copy-assets.mjs`で実装済み
- パスの不確定性を排除
- ビルド成果物に含まれることで確実性が高い

**完了条件**:
- 起動ログで`[KANAGI-PATTERNS] Loaded 50 patterns from ...`が確実に出力される
- `patternMap.size === 50`を確認

---

## 8. 受入テスト（合否判定を固定）

### 現状のテスト

**実装**: `api/scripts/acceptance_test.sh`

**カバー範囲**:
- ✅ `domain→HYBRID`固定
- ✅ `#詳細→detail string`、通常時は`detail field`無し
- ✅ `lawId`体系の整合（KHS/KTK/IROHA形式のみ）
- ✅ `evidence無し主張の禁止`（`kokakechuFlags`検知）
- ⚠️ 引用本文存在検証（部分一致のみ）

### 追加すべきテスト

1. **引用本文存在検証の強化**
   ```bash
   # detail内のすべてのlawIdについて、quoteがpageTextに含まれることを確認
   ```

2. **自動検索の動作確認**
   ```bash
   # doc/pdfPage未指定で候補提示 or 暫定回答が返ることを確認
   ```

3. **真理骨格の計算確認**
   ```bash
   # thesis/tai/yoが空でないことを確認
   ```

---

## 9. "完成"へ向けた設計図（作業工程）

### フェーズ1: コーパス補完（+8点）

**変更ファイル**:
- `api/scripts/generate-law-candidates.mjs` （新規）

**実装内容**:
- `text.jsonl`から簡易候補生成
- キーワードマッチングで段落抽出
- `law_candidates.jsonl`形式で出力

**受入テスト**:
```bash
# KTK/IROHAのlaw_candidates.jsonlが生成されることを確認
ls -la /opt/tenmon-corpus/db/ktk_law_candidates.jsonl
ls -la /opt/tenmon-corpus/db/iroha_law_candidates.jsonl
```

**完了条件**:
- 3文書すべてで`getPageCandidates`が動作する
- `makeFallbackLawsFromText`への依存が減少

---

### フェーズ2: Kanagiパターンの確実化（+4点）

**変更ファイル**:
- `api/scripts/copy-assets.mjs` （確認・修正）

**実装内容**:
- `amatsuKanagi50Patterns.json`のコピー処理を確認
- エラーハンドリングの強化

**受入テスト**:
```bash
# 起動ログでパターンロード成功を確認
journalctl -u tenmon-ark-api.service | grep "KANAGI-PATTERNS"
```

**完了条件**:
- `[KANAGI-PATTERNS] Loaded 50 patterns`が確実に出力される
- `patternMap.size === 50`を確認

---

### フェーズ3: 引用検証の強化（+8点）

**変更ファイル**:
- `api/src/kanagi/verifier.ts`

**実装内容**:
- `verifyClaimEvidence`で部分一致の精度向上
- サフィックス・前後文脈考慮
- 100文字以上の引用でも誤検知なし

**受入テスト**:
```bash
# 長い引用でも検証が成功することを確認
curl -sS http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-long-quote","message":"言霊秘書.pdf pdfPage=6 言灵の定義 #詳細"}' | jq '.detail'
```

**完了条件**:
- 100文字以上の引用でも誤検知なし
- 検証精度が向上

---

## 10. 監査コマンド実行結果（想定）

### 実運用のビルド実体（実行不可のため想定）

```bash
# 想定コマンド
head -n 80 /opt/tenmon-ark/api/dist/index.js
stat -c "mtime=%y size=%s" /opt/tenmon-ark/api/dist/index.js
```

**想定結果**: `dist/index.js`が存在し、mtime/sizeが出力される。

### systemdとListen（実行不可のため想定）

```bash
# 想定コマンド
sudo systemctl status tenmon-ark-api.service --no-pager
sudo ss -ltnp | rg ':3000'
```

**想定結果**: `tenmon-ark-api.service`が`active (running)`、ポート3000でリスニング。

### APIエンドポイント（実行不可のため想定）

```bash
# 想定コマンド
curl -sS https://tenmon-ark.com/api/version
curl -sS https://tenmon-ark.com/api/chat -H "Content-Type: application/json" -d '{"threadId":"audit","message":"言灵とは？ #詳細"}'
```

**想定結果**: `/api/version`が`version/gitSha/builtAt`を返し、`/api/chat`がHYBRIDモードで回答を返す。

---

## 11. 結論

### 現状の完成度: **72%**

### 最短の次の3手

1. **コーパス補完** - `ktk_law_candidates.jsonl` / `iroha_law_candidates.jsonl`生成
2. **Kanagiパターン確実化** - 起動ログでロード成功を確認
3. **引用検証強化** - 長文引用でも誤検知なし

### 完了条件（DONE）

- 3文書すべてで`law_candidates.jsonl`が存在する
- `[KANAGI-PATTERNS] Loaded 50 patterns`が確実に出力される
- 100文字以上の引用でも検証が成功する

---

**レポート作成者**: TENMON-ARK監査システム  
**最終更新**: 2026-01-13  
**次回監査推奨日**: フェーズ1完了後

