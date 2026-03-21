# CLIENT_SEPARATE_SEAL_V1

## 目的

**client/** のみを単独コミットし、`api/src` runtime と混在させない。

## 本バッチに含めるパス（差分があるもののみ・最大 6）

| ファイル |
|----------|
| `client/src/pages/DashboardV3.tsx` |
| `client/src/components/dashboard/CustomGptMemoryImportBox.tsx` |

## 明示除外

- `api/**`（特に `routes/chat.ts`, `gates_impl`, `kokuzo_schema`）
- `dist/**`（直編集禁止）

## 検証

```bash
git diff --cached --name-only | rg '^client/' | wc -l   # 期待: ステージした client ファイル数
git diff --cached --name-only | rg '^api/' && exit 1    # api が混ざらないこと
```

## 残る未追跡（このカード後）

`api/src/routes/**` の大量 `??`（CARD_* / autonomous 等）は **別バッチ** — 本カードでは触れない。

## 次カード

`FINAL_WORLDCLASS_COMPLETION_GATE_V1`
