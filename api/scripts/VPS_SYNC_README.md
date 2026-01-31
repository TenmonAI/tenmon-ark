# VPS 同期手順

## 目的
VPS 側で動いているコード実体と GitHub main の最新を一致させ、Phase28〜Phase30 までを確実に PASS させる。

## 実行方法

### 方法1: 再クローン・切り替えスクリプト（推奨）

VPS に SSH して以下を実行：

```bash
ssh root@162.43.90.247
cd /opt/tenmon-ark/api && set +H
bash <(curl -sSL https://raw.githubusercontent.com/TenmonAI/tenmon-ark/main/api/scripts/vps_reclone_and_switch.sh)
```

または、スクリプトをダウンロードして実行：

```bash
ssh root@162.43.90.247
cd /opt/tenmon-ark/api && set +H
curl -O https://raw.githubusercontent.com/TenmonAI/tenmon-ark/main/api/scripts/vps_reclone_and_switch.sh
chmod +x vps_reclone_and_switch.sh
bash vps_reclone_and_switch.sh
```

### 方法2: 手動同期

既存のリポジトリを更新する場合：

```bash
ssh root@162.43.90.247
cd /opt/tenmon-ark/api && set +H
git fetch --all --prune
git reset --hard origin/main
git clean -fd
pnpm -s build
sudo systemctl restart tenmon-ark-api.service
bash scripts/acceptance_test.sh
```

## 期待される結果

- `/opt/tenmon-ark-live` が存在し、正本リポジトリの `api` を指す
- `acceptance_test.sh` が `EXIT=0`
- Phase28 手動確認で `cand0.pdfPage` が 1 にならない
