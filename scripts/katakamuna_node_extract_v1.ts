import { readFileSync, writeFileSync } from "node:fs";

type SourcepackManifest = {
  core_nodes: string[];
};

const SOURCEPACK_MANIFEST = "/opt/tenmon-ark-repo/canon/katakamuna_sourcepack_manifest_v1.json";
const INDEX_DIR = "/opt/tenmon-ark-data/uploads/ai_build/katakamuna_sourcepack_20260312T003722Z/index";

type CoreNodeRow = {
  nodeKey: string;
  category: string;
  label: string;
  aliases: string;
  sourceFile: string;
  note: string;
};

const MIN_NODES: CoreNodeRow[] = [
  { nodeKey: "NARASAKI_SATSUKI", category: "人物", label: "楢崎皐月", aliases: "", sourceFile: "NARASAKI_CHOKKAN_01", note: "カタカムナ解読・潜象物理の起点" },
  { nodeKey: "UNO_TAMIE", category: "人物", label: "宇野多美恵", aliases: "", sourceFile: "SOUJO_01", note: "相似象学会誌本流の中心人物" },
  { nodeKey: "SOUJISHO_GAKU", category: "概念", label: "相似象学", aliases: "", sourceFile: "SOUJO_01", note: "相似象を読み解く体系" },
  { nodeKey: "CHOKKAN_PHYSICS", category: "物理", label: "直観物理", aliases: "", sourceFile: "NARASAKI_CHOKKAN_01", note: "楢崎による直観物理" },
  { nodeKey: "KOKO_PHYSICS", category: "物理", label: "考古物理学", aliases: "", sourceFile: "JOKODAI_BUNMEI_BUTSURI", note: "上古代文明と物理学" },
  { nodeKey: "AMA", category: "概念", label: "アマ", aliases: "", sourceFile: "KATAKAMUNA_GENREIKAI", note: "始元量・潜象の根本" },
  { nodeKey: "AMANA", category: "概念", label: "アマナ", aliases: "", sourceFile: "KATAKAMUNA_GENREIKAI", note: "アマの核・潜象の集合状態" },
  { nodeKey: "AMAUTSUSHI", category: "実践", label: "アマウツシ", aliases: "", sourceFile: "KATAKAMUNA_GENREIKAI", note: "アマからの力の現れ" },
  { nodeKey: "IYASHIROCHI", category: "実践", label: "イヤシロチ", aliases: "", sourceFile: "HOI_GROUP", note: "場の整い・地場調整の概念" },
  { nodeKey: "KAMUNAGARA_NO_MICHI", category: "実践", label: "カムナガラノミチ", aliases: "カムナガラノ道", sourceFile: "KAMUNAGARA_120", note: "カタカムナ的な生き方・実践軸" },
  { nodeKey: "KATAKAMUNA_BUNKEN", category: "図象", label: "カタカムナ文献", aliases: "", sourceFile: "KATAKAMUNA_GENREIKAI", note: "カタカムナ関連文献束" },
  { nodeKey: "NIHONGO_KEISEI", category: "概念", label: "日本語形成", aliases: "", sourceFile: "HOI_GROUP", note: "日本語成立と音・形の対応" },
  { nodeKey: "SEIHAN_TAISHOSEI", category: "物理", label: "正反対称性", aliases: "", sourceFile: "JOKODAI_BUNMEI_BUTSURI", note: "正と反の対称構造" },
  { nodeKey: "GOKAN_JUUGOUSEI", category: "物理", label: "互換重合性", aliases: "", sourceFile: "JOKODAI_BUNMEI_BUTSURI", note: "互換と重合による構造原理" },
];

function main() {
  let manifest: SourcepackManifest | null = null;
  try {
    const raw = readFileSync(SOURCEPACK_MANIFEST, "utf8");
    manifest = JSON.parse(raw) as SourcepackManifest;
  } catch {
    manifest = null;
  }

  const requiredLabels = new Set([
    "楢崎皐月",
    "宇野多美恵",
    "相似象学",
    "直観物理",
    "考古物理学",
    "アマ",
    "アマナ",
    "アマウツシ",
    "イヤシロチ",
    "カムナガラノミチ",
    "カタカムナ文献",
    "日本語形成",
    "正反対称性",
    "互換重合性",
  ]);

  for (const row of MIN_NODES) {
    requiredLabels.delete(row.label);
  }
  if (requiredLabels.size > 0) {
    console.warn("[KATAKAMUNA_NODE_EXTRACT_V1] missing labels in MIN_NODES:", Array.from(requiredLabels));
  }

  const header = "nodeKey\tcategory\tlabel\taliases\tsourceFile\tnote\n";
  const lines = MIN_NODES.map(
    (r) =>
      [r.nodeKey, r.category, r.label, r.aliases, r.sourceFile, r.note]
        .map((v) => v.replace(/\t/g, " "))
        .join("\t")
  );
  const tsv = header + lines.join("\n") + "\n";

  const tsvPath = `${INDEX_DIR}/core_nodes.tsv`;
  writeFileSync(tsvPath, tsv, "utf8");

  const mdLines: string[] = [];
  mdLines.push("# KATAKAMUNA core nodes (R10_KATAKAMUNA_NODE_EXTRACT_V1)");
  mdLines.push("");
  mdLines.push("| nodeKey | category | label | sourceKey | note |");
  mdLines.push("|---------|----------|-------|-----------|------|");
  for (const r of MIN_NODES) {
    mdLines.push(
      `| ${r.nodeKey} | ${r.category} | ${r.label} | ${r.sourceFile} | ${r.note} |`
    );
  }
  mdLines.push("");
  const mdPath = `${INDEX_DIR}/core_nodes.md`;
  writeFileSync(mdPath, mdLines.join("\n"), "utf8");
}

main();

