# SEAL_DOC_COMMIT_DECISION_V1

be3f7ff 系列の封印文書 3 点を追跡対象にするかどうかの判断をまとめる。

**対象ファイル**

- `api/SEAL_BE3F7FF_UNTRACKED_MAP.md`
- `api/KOKUZO_SCHEMA_NO_TOUCH_POLICY_V1.md`
- `api/SEALED_RUNTIME_SET_BE3F7FF_V1.md`

---

## 1) 推奨

**commit する**

---

## 2) 理由

- 3 点はいずれも「封印の定義・前提・対象/対象外・運用」を説明する**メタ文書**であり、観測物・レポート・CARD 資料とは性質が異なる。
- commit することで、**封印の内容がリポジトリ履歴に残る**。clean checkout や別環境でも「何が sealed か」「何を no-touch とするか」「再現手順は何か」を参照できる。
- コード変更は行わないため、**runtime や PATCH29 acceptance には影響しない**。追跡するのは文書のみ。

---

## 3) commit する場合の最小 add 対象

次の 3 ファイルのみ。

```
api/SEAL_BE3F7FF_UNTRACKED_MAP.md
api/KOKUZO_SCHEMA_NO_TOUCH_POLICY_V1.md
api/SEALED_RUNTIME_SET_BE3F7FF_V1.md
```

---

## 4) commit しない場合の運用上の弱点

- 文書が **working tree にしか存在しない**ため、別 clone・別マシン・再 clone 時には参照できない。
- 「no-touch の方針」「runtime set」「未追跡マップ」が**リポジトリ外の記憶や別メモに依存**し、属人化しやすい。
- 後から「封印の前提はどこに書いてあるか」が分かりにくくなり、**封印の再現・監査がしづらくなる**。
