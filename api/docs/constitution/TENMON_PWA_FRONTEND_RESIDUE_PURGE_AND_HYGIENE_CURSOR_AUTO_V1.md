# TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_CURSOR_AUTO_V1

## 目的

frontend last-mile を濁らせる **reload 語 / sessionId 語 / .bak ノイズ / 誤生成パス** を整理し、grep・lived・seal を clean side に寄せる。

## D

- **frontend mainline**（`web/src/**/*.ts(x)`）を本線とする
- **backend 変更禁止**
- `.bak` 物理削除は **evidence 採取後**（`--prune-web-bak`）のみ
- **最小 diff**

## 集計・evidence

```bash
bash api/scripts/tenmon_pwa_frontend_residue_hygiene_v1.sh --stdout-json
```

出力: `api/automation/pwa_frontend_residue_hygiene_evidence.json`

- `window.location.reload` / `location.reload` 行数
- `sessionId`（識別子）行数 — **会話 mainline は `threadId` のみ**。Training/Train は `trainRunId` / `id` 等に分離
- `reload` 英字サブストリング行数（コメントもノイズ源になり得るため 0 を目標）
- `web/src` 配下 `.bak*` ファイル数（gitignore 済みでもローカル残存は列挙）

## repo hygiene（.gitignore）

- `api/out/`
- `api/scripts/__pycache__/`
- `api/src/routes/30,`
- `api/src/routes/=`
- `**/*.bak*` 系

誤生成ファイルが無い場合はパス不要。掃除は `repo_hygiene_guard_v1` と併用可。

## 実行（ビルド確認）

```bash
npm --prefix web run build
cd api && npm run build
```
