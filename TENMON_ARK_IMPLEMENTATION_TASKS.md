# TENMON-ARK 実装タスク一覧（差分ベース）

## 実装状況サマリー

### ✅ P0: 即日で効く修正（完了）

| タスク | ファイル | 変更内容 | 状態 |
|--------|---------|---------|------|
| P0-1 | `web/src/pages/Chat.tsx` | `threadId: activeId` を送信 | ✅ 完了 |
| P0-2 | `api/src/truth/truthSkeleton.ts` | mode判定点検（domain → HYBRID固定） | ✅ 完了 |
| P0-3 | `api/src/routes/chat.ts` | skeleton.modeを唯一の真実に | ✅ 完了 |
| P0-4 | `api/src/routes/chat.ts` | detail判定統一（全モードで`if (detail)`を追加） | ✅ 完了 |
| P0-5 | `web/src/pages/Chat.tsx` | `#詳細` 表示UI実装（`<details>`要素） | ✅ 完了 |
| P0-6 | `api/src/kanagi/patterns/loadPatterns.ts` | `amatsuKanagi50Patterns.json` のmissing許容 | ✅ 完了 |

### ✅ P1: EvidencePack注入（完了）

| タスク | ファイル | 変更内容 | 状態 |
|--------|---------|---------|------|
| P1-1 | `api/src/kotodama/evidencePack.ts` | `buildEvidencePack()`実装 | ✅ 完了 |
| P1-2 | `api/src/routes/chat.ts` | HYBRID/GROUNDEDに注入 | ✅ 完了 |

### ✅ P2: プロンプト強化（完了）

| タスク | ファイル | 変更内容 | 状態 |
|--------|---------|---------|------|
| P2-1 | `api/src/llm/prompts.ts` | `systemHybridDomain()`強化 | ✅ 完了 |
| P2-2 | `api/src/llm/prompts.ts` | `systemGrounded()`強化 | ✅ 完了 |

### ⏳ P3: page推定（未実装）

| タスク | ファイル | 変更内容 | 状態 |
|--------|---------|---------|------|
| P3-1 | `api/src/kotodama/evidencePack.ts` | `estimateDocAndPage()`関数追加 | ⏳ 未実装 |
| P3-2 | `api/src/routes/chat.ts` | HYBRIDモードで推定を使用 | ⏳ 未実装 |

### ✅ P4: threadId履歴（完了）

| タスク | ファイル | 変更内容 | 状態 |
|--------|---------|---------|------|
| P4-1 | `web/src/pages/Chat.tsx` | `threadId`送信（P0-1と重複） | ✅ 完了 |
| P4-2 | `api/src/llm/threadMemory.ts` | SQLite永続化実装済み | ✅ 完了 |

---

## P3実装詳細（未実装タスク）

### P3-1: `estimateDocAndPage()` 関数追加

**ファイル**: `api/src/kotodama/evidencePack.ts`

**追加する関数**:
```typescript
/**
 * メッセージから doc/pdfPage を推定
 */
export async function estimateDocAndPage(
  message: string
): Promise<{ doc: string; pdfPage: number; score: number; explain: string } | null> {
  const availableDocs = getAvailableDocs();
  if (availableDocs.length === 0) return null;

  const keywords = extractKeywords(message); // 簡易的なキーワード抽出
  
  let best: { doc: string; pdfPage: number; score: number; explain: string } | null = null;
  
  for (const doc of availableDocs) {
    // law_candidates のヒット数でスコアリング
    const lawHits = await countLawHits(doc, keywords);
    
    // text.jsonl のキーワード一致度でスコアリング
    const textHits = await countTextHits(doc, keywords);
    
    const totalScore = lawHits * 2 + textHits; // law を優先
    
    if (!best || totalScore > best.score) {
      const estimatedPage = await findBestPage(doc, keywords);
      best = {
        doc,
        pdfPage: estimatedPage,
        score: totalScore,
        explain: `law_hits=${lawHits}, text_hits=${textHits}`,
      };
    }
  }
  
  return best && best.score > 0 ? best : null;
}

// ヘルパー関数
function extractKeywords(message: string): string[] {
  // 簡易的なキーワード抽出（実装は後で詳細化）
  const domainKeywords = ["言灵", "カタカムナ", "いろは", "天津金木", "辞", "テニヲハ"];
  return domainKeywords.filter(kw => message.includes(kw));
}

async function countLawHits(doc: string, keywords: string[]): Promise<number> {
  // law_candidates.jsonl からキーワード一致をカウント
  // 実装詳細は省略
  return 0;
}

async function countTextHits(doc: string, keywords: string[]): Promise<number> {
  // text.jsonl からキーワード一致をカウント
  // 実装詳細は省略
  return 0;
}

async function findBestPage(doc: string, keywords: string[]): Promise<number> {
  // 最もヒット数の多いページを返す
  // 実装詳細は省略
  return 1;
}
```

### P3-2: HYBRIDモードで推定を使用

**ファイル**: `api/src/routes/chat.ts`

**変更箇所**: `280-299行目` 付近

**変更内容**:
```typescript
// 変更前
if (parsed.doc && parsed.pdfPage) {
  evidencePack = await buildEvidencePack(parsed.doc, parsed.pdfPage, false);
} else {
  // 簡易推定
  const availableDocs = getAvailableDocs();
  if (availableDocs.length > 0) {
    const estimatedDoc = availableDocs[0];
    const estimatedPage = 1;
    evidencePack = await buildEvidencePack(estimatedDoc, estimatedPage, true);
    isEstimated = true;
  }
}

// 変更後
if (parsed.doc && parsed.pdfPage) {
  evidencePack = await buildEvidencePack(parsed.doc, parsed.pdfPage, false);
} else {
  // P3: スコアリングベースの推定
  const estimated = await estimateDocAndPage(message);
  if (estimated && estimated.score > 0) {
    evidencePack = await buildEvidencePack(estimated.doc, estimated.pdfPage, true);
    isEstimated = true;
    // 推定理由をevidencePackに追加（型拡張が必要）
    // evidencePack.explain = estimated.explain;
  } else {
    // 推定失敗時は null のまま（「資料不足」を宣言）
  }
}
```

---

## 受入テスト

自動テストスクリプト: `api/scripts/acceptance_test.sh`

実行方法:
```bash
cd /opt/tenmon-ark/api
BASE_URL=http://localhost:3000 ./scripts/acceptance_test.sh
```

各テストの期待値:
- **NATURAL**: 資料導線なし、曖昧返しなし
- **HYBRID**: mode=HYBRID、資料不足/推定の明示
- **GROUNDED**: mode=GROUNDED、detailあり、lawId/quote含む
- **LIVE**: mode=LIVE、取得時刻+URL含む
- **detail制御**: `#詳細`なし→detail=null、`#詳細`あり→detail長さ>0

---

## 重要注意事項

1. **systemd / .env**: `EnvironmentFile=-...` は設定済み（missing許容）
2. **OpenAI APIキー**: 以前貼られたキーは漏洩扱い→必ずローテーション
3. **`amatsuKanagi50Patterns.json`**: ファイルが無い場合でも起動継続（P0-6で修正済み）

