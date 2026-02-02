# TENMON-ARK 会話成立改善 - 変更ファイル一覧

## 変更ファイル

1. **api/src/persona/laneChoice.ts** (新規)
   - `parseLaneChoice()` 関数: 選択テキストを LANE_1/2/3 に正規化

2. **api/src/kokuzo/threadCandidates.ts** (修正)
   - `setThreadPending()`, `getThreadPending()`, `clearThreadState()` 追加
   - Thread state 管理（pending/candidates）

3. **api/src/persona/naturalRouter.ts** (修正)
   - ドメイン質問検出: `handled=false` を返して HYBRID 処理にフォールスルー
   - メニュー表示時に pending state を保存

4. **api/src/routes/chat.ts** (修正)
   - 選択待ち状態の処理: pending state を優先して処理
   - ドメイン質問の回答生成: 50文字以上保証
   - 候補がない場合のフォールバック回答生成

5. **api/scripts/acceptance_test.sh** (修正)
   - Phase36: ドメイン質問がメニューだけではなく回答を返すことを確認
   - Phase36-1: 選択入力が正規化されて回答に進むことを確認
   - Phase36-2: 候補がない場合でもフォールバック回答を返すことを確認

6. **CONVERSATION_FLOW_DIAGRAM.md** (新規)
   - 会話フロー図（条件分岐つき）
   - メニューが出る条件
   - 次の発話の解釈
   - 会話が止まる原因と修正後の保証

7. **VERIFICATION_COMMANDS.md** (新規)
   - 確認コマンド一覧
   - curl で再現できるテストケース

## 会話フロー図

詳細は `CONVERSATION_FLOW_DIAGRAM.md` を参照。

## acceptance_test.sh の追加ケース

### Phase36: ドメイン質問が回答を返す
- 「言霊とは何？」で回答が50文字以上返る
- メニューだけではない
- `decisionFrame.ku` が object
- `decisionFrame.llm` が null

### Phase36-1: 選択入力が正規化される
- メニュー表示後、選択（"1" など）を送る
- メニューに戻らず回答に進む
- 回答が50文字以上

### Phase36-2: 候補がない場合のフォールバック
- 存在しないドメイン質問で回答が50文字以上返る
- `decisionFrame.ku` が object

## curl で再現できる確認コマンド

詳細は `VERIFICATION_COMMANDS.md` を参照。

### 基本確認

```bash
# ドメイン質問が回答を返す
curl -fsS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","message":"言霊とは何？"}' \
  | jq -e '(.response|type)=="string" and (.response|length)>=50'
```

## 絶対条件（壊したら無効）

- ✅ `decisionFrame.llm` は常に null
- ✅ `decisionFrame.ku` は全経路で object（null/undefined禁止）
- ✅ `scripts/acceptance_test.sh` が PASS すること（最終権威）
- ✅ NATURAL/HYBRID/GROUNDED の既存契約は破壊しない
