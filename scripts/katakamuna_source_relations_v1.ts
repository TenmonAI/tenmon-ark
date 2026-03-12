import { writeFileSync } from "node:fs";

type RelationRow = {
  src: string;
  relation: string;
  dst: string;
  note: string;
};

const INDEX_DIR =
  "/opt/tenmon-ark-data/uploads/ai_build/katakamuna_sourcepack_20260312T003722Z/index";

const RELATIONS: RelationRow[] = [
  // KTM-side core
  {
    src: "KTM:NARASAKI",
    relation: "STARTS_FROM",
    dst: "KTM:KATAMON",
    note: "楢崎皐月からカタカムナ文献群が始まる起点",
  },
  {
    src: "KTM:NARASAKI",
    relation: "DEVELOPS",
    dst: "KTM:CHOKKAN",
    note: "楢崎皐月 → 直観物理の展開",
  },
  {
    src: "KTM:NARASAKI",
    relation: "DEVELOPS",
    dst: "KTM:KOKO",
    note: "楢崎皐月 → 考古物理学の展開",
  },
  {
    src: "KTM:UNO",
    relation: "INHERITS",
    dst: "KTM:SOUJI",
    note: "宇野多美恵が相似象学を継承・体系化",
  },
  {
    src: "KTM:SOUJI",
    relation: "EXPLAINS",
    dst: "KTM:AMAUTSUSHI",
    note: "相似象学がアマウツシ等の潜象概念を解説",
  },
  {
    src: "KTM:KAMUNAGARA",
    relation: "PRACTICES",
    dst: "KTM:IYASHIRO",
    note: "カムナガラの道としてイヤシロチ実践へ落とす",
  },
  // TENMON bridge (6+)
  {
    src: "KTM:KATAMON",
    relation: "BRIDGES_TO",
    dst: "TENMON:KATAKAMUNA_KAI",
    note: "カタカムナ文献 → カタカムナ言灵解への橋",
  },
  {
    src: "KTM:KATAMON",
    relation: "BRIDGES_TO",
    dst: "TENMON:IROHA_KAI",
    note: "カタカムナ文献 → いろは言灵解への橋",
  },
  {
    src: "KTM:KATAMON",
    relation: "BRIDGES_TO",
    dst: "TENMON:KOTODAMA_HISHO",
    note: "カタカムナ文献 → 言霊秘書への橋",
  },
  {
    src: "KTM:CHOKKAN",
    relation: "REINTERPRETED_BY",
    dst: "TENMON:KUKAI_AXIS",
    note: "直観物理が空海軸（声字実相・即身成仏）から再解釈される",
  },
  {
    src: "KTM:SOUJI",
    relation: "REINTERPRETED_BY",
    dst: "TENMON:MIZUHI_AXIS",
    note: "相似象学が水火法則軸から再解釈される",
  },
  {
    src: "KTM:KATAMON",
    relation: "REINTEGRATED_BY",
    dst: "TENMON:AMATSUKANAGI",
    note: "カタカムナ文献束が天津金木軸で再統合される",
  },
];

function main() {
  const tsvHeader = "src\trelation\tdst\tnote\n";
  const tsvLines = RELATIONS.map((r) =>
    [r.src, r.relation, r.dst, r.note.replace(/\t/g, " ")].join("\t")
  );
  const tsv = tsvHeader + tsvLines.join("\n") + "\n";

  const tsvPath = `${INDEX_DIR}/core_relations.tsv`;
  writeFileSync(tsvPath, tsv, "utf8");

  const mdLines: string[] = [];
  mdLines.push("# KATAKAMUNA core relations (R10_KATAKAMUNA_SOURCE_RELATION_BIND_V1)");
  mdLines.push("");
  mdLines.push("| src | relation | dst | note |");
  mdLines.push("|-----|----------|-----|------|");
  for (const r of RELATIONS) {
    mdLines.push(
      `| ${r.src} | ${r.relation} | ${r.dst} | ${r.note} |`
    );
  }
  mdLines.push("");

  const mdPath = `${INDEX_DIR}/core_relations.md`;
  writeFileSync(mdPath, mdLines.join("\n"), "utf8");
}

main();

