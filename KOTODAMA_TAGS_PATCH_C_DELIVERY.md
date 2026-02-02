# パッチC：tags を candidates[0] に必ず付ける - 納品物

## 目的

Phase38のテストを通すため、candidates[0] に tags を必ず付ける。

## 変更差分

### 1. api/src/kotodama/tagger.ts（タグ付け規則の修正）

**変更内容**: 最小のタグ付け規則に更新

**新しい規則**:
- IKI：イキ|ィキ|日月|陰陽
- SHIHO：シホ|水火
- KAMI：カミ|火水
- HOSHI：ホシ|星
- "水火/火水" は広いので、シホ/カミ/ホシ表記優先で、無い時だけ水火・火水を付ける

**実装**:
```typescript
export function extractKotodamaTags(text: string): KotodamaTag[] {
  // 優先順位1: 明示的な表記を検出（シホ/カミ/ホシ表記優先）
  // シホ（シホ|しほ）
  if (/(?:シホ|しほ)/i.test(t)) {
    found.add("SHIHO");
  }
  // カミ（カミ|かみ）
  if (/(?:カミ|かみ)/i.test(t)) {
    found.add("KAMI");
  }
  // ホシ（ホシ|ほし|星）
  if (/(?:ホシ|ほし|星)/i.test(t)) {
    found.add("HOSHI");
  }
  // イキ（イキ|いき|ィキ|日月|陰陽）
  if (/(?:イキ|いき|ィキ|日月|陰陽)/i.test(t)) {
    found.add("IKI");
  }

  // 優先順位2: 明示的な表記がない場合、単独の「火水」「水火」から推測
  if (found.size === 0) {
    // 「水火」の出現を確認（SHIHO）
    if (/(?:水火)/.test(t)) {
      found.add("SHIHO");
    }
    // 「火水」の出現を確認（KAMI）
    if (/(?:火水)/.test(t)) {
      found.add("KAMI");
    }
  }
}
```

### 2. api/src/kokuzo/search.ts（型定義と候補生成の修正）

**変更内容**:

1. **KokuzoCandidate 型定義を修正**
```typescript
export type KokuzoCandidate = {
  doc: string;
  pdfPage: number;
  snippet: string;
  score: number;
  tags: KotodamaTag[];  // 必須（オプショナルから変更）
};
```

2. **すべての候補生成箇所で tags を必ず付与**
- FTS5 検索結果の候補生成時
- LIKE 検索結果の候補生成時
- fallback 候補生成時（3箇所）
- 補完候補生成時

**修正箇所**:
- `tags: tags.length > 0 ? tags : []` → `tags`（常に配列を返す）

## 実装確認

### タグ付け規則

- ✅ IKI：イキ|ィキ|日月|陰陽
- ✅ SHIHO：シホ|水火
- ✅ KAMI：カミ|火水
- ✅ HOSHI：ホシ|星
- ✅ "水火/火水" はシホ/カミ/ホシ表記優先で、無い時だけ水火・火水を付ける

### 候補生成時のタグ付与

- ✅ すべての候補生成箇所で tags を必ず付与
- ✅ tags は常に配列（空配列でもOK）
- ✅ KokuzoCandidate 型で tags が必須

## 期待される結果

1. `extractKotodamaTags` が新しい規則でタグを抽出
2. すべての候補に tags が付与される（空配列でもOK）
3. Phase38 のテストが PASS
   - `(.candidates[0].tags|type)=="array" and length>=1`
   - tags が "IKI"|"SHIHO"|"KAMI"|"HOSHI" のみ
4. `acceptance_test.sh` が PASS

## 検証方法

```bash
# VPS で実行
cd /opt/tenmon-ark-repo/api
git pull
pnpm -s build
sudo systemctl restart tenmon-ark-api.service

# 手動確認
curl -fsS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","message":"doc=KHS pdfPage=32"}' | \
  jq '{candidates: .candidates[0] | {doc, pdfPage, tags}}'

# acceptance_test.sh 実行
bash scripts/acceptance_test.sh
echo "EXIT=$?"
```

## 注意事項

- tags は常に配列（空配列でもOK）
- 最小のタグ付け規則（決定論）に従う
- 既存の Phase2（候補→番号選択→detail）と Phase4（ku保証）を壊さない
