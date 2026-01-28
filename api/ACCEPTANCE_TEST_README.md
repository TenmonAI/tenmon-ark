# acceptance_test.sh 正本（2026-01-27）

## ルール
**変更前後で必ずこのテストを通す。PASSしない変更は無効。**

## 要件

1. **build → systemd restart → /api/audit ok:true → /api/chat decisionFrame(llm=null, ku object) を確認**
2. **0.5s×10 retry を標準化**（restart直後の接続拒否対策）
3. **NATURAL 3ケース（hello/date/help）も確認**
4. **出力は最後に [PASS] を1回だけ表示**

## 禁止事項

- dist を直接編集して辻褄を合わせない
- jq 依存を排除（node -e で JSON判定に統一）

## 実行方法

```bash
cd /opt/tenmon-ark/api
BASE_URL=http://localhost:3000 API_DIR=/opt/tenmon-ark/api bash scripts/acceptance_test.sh
```

## テスト項目

### Phase 0: ビルドと再起動
- `pnpm -s build` が成功
- `sudo systemctl restart tenmon-ark-api.service` が成功
- `/health` への接続確認（0.5s×10 retry）

### Phase 1: /api/audit の確認
- `/api/audit` が `ok:true` または `status:ok` を返す

### Phase 2: /api/chat decisionFrame の確認
- `/api/chat` が `decisionFrame.mode` を返す
- `decisionFrame.llm` が `null`
- `decisionFrame.ku` が `object`

### Phase 3: NATURAL モードの3ケース
- **greeting**: `hello` → `mode=NATURAL`, `kuType=object`, `llm=null`
- **datetime**: `date` → `mode=NATURAL`, `kuType=object`, `response` に JST または YYYY-MM-DD が含まれる
- **smalltalk**: `help` → `mode=NATURAL`, `kuType=object`, `response` に `1)` `2)` `3)` が含まれる

## 成功条件

最後に `[PASS] すべての受入テストに合格しました` が表示されること。

## VPSでの実行ログ例（期待値）

```bash
$ cd /opt/tenmon-ark/api
$ BASE_URL=http://localhost:3000 API_DIR=/opt/tenmon-ark/api bash scripts/acceptance_test.sh

=== TENMON-ARK 受入テスト（正本） ===
BASE_URL: http://localhost:3000
API_DIR: /opt/tenmon-ark/api

【Phase 0: ビルドと再起動】
テスト: pnpm build → systemctl restart → 0.5s×10 retry で接続確認
ビルド中...
✅ ビルド成功
再起動中...
✅ 再起動成功
接続確認中（0.5s×10 retry）...
✅ 接続確認成功（retry: 1回目）

【Phase 1: /api/audit の確認】
テスト: /api/audit が ok:true または status:ok を返す
✅ /api/audit ok:true 確認成功

【Phase 2: /api/chat decisionFrame の確認】
テスト: /api/chat が decisionFrame(llm=null, ku object) を返す
✅ /api/chat decisionFrame(llm=null, ku object) 確認成功

【Phase 3-1: NATURAL greeting テスト】
テスト: hello → mode=NATURAL, kuType=object, llm=null

【Phase 3-2: NATURAL datetime テスト】
テスト: date → mode=NATURAL, kuType=object, responseにJST時刻が含まれる

【Phase 3-3: NATURAL smalltalk誘導 テスト】
テスト: help → mode=NATURAL, kuType=object, responseに選択肢が含まれる

=== 全テスト完了 ===
[PASS] すべての受入テストに合格しました

【確認項目】
✅ build → systemd restart → 接続確認（0.5s×10 retry）
✅ /api/audit ok:true
✅ /api/chat decisionFrame(llm=null, ku object)
✅ NATURAL 3ケース（hello/date/help）
```

