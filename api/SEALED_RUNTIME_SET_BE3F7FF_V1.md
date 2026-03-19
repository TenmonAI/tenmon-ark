# SEALED_RUNTIME_SET_BE3F7FF_V1

be3f7ff 系列の sealed runtime set を明文化する。

## 1) 封印 sha

**be3f7ff**

## 2) 封印の前提

- **PATCH29 acceptance:** PASS

## 3) runtime 対象ファイル

| パス |
|------|
| `api/src/routes/chat.ts` |
| `api/src/routes/chat_refactor/majorRoutes.ts` |
| `api/src/routes/chat_refactor/finalize.ts` |
| `api/scripts/patch29_final_acceptance_sweep_v1.sh` |

## 4) runtime 対象外

- `api/src/db/kokuzo_schema.sql`
- `probe*.json`
- `ABSTRACT_CENTER_*.txt`
- `CARD_*.md`
- `WORLD_CLASS_ANALYSIS_*`
- `FINAL_REPORT_V1`
- `RECONCILE_AUDIT_V1`
- `api/src/routes/chat_refactor/define.ts`
- `api/src/routes/chat_refactor/entry.ts`
- `api/src/routes/chat_refactor/general.ts`

## 5) この系列で再現確認するときの手順

1. **`npm run build`**（`api` ディレクトリで実行）
2. **`sudo systemctl restart tenmon-ark-api.service`**
3. **`curl -fsS http://127.0.0.1:3000/health`** で ready 確認
4. **`/opt/tenmon-ark-repo/api/scripts/patch29_final_acceptance_sweep_v1.sh`** を実行し、PASS を確認
