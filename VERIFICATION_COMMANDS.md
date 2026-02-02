# TENMON-ARK 会話成立確認コマンド

## 前提条件

```bash
# VPS で実行
cd /opt/tenmon-ark-repo/api
pnpm -s build
sudo systemctl restart tenmon-ark-api.service

# /api/audit が ready になるまで待つ
REPO_SHA="$(cd /opt/tenmon-ark-repo && git rev-parse --short HEAD)"
for i in $(seq 1 200); do
  out="$(curl -sS -m 1 -o /tmp/_audit.json -w '%{http_code}' http://127.0.0.1:3000/api/audit || echo 000)"
  code="${out%%$'\t'*}"
  if [ "$code" = "200" ]; then
    LIVE_SHA="$(jq -r '.gitSha // ""' /tmp/_audit.json)"
    if [ -n "$LIVE_SHA" ] && [ "$LIVE_SHA" = "$REPO_SHA" ]; then
      echo "[OK] audit ready (gitSha=$LIVE_SHA)"
      break
    fi
  fi
  sleep 0.2
done

# /api/chat が 200 になるまで待つ
for i in $(seq 1 200); do
  code="$(curl -sS -m 2 -o /tmp/_chat.json -w '%{http_code}' \
    http://127.0.0.1:3000/api/chat -H "Content-Type: application/json" \
    -d '{"threadId":"verify","message":"hello"}' || echo 000)"
  if [ "$code" = "200" ]; then
    if jq -e '.decisionFrame.llm==null and (.decisionFrame.ku|type)=="object"' /tmp/_chat.json >/dev/null 2>&1; then
      echo "[OK] chat ready"
      break
    fi
  fi
  sleep 0.2
done
```

## 確認コマンド

### 1. ドメイン質問がメニューだけではなく回答を返す

```bash
# 「言霊とは何？」で回答が50文字以上返ることを確認
curl -fsS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test1","message":"言霊とは何？"}' \
  | jq -e '(.response|type)=="string" and (.response|length)>=50'

# メニューだけではないことを確認
curl -fsS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test1","message":"言霊とは何？"}' \
  | jq -r '.response' | grep -v "^了解。どの方向で話しますか"

# decisionFrame.ku が object であることを確認
curl -fsS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test1","message":"言霊とは何？"}' \
  | jq -e '(.decisionFrame.ku|type)=="object"'

# decisionFrame.llm が null であることを確認
curl -fsS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test1","message":"言霊とは何？"}' \
  | jq -e '(.decisionFrame.llm==null)'
```

### 2. 選択入力が正規化されて回答に進む

```bash
# まずメニューを表示させる（ドメイン質問でない質問）
curl -fsS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test2","message":"何か質問したい"}' \
  | jq -r '.response'

# 選択を送る（"1" または "言灵/カタカムナ/天津金木の質問"）
curl -fsS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test2","message":"1"}' \
  | jq -e '(.response|type)=="string" and (.response|length)>=50'

# メニューに戻らないことを確認
curl -fsS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test2","message":"1"}' \
  | jq -r '.response' | grep -v "^了解。どの方向で話しますか"
```

### 3. 候補がない場合でもフォールバック回答を返す

```bash
# 存在しないドメイン質問で回答が50文字以上返ることを確認
curl -fsS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test3","message":"存在しないドメイン質問テスト"}' \
  | jq -e '(.response|type)=="string" and (.response|length)>=50'

# decisionFrame.ku が object であることを確認
curl -fsS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test3","message":"存在しないドメイン質問テスト"}' \
  | jq -e '(.decisionFrame.ku|type)=="object"'
```

### 4. acceptance_test.sh で全ケース確認

```bash
cd /opt/tenmon-ark-repo/api
bash scripts/acceptance_test.sh
# EXIT=0 であることを確認
echo "EXIT=$?"
```

## 期待される結果

1. **ドメイン質問**: メニューではなく、50文字以上の回答が返る
2. **選択入力**: 正規化されて回答に進む（メニューに戻らない）
3. **候補なし**: フォールバック回答が返る（50文字以上）
4. **decisionFrame**: `llm=null`, `ku=object` が保証される
5. **acceptance_test.sh**: 全 Phase が PASS
