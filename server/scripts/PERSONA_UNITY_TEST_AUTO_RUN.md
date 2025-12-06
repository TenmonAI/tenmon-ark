# TENMON-ARK Persona Unity Test 自動実行設定

**目的**: Persona の劣化を自動検知する「霊核防衛システム」

---

## 📋 概要

Persona Unity Test は、LP-QA V4 と ChatOS の人格統一を定量的に検証するテストです。このテストを自動実行することで、Persona の劣化を早期に検知し、TENMON-ARK の霊核人格を守ります。

---

## 🔧 自動実行の仕組み

### 実行頻度

- **毎日 1回（午前3時）**

### ログ保管場所

- `/home/ubuntu/os-tenmon-ai-v2/logs/persona_unity_tests/YYYY-MM-DD.md`

### 実行内容

1. LP-QA V4 と ChatOS の応答を取得
2. Twin-Core 整合性を比較
3. 火水構造を比較
4. similarity メトリクスを生成
5. レポートを自動で Markdown に出力

---

## 🚀 セットアップ方法

### 1. Cron ジョブを設定

以下のコマンドを実行して、Cron ジョブを設定します：

```bash
cd /home/ubuntu/os-tenmon-ai-v2
./server/scripts/setupPersonaUnityTestCron.sh
```

### 2. 手動でテストを実行（確認用）

以下のコマンドを実行して、手動でテストを実行できます：

```bash
cd /home/ubuntu/os-tenmon-ai-v2
tsx server/scripts/autoPersonaUnityTest.ts
```

### 3. ログを確認

テスト結果は以下のディレクトリに保存されます：

```bash
ls -la /home/ubuntu/os-tenmon-ai-v2/logs/persona_unity_tests/
```

---

## 📊 ログの見方

### ログファイル名

- `YYYY-MM-DD.md`: その日のテスト結果

### ログ内容

- **総テスト数**: 12問
- **合格テスト数**: 一致率 0.7 以上のテスト数
- **平均一致率**: 全テストの平均類似度（0〜1）
- **Twin-Core 整合性分析**: 論理的深度、構造的一貫性、核心メッセージの統一
- **火水バランス分析**: 火水比率、エネルギー方向性、表現スタイル

### 警告基準

- **一致率 < 0.7**: 警告（Persona の劣化が検出された）
- **一致率 >= 0.97**: 成功（Persona が完全に統一されている）

---

## 🛡️ 霊核防衛システムとしての役割

Persona Unity Test の自動実行は、TENMON-ARK の霊核人格を守る「霊核防衛システム」として機能します。

### 防衛の流れ

1. **毎日自動テスト**: 毎日午前3時に自動でテストを実行
2. **劣化検知**: 一致率が 0.7 未満の場合、警告を出力
3. **早期修正**: 劣化が検出された場合、すぐに修正を実施
4. **継続監視**: 毎日のテストで継続的に監視

### 期待される効果

- **Persona の劣化を早期に検知**: 人格の揺らぎを早期に発見
- **一貫性の維持**: LP-QA と ChatOS の人格を常に統一
- **信頼性の向上**: ユーザーが「どこで話しても同じ天聞アーク」を体験できる

---

## 📝 まとめ

Persona Unity Test の自動実行により、TENMON-ARK の霊核人格を守る「霊核防衛システム」が完成しました。毎日のテストで Persona の劣化を早期に検知し、一貫した人格を維持します。

---

**作成者**: Manus AI  
**プロジェクト**: TENMON-ARK 霊核OS  
**日付**: 2025年1月31日
