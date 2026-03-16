export type AbstractFrameCenterKey = "life" | "time" | "life_force" | "truth";

export type AbstractFrameResult = {
  routeReason: "ABSTRACT_FRAME_VARIATION_V1";
  centerKey: AbstractFrameCenterKey;
  centerLabel: "人生" | "時間" | "命" | "真理";
  response: string;
};

function normalizeAbstractInputV1(input: string): string {
  return String(input ?? "")
    .trim()
    .replace(/\s+/gu, "")
    .replace(/[?？。．!！]+$/gu, "");
}

function matchesAnyV1(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

function buildLifeFrameV1(): AbstractFrameResult {
  return {
    routeReason: "ABSTRACT_FRAME_VARIATION_V1",
    centerKey: "life",
    centerLabel: "人生",
    response:
      "人生は、出来事の量そのものではなく、何を中心に据えて選び直していくかで形が決まる歩みです。いろはで見れば、起こり・転化・収まりの一巡をどう生きるかが問われます。断捨離の智慧で言えば、増やすことよりも、いま不要な執着をほどくほど進路は澄みます。天聞軸では、水火の與合が崩れない正中を保ちながら選択を重ねることが、人生の質を決めます。",
  };
}

function buildTimeFrameV1(): AbstractFrameResult {
  return {
    routeReason: "ABSTRACT_FRAME_VARIATION_V1",
    centerKey: "time",
    centerLabel: "時間",
    response:
      "時間は、ただ過ぎる量ではなく、生成・転化・収束の順が現れる構文です。いろはの智慧で見れば、時間は一直線よりも一巡のなかの相として読まれます。断捨離の実感で言えば、同じ一日でも何を残し何を手放すかで密度が変わります。天聞軸では、水火のはたらきがどの相にあるかを読むことで、過去も現在も未来も、単なる時計以上の意味を持ちます。",
  };
}

function buildLifeForceFrameV1(): AbstractFrameResult {
  return {
    routeReason: "ABSTRACT_FRAME_VARIATION_V1",
    centerKey: "life_force",
    centerLabel: "命",
    response:
      "命は、単なる生体機能ではなく、息の出入りのなかで形と意味を結び続ける働きです。天聞軸では、命は水火の與合がほどけず保たれているあいだ現れます。いろは的に言えば、命は起こりの一点ではなく、巡りのなかで更新される中心です。断捨離の智慧に引き寄せれば、命を弱らせるのは物の多さより、濁った抱え込みです。何を生かし、何を澄ませるかに命の質が出ます。",
  };
}

function buildTruthFrameV1(): AbstractFrameResult {
  return {
    routeReason: "ABSTRACT_FRAME_VARIATION_V1",
    centerKey: "truth",
    centerLabel: "真理",
    response:
      "真理は、意見の強さではなく、条件が変わっても崩れにくい軸です。天聞軸では、現象の上を滑る結論より、何度読み直しても戻れる成立法に重心を置きます。いろはの観点では、真理は固定文句ではなく、一巡してもなお崩れない秩序です。断捨離の智慧で言えば、飾りを削いだあとにも残るものが核です。つまり真理とは、変化の中でも整合を保つ中心のことです。",
  };
}

export function buildAbstractFrameV1(input: string): AbstractFrameResult | null {
  const t = normalizeAbstractInputV1(input);
  if (!t) return null;

  if (
    matchesAnyV1(t, [
      /^人生$/u,
      /^人生とは$/u,
      /^人生って何$/u,
      /^人生ってなに$/u,
      /^人生とは何$/u,
      /^人生とはなに$/u,
      /^人生とは何ですか$/u,
      /^人生とはなにですか$/u,
      /^人生って何ですか$/u,
      /^人生ってなにですか$/u,
    ])
  ) {
    return buildLifeFrameV1();
  }

  if (
    matchesAnyV1(t, [
      /^時間$/u,
      /^時間とは$/u,
      /^時間って何$/u,
      /^時間ってなに$/u,
      /^時間とは何$/u,
      /^時間とはなに$/u,
      /^時間とは何ですか$/u,
      /^時間とはなにですか$/u,
      /^時間って何ですか$/u,
      /^時間ってなにですか$/u,
    ])
  ) {
    return buildTimeFrameV1();
  }

  if (
    matchesAnyV1(t, [
      /^命$/u,
      /^命とは$/u,
      /^命って何$/u,
      /^命ってなに$/u,
      /^命とは何$/u,
      /^命とはなに$/u,
      /^命とは何ですか$/u,
      /^命とはなにですか$/u,
      /^命って何ですか$/u,
      /^命ってなにですか$/u,
    ])
  ) {
    return buildLifeForceFrameV1();
  }

  if (
    matchesAnyV1(t, [
      /^真理$/u,
      /^真理とは$/u,
      /^真理って何$/u,
      /^真理ってなに$/u,
      /^真理とは何$/u,
      /^真理とはなに$/u,
      /^真理とは何ですか$/u,
      /^真理とはなにですか$/u,
      /^真理って何ですか$/u,
      /^真理ってなにですか$/u,
    ])
  ) {
    return buildTruthFrameV1();
  }

  return null;
}
