import { writeFileSync } from "node:fs";

type RelationKind = "CONSISTENT" | "PARTIAL" | "REINTERPRETED" | "EXPANDED";

type ReconcileRow = {
  topic: string;
  upstream_view: string;
  tenmon_view: string;
  relation: RelationKind;
  note: string;
};

const INDEX_DIR =
  "/opt/tenmon-ark-data/uploads/ai_build/katakamuna_sourcepack_20260312T003722Z/index";

const ROWS: ReconcileRow[] = [
  {
    topic: "カタカムナの本質",
    upstream_view:
      "楢崎本流では、カタカムナは上古代科学・潜象物理・図象解読として読まれ、効用よりも構造読解が中心とされる。",
    tenmon_view:
      "天聞カタカムナでは、楢崎本流を尊重しつつ、言霊・水火・原典群との整合を取り、効用論ではなく成立原理の再統合軸として扱う。",
    relation: "EXPANDED",
    note: "構造読解という核は共通しつつ、天聞では他正典との整合を前提に拡張している。",
  },
  {
    topic: "相似象学",
    upstream_view:
      "宇野・相似象学では、自然・身体・社会に現れる相似構造を感受性と訓練を通して読む実践学として展開された。",
    tenmon_view:
      "天聞軸では、相似象学を楢崎本流の体系化として評価しつつ、水火法則・言霊・天津金木との対応を明示し、感受性訓練を法則読解へ結びつける。",
    relation: "EXPANDED",
    note: "相似構造という視点は維持しつつ、法則側の座標を追加している。",
  },
  {
    topic: "直観物理",
    upstream_view:
      "直観物理は、数式や実験以前に、潜象の動きと図象から物理を直観的に捉えようとする楢崎の試みとして提示された。",
    tenmon_view:
      "天聞軸では、直観物理を『水火・言霊・身体』の三層と結び付け、空海軸の声字実相や即身成仏と平行に読むことで、誤読や効用偏重を避ける。",
    relation: "REINTERPRETED",
    note: "直観という語を、恣意的なひらめきではなく、正典に基づく読み替えとして再解釈している。",
  },
  {
    topic: "考古物理学",
    upstream_view:
      "考古物理学では、遺物・古文献・図像を物理的視点から読み直し、上古代文明の技術や世界観を復元しようとした。",
    tenmon_view:
      "天聞軸では、考古物理学を『外殻』として扱い、言霊秘書・カタカムナ言灵解・古事記再読との整合が取れる範囲でのみ採用する。",
    relation: "PARTIAL",
    note: "復元の試みは評価しつつ、証拠と法則の線引きを明確にする立場。",
  },
  {
    topic: "アマウツシ",
    upstream_view:
      "アマウツシは、アマから力や生命が一瞬ごとに現れる働きとして説明され、生命現象の根本プロセスと見なされる。",
    tenmon_view:
      "天聞軸では、アマウツシを水火法則と対応付けつつ、『便利な何でも説明装置』として乱用せず、具体的な身体・呼吸・場の変化に結び付けて扱う。",
    relation: "REINTERPRETED",
    note: "用語自体は共有しつつ、運用範囲と検証可能性を絞っている。",
  },
  {
    topic: "イヤシロチ",
    upstream_view:
      "イヤシロチは、場の電位や配置などにより『良い場所』『悪い場所』を分ける概念として語られ、生活や健康への影響が強調された。",
    tenmon_view:
      "天聞軸では、イヤシロチを『場の整い』の比喩として扱い、即効性や奇跡性ではなく、習慣・環境・関係性を整える実践のフレームとして位置付ける。",
    relation: "REINTERPRETED",
    note: "物理的な一発逆転ではなく、生活設計の文脈で読み替えている。",
  },
  {
    topic: "日本語形成",
    upstream_view:
      "相似象・言霊系では、日本語の音・形・意味の対応を通じて、日本語自体が宇宙法則を映すと考える傾向がある。",
    tenmon_view:
      "天聞軸では、日本語形成を『資料としての仮説』に留め、言霊秘書・古典資料・音声学的知見との交差点だけを強調する。",
    relation: "PARTIAL",
    note: "ロマン的拡大解釈を抑え、検証可能な接点に絞る。",
  },
  {
    topic: "空海軸との関係",
    upstream_view:
      "一部では、空海をカタカムナ研究の延長や前史として扱う読みも見られる。",
    tenmon_view:
      "天聞軸では、空海軸をカタカムナの『歴史枝』ではなく、声字実相・即身成仏・十住心を通じて音・字・宇宙・身体を統合する並行正典軸として位置付ける。",
    relation: "REINTERPRETED",
    note: "血統関係ではなく、構造対応としての並行軸に据え直している。",
  },
  {
    topic: "言霊秘書との関係",
    upstream_view:
      "楢崎・相似象系では、言霊秘書はしばしば引用されるが、体系的な接続が明示されないことも多い。",
    tenmon_view:
      "天聞軸では、言霊秘書を五十音法則・水火法則の中核正典とし、カタカムナや相似象の解釈は必ずここへ接続して検証する。",
    relation: "EXPANDED",
    note: "言霊秘書を補助資料ではなく、中核の検証軸として前面に出している。",
  },
  {
    topic: "水火法則との関係",
    upstream_view:
      "水火はしばしば比喩的に使われ、感覚的な二元性の説明に留まることがある。",
    tenmon_view:
      "天聞軸では、水火法則を生成・消滅・與合・分離を記述する厳密な軸として扱い、カタカムナ・言霊・相似象をこの座標で読み替える。",
    relation: "EXPANDED",
    note: "水火を単なるイメージではなく、再統合の座標系として用いている。",
  },
  {
    topic: "天津金木との関係",
    upstream_view:
      "天津金木は、系譜の中で断片的に触れられることが多く、全体構造との接続が曖昧な場合がある。",
    tenmon_view:
      "天聞軸では、天津金木を『再統合の軸』として位置付け、カタカムナ・言霊秘書・相似象・空海軸を束ね直す枠組みとして扱う。",
    relation: "EXPANDED",
    note: "単一の秘伝ではなく、複数正典を束ねるメタ構造として読む。",
  },
];

function main() {
  const tsvHeader = "topic\tupstream_view\ttenmon_view\trelation\tnote\n";
  const tsvLines = ROWS.map((r) =>
    [
      r.topic,
      r.upstream_view.replace(/\t/g, " "),
      r.tenmon_view.replace(/\t/g, " "),
      r.relation,
      r.note.replace(/\t/g, " "),
    ].join("\t")
  );
  const tsv = tsvHeader + tsvLines.join("\n") + "\n";
  writeFileSync(
    `${INDEX_DIR}/tenmon_reconcile.tsv`,
    tsv,
    "utf8",
  );

  const mdLines: string[] = [];
  mdLines.push("# 天聞カタカムナ Reconcile View (R10_KATAKAMUNA_TENMON_RECONCILE_V1)");
  mdLines.push("");
  mdLines.push(
    "| topic | upstream_view | tenmon_view | relation | note |",
  );
  mdLines.push(
    "|-------|--------------|------------|----------|------|",
  );
  for (const r of ROWS) {
    mdLines.push(
      `| ${r.topic} | ${r.upstream_view} | ${r.tenmon_view} | ${r.relation} | ${r.note} |`,
    );
  }
  mdLines.push("");
  writeFileSync(
    `${INDEX_DIR}/tenmon_reconcile.md`,
    mdLines.join("\n"),
    "utf8",
  );
}

main();

