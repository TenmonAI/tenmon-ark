# TENMON_AUTONOMY_SYSTEMD_INSTALL_AND_PERSISTENT_BOOT_CURSOR_AUTO_V1

## 目的

`tenmon_continuous_self_improvement_overnight_daemon` を **systemd で常駐・起動失敗時再起動**可能にし、**shell 手打ち依存**を減らす。成功の捏造はしない。**人間は stop ファイルまたは systemctl で停止できる**。

## D

- 最小 diff
- Linux runtime / systemd のみ（product core 不変更）
- lock ファイル・stop シグナルは既存 Python ロジックを尊重
- `systemd_unit_write.skip` は **テンプレ生成または /etc 書き込みが行われたとき false 相当**になるよう構造化

## 生成物（リポジトリ内）

`python3 api/automation/tenmon_continuous_self_improvement_overnight_daemon_v1.py --emit-systemd-template-only`  
または:

```bash
export TENMON_REPO_ROOT=/path/to/tenmon-ark-repo
bash api/scripts/tenmon_continuous_self_improvement_overnight_daemon_v1.sh systemd-template
```

出力:

- `api/automation/out/systemd/tenmon-continuous-self-improvement-overnight.service`
- `api/automation/out/systemd/tenmon-overnight-daemon.env.example`

Unit の特徴:

- `Restart=on-failure` / `RestartSec=30`
- `RestartPreventExitStatus=1` — **重複起動（lock で exit 1）で再起動ループしない**
- `EnvironmentFile=-/etc/default/tenmon-overnight-daemon`（`-` 接頭辞でファイル未作成でも起動可だが、**本番では env を配置推奨**）
- `TENMON_OVERNIGHT_STOP_FILE` / `TENMON_OVERNIGHT_LOCK_FILE` は **env で上書き可**（`.env.example` に既定パス記載）

## daemon 起動中にテンプレを毎回更新する

環境変数:

```bash
export TENMON_OVERNIGHT_WRITE_SYSTEMD_TEMPLATE=1
```

を付けて daemon を起動すると、**各プロセス開始時**に上記 `out/systemd` へテンプレを再生成し、summary の `systemd_unit_write.skip` が抑止される（監査用）。

## `/etc` へ直接書く（開発者向け）

```bash
sudo python3 api/automation/tenmon_continuous_self_improvement_overnight_daemon_v1.py \
  --write-systemd-unit \
  --systemd-unit-path /etc/systemd/system/tenmon-continuous-self-improvement-overnight.service
```

`--systemd-environment-file` で unit 内の `EnvironmentFile=` パスを変更可。

## インストール（推奨 runbook）

スクリプト: `api/scripts/tenmon_autonomy_overnight_systemd_install_v1.sh`

| サブコマンド | 内容 |
|--------------|------|
| `generate` | テンプレのみ生成（`out/systemd`） |
| `dry-run` | `generate` 後、`sudo install` / `systemctl` コマンドを**表示のみ** |
| `install` | `generate` のうえ `sudo` で unit + env を配置し `daemon-reload` + `enable` |

例:

```bash
export TENMON_REPO_ROOT=/opt/tenmon-ark-repo
bash api/scripts/tenmon_autonomy_overnight_systemd_install_v1.sh dry-run
bash api/scripts/tenmon_autonomy_overnight_systemd_install_v1.sh install
```

**env ファイル**: `tenmon-overnight-daemon.env.example` を `/etc/default/tenmon-overnight-daemon` にコピー後、`TENMON_REPO_ROOT` 等を環境に合わせて編集。

## restart / stop / status（固定）

```bash
sudo systemctl restart tenmon-continuous-self-improvement-overnight.service
sudo systemctl stop tenmon-continuous-self-improvement-overnight.service
sudo systemctl status tenmon-continuous-self-improvement-overnight.service
```

**穏当停止（アプリ層）**: daemon は `TENMON_OVERNIGHT_STOP_FILE`（既定 `api/automation/tenmon_overnight_stop.signal`）の存在をポーリングする。

```bash
touch "$TENMON_REPO_ROOT/api/automation/tenmon_overnight_stop.signal"
```

停止後、再開前にファイルを削除すること。

## boot 後の自動起動

```bash
sudo systemctl enable tenmon-continuous-self-improvement-overnight.service
```

`install` サブコマンドは `enable` まで実行。初回起動は `systemctl start` または **reboot**。

## acceptance

- unit テンプレが `out/systemd` に生成される
- 本憲章に install / dry-run / stop / status が残る
- lock・stop シグナルが env で明示され、既存挙動と整合する

## nextOnPass

`TENMON_AUTONOMY_HEARTBEAT_ALERT_AND_STALL_RECOVERY_CURSOR_AUTO_V1`

## nextOnFail

停止。systemd retry 1 枚のみ生成。
