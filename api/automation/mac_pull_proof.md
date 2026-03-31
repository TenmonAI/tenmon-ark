# Mac pull 証拠 — TENMON_REMOTE_CURSOR_COMMAND_CENTER（実物流）

## 目的

`POST /api/admin/cursor/submit` → queue → `GET /api/admin/cursor/next` → **エージェントが inbox に `.md` を書く**までを、憶測なく再現する。

## 必須環境変数（Mac）

| 変数 | 説明 |
|------|------|
| `FOUNDER_KEY` | VPS の `FOUNDER_KEY` と一致する値（`X-Founder-Key` に載る） |
| `TENMON_REMOTE_CURSOR_BASE_URL` | VPS API オリジン（末尾スラッシュなし）例 `https://your-vps.example.com` |
| `TENMON_REMOTE_CURSOR_INBOX` | 省略時は `$HOME/TenmonRemoteCursor/inbox`。**書き込み可能なディレクトリ**を指定 |

任意: `TENMON_REMOTE_CURSOR_FOUNDER_KEY` — `FOUNDER_KEY` の別名（スクリプトがフォールバックで読む）。

## 配置手順（Mac）

1. リポジトリを Mac に clone / pull し、少なくとも `api/scripts/remote_cursor_agent_mac_v1.sh` が手元にある状態にする（通常はリポジトリ全体）。
2. `jq` をインストール（`brew install jq`）。スクリプトが `jq` で JSON を処理する。
3. 上記 env を export するか、ランチャ用 `.env` に書きシェルで `source` する。
4. **単発実行**（キューに `ready` が 1 件あるときだけ `.md` が生成される）:

```bash
cd /path/to/tenmon-ark-repo/api
export FOUNDER_KEY='(VPS と同じキー)'
export TENMON_REMOTE_CURSOR_BASE_URL='https://your-vps.example.com'
export TENMON_REMOTE_CURSOR_INBOX="$HOME/TenmonRemoteCursor/inbox"
mkdir -p "$TENMON_REMOTE_CURSOR_INBOX"
bash scripts/remote_cursor_agent_mac_v1.sh
```

5. 成功時は `Wrote .../inbox/<UTC>__<id>__<card>.md` と JSON `{"ok":true,"path":"..."}` が標準出力に出る。

## single-flight（重要）

- 先に別端末で `GET /api/admin/cursor/next` 済みで **delivered のまま result 未 POST** だと、エージェントは `item: null` / `single_flight_active_await_result` になり **`.md` は生成されない**。
- 正しい順序: **submit（force_approve で ready）→ エージェント 1 回**、または result で解放してから次の next。

## 本リポジトリでの検証記録（非 Mac）

- **実機 Mac のログ／inbox ファイルパスは本ファイルには添付していない**（VPS 上でのエージェント実行のみ実施）。
- 同一スクリプトを Linux 上で `TENMON_REMOTE_CURSOR_INBOX=/tmp/tenmon_mac_pull_proof` に向けて実行し、`.md` 1 件生成を確認済み（メカニズム証明）。**本番の「Mac 接続済み」判定には、Mac 上の同手順の実行証拠が別途必要。**

## 公式 manifest

`api/automation/remote_cursor_mac_agent_manifest.json`

## 次カード

`TENMON_REMOTE_CURSOR_RESULT_POST_PROOF_CURSOR_AUTO_V1` — delivered 後の `POST /api/admin/cursor/result` を証拠束付きで固定する。
