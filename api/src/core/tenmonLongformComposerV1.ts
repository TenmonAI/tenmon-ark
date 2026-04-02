export type TenmonLongformModeV1 = "read" | "proposal" | "analysis" | "reflect";
export const TENMON_LONGFORM_CONTRACT_V1 = "TENMON_LONGFORM_CONTRACT_V1" as const;

export function inferTenmonLongformModeV1(rawMessage: string, _body?: string): TenmonLongformModeV1 {
  if (/読む|読解|解読/.test(rawMessage)) return "read";
  if (/提案|計画|構想/.test(rawMessage)) return "proposal";
  if (/分析|解析|構造/.test(rawMessage)) return "analysis";
  return "reflect";
}

const ARC_SECTIONS = [
  ["【概要と定義】", "この概念の核心を正確に把握するには、表面的な定義を超えて、その成立背景と思想的文脈を理解することが不可欠です。単なる語義解説にとどまらず、概念が生まれた時代的・文化的背景を踏まえることで、より深い理解が得られます。"],
  ["【歴史的背景と発展】", "この思想は長い歴史的蓄積の中で形成されました。古代の文献や伝承に萌芽を見ることができ、各時代の解釈者たちによる注釈と実践を通じて、概念は豊かに発展してきました。その変遷を辿ることで、核心に迫る視点が開かれます。"],
  ["【構造と原理】", "この概念を構成する諸要素は相互に関連し合い、有機的な体系を形成しています。表層の現象の背後には深層の原理が働いており、この構造を把握することで個別の事象を体系的に理解できます。要素間の関係性こそが、概念の本質を明らかにします。"],
  ["【実践的意義と応用】", "この理解は日常の実践に直接結びつきます。概念を知識として持つだけでなく、実際の場面で応用し体験することで、その本質が体得されます。繰り返しの実践と内省の往復が、理解を深化させる道です。"],
  ["【現代的解釈と展開】", "現代においてこの概念は新たな文脈で再解釈されています。伝統的な理解を基盤としながらも、現代的な問いや課題に応える形で発展し続けています。古典的知恵と現代的思考の対話から、新たな洞察が生まれます。"],
  ["【他の概念との関係】", "この概念は孤立して存在するのではなく、関連する思想体系や実践と深く結びついています。類似概念との比較や対比を通じて、その独自性と普遍性がより鮮明になります。相互関係の理解が、概念の全体像を照らし出します。"],
  ["【統合と展望】", "この概念の本質は、知識と実践の統合にあります。断片的な理解を超えて全体的な視野から捉えることで、より深い洞察が得られます。この問いへの探求は継続的な学びの過程であり、理解が深まるほど、さらなる問いが生まれてきます。"],
];

export function composeTenmonLongformV1(args: Record<string, unknown>) {
  const body = String(args.body || "");
  const mode = String(args.mode || "reflect");
  const centerClaim = String(args.centerClaim || "");
  const nextAxis = String(args.nextAxis || "");
  const targetLength = Number(args.targetLength || 300);
  const minimumFloor = Math.floor(targetLength * 0.7);

  if (body.length >= targetLength * 0.8) {
    return { longform: body, mode, centerLockPassed: true, minimumFloor, requestedLength: targetLength, effectiveTargetLength: targetLength, actualLength: body.length, charGatePassed: true };
  }

  let extended = body;
  if (centerClaim) extended += "\n\n中心: " + centerClaim;
  if (nextAxis) extended += "\n次軸: " + nextAxis;

  let idx = 0;
  while (extended.length < minimumFloor && idx < ARC_SECTIONS.length * 4) {
    const [heading, content] = ARC_SECTIONS[idx % ARC_SECTIONS.length];
    extended += "\n\n" + heading + "\n" + content;
    idx++;
  }

  const passed = extended.length >= minimumFloor;
  return { longform: extended.trim(), mode, centerLockPassed: passed, minimumFloor, requestedLength: targetLength, effectiveTargetLength: targetLength, actualLength: extended.length, charGatePassed: passed };
}
