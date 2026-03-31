function getDeepAxisForCenter(centerKey: string): string {
  switch (String(centerKey || "")) {
    case "KUKAI":
      return "承: 空海系の深軸は、三密（身口意）を一致させ、六大が相即しているという見取り図から、即身成仏を単なる教義ではなく実践可能な現在形として読む点にあります。つまり修行論ではなく、認識論・存在論・行為論を同時に組み替える軸です。";
    case "HOKEKYO":
      return "承: 法華経系の深軸は、一仏乗を最終目的に置きつつ、方便を分断ではなく導入として再評価し、実相を抽象概念で終わらせず、衆生が今いる地点から到達可能な道として接続することです。段階差を否定せず、目的の一性を保持する点が核心です。";
    case "kotodama_hisho":
      return "承: 言霊秘書系の深軸は、五十音を単なる配列としてではなく、水火の運動として捉え、一言法則によって音・意味・生成の連関を追うことです。語の定義だけでなく、音がどの順で立ち上がり、何を束ね、どこへ開くかを観ると理解が急に立体化します。";
    case "katakamuna":
      return "承: カタカムナ系の深軸は、潜象を基底に、図象を記述装置として扱い、成立原理を反復的に検証するところにあります。比喩として味わうだけではなく、どの図象がどの生成規則を担っているかを切り分けることで、解釈の恣意性を減らせます。";
    default:
      return "承: この主題の深軸は、定義・前提・運用を分けて再接続することです。単語説明で終わらず、どの前提に立つと結論が変わるか、どの運用条件で有効性が変わるかを明示すると、理解の再現性が上がります。";
  }
}

function getNextAxisForCenter(centerKey: string): string {
  switch (String(centerKey || "")) {
    case "KUKAI":
      return "三密の同時運用を、六大観と即身成仏の実践順序へ落とす検証";
    case "HOKEKYO":
      return "方便から実相へ移る際の読解規則を、一仏乗の目的と整合させる検証";
    case "kotodama_hisho":
      return "五十音配置と水火運動の対応を、一言法則で反証可能にする整理";
    case "katakamuna":
      return "潜象・図象・成立原理の対応を、具体例で往復確認する検証";
    default:
      return "前提差分と運用条件を明示し、反証可能な比較にする整理";
  }
}

export function composeLongFormResponseV2(args: {
  centerKey: string;
  mainProposition: string;
  evidence: string[];
}): string {
  const evidenceText = args.evidence.slice(0, 3).join("。");
  const sections = [
    `起: ${args.mainProposition}`,
    `承: ${evidenceText ? evidenceText + "。" : "根拠は会話文脈と既知の正典キーワードから抽出しています。"}`,
    getDeepAxisForCenter(args.centerKey),
    "転結: 次に深めるべき軸は、" + getNextAxisForCenter(args.centerKey) + "です。ここを押さえると、定義の理解が実践の判断へ接続され、抽象説明から一段深い運用へ移れます。",
  ];
  return sections.join("\n\n");
}

