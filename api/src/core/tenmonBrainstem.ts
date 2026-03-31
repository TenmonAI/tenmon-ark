const RE_LONG_FORM_REQUEST =
  /(長文で|長く説明|詳細に|詳しく|くわしく|徹底的に|網羅的に|全て説明|完全に説明|深く|深掘り|掘り下げ|一段深く|[1-9][0-9]{3}字以上)/u;

export function detectLongFormRequestV1(msg: string): boolean {
  return RE_LONG_FORM_REQUEST.test(String(msg || ""));
}

