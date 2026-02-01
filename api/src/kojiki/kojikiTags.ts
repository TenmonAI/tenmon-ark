// api/src/kojiki/kojikiTags.ts
// Phase33: 古事記側の構造タグ抽出（決定論）

export function extractKojikiTags(text: string): string[] {
  const t = String(text || "");
  const tags: string[] = [];

  const add = (tag: string, re: RegExp) => {
    if (re.test(t)) tags.push(tag);
  };

  // 生成・成り立ち（成る/生む/起こる/分かれる/造化）
  add("KOJIKI:CREATION", /(成(り|る)|生(む|まれ|じ)|起(こ|り)|分(かれ|く)|造(化|る))/);

  // 与合・合一・二柱・双（写像の核になりやすい）
  add("KOJIKI:PAIRING", /(與合|与合|合(わさ|一|体)|交(わ|合)|二柱|双)/);

  // 水火・日月・潮（言霊秘書側と同型の軸）
  add("KOJIKI:WATER_FIRE", /(水火|火水|水|火|潮|月|日)/);

  // 正中・中心・御中主（中心軸）
  add("KOJIKI:CENTER", /(正中|中心|中(つ|央)|御中主|天之御中主|ミナカ)/);

  // null禁止・重複排除
  return Array.from(new Set(tags));
}
