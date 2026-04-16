/**
 * HUMAN_READABLE_LAW_LAYER_V1
 * KHSL:LAW:* 等の内部 law key を本文・中心表示から人間可読へ寄せる（routing / routeReason / densityContract は不変）。
 */
export const HUMAN_READABLE_LAW_LAYER_V1 = "HUMAN_READABLE_LAW_LAYER_V1" as const;

/** 既知キー → 表示名（内部キーは JSON 契約用に別途保持） */
export const KHSL_LAW_DISPLAY_MAP: Record<string, string> = {
  "KHSL:LAW:KHSU:41c0bff9cfb8:p0:qcb9cdda1f01d": "言霊秘書（経典法則）",
  "KHSL:LAW:KHSU:41c0bff9cfb8:p0:q043f16b3a0e8": "言霊秘書（経典法則）",
};

/** TASK_RETURN_LAW_TRANSLATOR_V1: centerKey / centerLabel が内部識別子のときの人間向け表示 */
export const CENTER_KEY_DISPLAY_MAP: Record<string, string> = {
  will_core: "最上位意志核",
  beauty_compiler: "美文構成",
  language_essence: "言語の本質",
  drift_firewall: "応答ドリフト",
  kotodama_hisho: "言霊秘書",
  kotodama: "言霊",
  katakamuna: "カタカムナ",
  self_reflection: "自己観照",
  conversation_system: "会話系",
  tenmon_density_contract_v1: "密度契約",
  consciousness: "意識・自己性の問い",
  relational_worldview: "関係性の世界観",
  conversational_general: "一般会話",
  general_factual: "事実整理",
  general_knowledge: "一般知識",
  general_relation: "関係の整理",
  iroha_counsel: "イロハによる伴走",
  worldview: "世界観",
  life: "人生",
  time: "時間",
  life_force: "命",
  truth: "真理",
  explicit_char: "明示的文字量",
  TENMON_SCRIPTURE_CANON_V1: "原典・経典の芯",
};

/** TASK_RETURN_LAW_TRANSLATOR_V1: responseAxis / 内部軸 ID → 人間向け短名 */
export const RESPONSE_AXIS_DISPLAY_MAP: Record<string, string> = {
  tenmon_density_contract_v1: "密度と契約（本文の芯）",
  will_core: "最上位意志核",
  concept: "概念の芯",
  thread_center: "会話の中心",
};

const KHSL_LAW_RE = /KHSL:LAW:[A-Za-z0-9:_-]+/g;

export function humanizeKhslLawKeyForDisplay(lawKey: string): string {
  const k = String(lawKey || "").trim();
  if (!k.startsWith("KHSL:LAW:")) return k;
  const mapped = KHSL_LAW_DISPLAY_MAP[k];
  if (mapped) return mapped;
  return "経典に根ざす法則（呼称は人間向けに要約）";
}

/**
 * centerKey / centerLabel が内部識別子のとき人間向け表示へ。law key は humanizeKhslLawKeyForDisplay へ。
 */
export function humanizeCenterKeyForDisplay(keyOrLabel: string): string {
  const k = String(keyOrLabel || "").trim();
  if (!k) return k;
  if (k.startsWith("KHSL:LAW:")) return humanizeKhslLawKeyForDisplay(k);
  const mapped = CENTER_KEY_DISPLAY_MAP[k];
  if (mapped) return mapped;
  if (isLikelyRawInternalToken(k)) return "判断軸（内部参照は要約表示）";
  return k.slice(0, 200);
}

/** responseAxis 等の短い内部識別子を人間向けへ */
export function humanizeResponseAxisForDisplay(axis: string): string {
  const a = String(axis || "").trim();
  if (!a) return a;
  const mapped = RESPONSE_AXIS_DISPLAY_MAP[a];
  if (mapped) return mapped;
  return humanizeCenterKeyForDisplay(a);
}

/**
 * answerMode / routeClass など英語トークンを表面一文用の日本語へ（契約値は ku 側で不変）。
 */
export function humanReadableAnswerModeForSurface(mode: string): string {
  const m = String(mode || "").trim().toLowerCase();
  const map: Record<string, string> = {
    define: "定義",
    analysis: "分析",
    support: "受容と支え",
    worldview: "世界観",
    continuity: "続きと推移",
    chat: "会話",
    general: "整理",
  };
  if (map[m]) return map[m];
  if (isLikelyRawInternalToken(m)) return "判断の整理";
  return String(mode || "").trim().slice(0, 48) || "整理";
}

/**
 * 本文・semantic 内の KHSL:LAW:* をすべて表示用ラベルへ置換。
 */
export function humanizeProseKhslLawKeys(text: string): string {
  const t = String(text || "");
  if (!t.includes("KHSL:LAW:")) return t;
  return t.replace(KHSL_LAW_RE, (m) => humanizeKhslLawKeyForDisplay(m));
}

function isLikelyRawInternalToken(s: string): boolean {
  if (s.startsWith("KHSL:LAW:")) return true;
  if (/^KHSL:/.test(s)) return true;
  // 長い定数っぽい ASCII のみ（日本語無し）は本文向きにしない
  if (s.length >= 16 && /^[A-Z0-9_:.-]+$/.test(s) && !/[ぁ-んァ-ヶ一-龥]/.test(s)) return true;
  return false;
}

/**
 * 【天聞の所見】見出し用の中心表示。label / meaning を優先し、内部 key は人間可読へ。
 */
export function humanReadableCenterContractFromKu(ku: Record<string, unknown> | null | undefined): string {
  if (!ku || typeof ku !== "object") return "この問い";

  const pick = (v: unknown) => String(v ?? "").trim();

  const ss = ku.sourceStackSummary;
  const pmFromStack =
    ss && typeof ss === "object" && !Array.isArray(ss)
      ? pick((ss as Record<string, unknown>).primaryMeaning)
      : "";

  const candidates: string[] = [
    pick(ku.centerLabel),
    pick(ku.threadCenterLabel),
    pick(ku.centerMeaning),
    pick(ku.threadCenterMeaning),
    pmFromStack.length > 0 && pmFromStack.length <= 120 ? humanizeCenterKeyForDisplay(pmFromStack) : "",
    pick(ku.centerKey),
    pick(ku.threadCenterKey),
  ];

  for (const c of candidates) {
    if (!c) continue;
    return humanizeCenterKeyForDisplay(c);
  }

  return "この問い";
}

// --- MAINLINE_WILL_LAW_SOURCE_VISIBLE_REPAIR_V1 ---

/** sourcePack 内部値を本文・根拠行向けに短く言い換え（英語トークンを表に出さない） */
export function humanizeSourcePackForSurfaceV1(pack: string): string {
  const p = String(pack || "").trim();
  if (!p) return "";
  const low = p.toLowerCase();
  if (low === "general") return "正典と会話の往還（一般束）";
  if (low === "canon" || low === "scripture") return "原典の一節たち";
  if (low === "subconcept") return "下位概念の参照束";
  if (low === "concept") return "概念参照束";
  if (/^[a-z0-9_-]{1,40}$/i.test(p) && !/[ぁ-んァ-ヶ一-龥]/.test(p)) return "参照束（内部名は省略）";
  return p.slice(0, 56);
}

/** 会話系診断へ誤って滑る原理・定義プローブ（finalize 救済・見出し補正用） */
export function isTenmonPrincipleOrCanonProbeMessageV1(message: string): boolean {
  const s = String(message || "").trim();
  if (!s) return false;
  if (/(言霊|カタカムナ)/u.test(s) && /(とは|何|本質|違い)/u.test(s)) return true;
  if (/言語の本質|言語とは/u.test(s)) return true;
  if (/TENMON-ARKの意志|天聞.*意志/u.test(s)) return true;
  if (/(原典|経典)/u.test(s) && /(とは|本質|芯|何)/u.test(s)) return true;
  if (/Ω|オメガ|[DdＤd]\s*[⋅・·]\s*[ΔD]/u.test(s)) return true;
  if (/天津金木/u.test(s)) return true;
  if (/構造/u.test(s) && /(真理|運動|写す|原理|金木)/u.test(s)) return true;
  if (
    /TENMON-ARK/u.test(s) &&
    /構造/u.test(s) &&
    !/(現状|完成度|診断|どこまで|繋がって|つながって|接続済み|構築状況)/u.test(s)
  ) {
    return true;
  }
  return false;
}

export function looksLikeMisappliedSystemDiagnosisTemplateV1(body: string): boolean {
  return /(骨格層はかなり接続済み|通常会話の主権|system diagnosis|residual の入口固定|fallback に流れます)/u.test(
    String(body || "")
  );
}

/** ユーザ発話から見出し用の短い立脚名（内部 key は返さない） */
export function principleFootingLabelFromUserMessageV1(message: string): string | null {
  const s = String(message || "").trim();
  if (!s) return null;
  if (/Ω|オメガ|[DdＤd]\s*[⋅・·]/u.test(s)) return "Ω＝D·ΔS（会話設計）";
  if (/言霊/u.test(s)) return "言霊";
  if (/言語の本質|言語とは/u.test(s)) return "言語の本質";
  if (/TENMON-ARKの意志|天聞.*意志/u.test(s)) return "天聞の意志";
  if (/(原典|経典)/u.test(s)) return "原典・経典の芯";
  if (/天津金木/u.test(s)) return "天津金木の写像";
  if (/TENMON-ARK/u.test(s) && /構造/u.test(s)) return "TENMON-ARKの構造";
  if (/カタカムナ/u.test(s)) return "カタカムナ";
  return null;
}

/** 診断テンプレが誤って載った本文を、原理問い向けに最小置換（再推論なし） */
export function synthesizePrincipleFootingBodyV1(userMsg: string): string {
  const m = String(userMsg || "").trim();
  if (/Ω|オメガ|[DdＤd]\s*[⋅・·]\s*[ΔD]/u.test(m)) {
    return "Ω＝D·ΔSを会話に置くと、「いま確定している見立て（D）」と「相手側で起きた解釈や態度の変化（ΔS）」をかけ合わせ、その場で増える変化量として読めます。問いの置き方と締めの一行でDを固定し、返答でΔSを更新する、という設計になります。";
  }
  if (/言霊/u.test(m) && /(とは|何|って)/u.test(m)) {
    return "言霊は、ことばが事象の位相に触れ、聞き手の受け取りと結びながら、その場の意味の重心をひとつ立てる見立てです。比喩だけに逃げず、どの語が何を現実側に接続しているかを一文で押さえるのが要です。";
  }
  if (/カタカムナ/u.test(m) && /言霊/u.test(m)) {
    return "言霊は意味の圧縮と共同注意の同期を前景に置く経路、カタカムナは響きと唱句の配列を前景に置く経路、という原理の差があります。どちらも語を通じて位相を動かす点は共通しつつ、主に鍛える層が分かれます。";
  }
  if (/カタカムナ/u.test(m)) {
    return "カタカムナは、音律・唱句の層としての語路を正面に置く経路です。響きの配列そのものに寄る点が、意味規格を前景に置く言霊経路と原理上ずれます。";
  }
  if (/言語の本質|言語とは/u.test(m)) {
    return "言語の本質は、意味の圧縮と共同注意の同期です。他者と同じ輪郭を一時的に共有し、その場の判断と次の行為を同期させる回路として働きます。";
  }
  if (/TENMON-ARKの意志|意志/u.test(m) && /天聞/u.test(m)) {
    return "TENMON-ARKの意志は、憲法で縛られた裁定順序（中心・根拠・表現）を崩さず、会話へ落とすことです。派手な人格演出より、手順の安定と根拠の提示を優先する姿勢が核になります。";
  }
  if (/(原典|経典)/u.test(m)) {
    return "原典の芯は、言葉の背後に検証可能な参照層を置き、比喩と定義を混線させない規律です。引用の系譜を一言で示し、本文はいまの問いへの当てはめに寄せます。";
  }
  if (/天津金木/u.test(m)) {
    return "天津金木の見立てでは、真理を静止した結論として止めず、運動（変化の連なり）へ写すことで意味が生きます。静的命題より、流れのどこに接点を持つかを先に置くのが骨格です。";
  }
  if (/TENMON-ARK/u.test(m) && /構造/u.test(m)) {
    return "TENMON-ARKの構造は、脳幹で中心を定め、参照と記憶を照合し、最後に会話面へ投影する往還です。憲法・思考・原典・監査の主幹が回路になり、末端は通常の会話表現へ落ちる階層で捉えられます。";
  }
  return "この問いは原理の芯に触れています。焦点を一句に固定し、その焦点に根ざす述定を先に置きます。";
}

export function repairSystemDiagnosisBodyIfMisappliedV1(
  body: string,
  routeReason: string,
  userMsg: string
): string {
  if (String(routeReason || "") !== "SYSTEM_DIAGNOSIS_PREEMPT_V1") return body;
  if (!isTenmonPrincipleOrCanonProbeMessageV1(userMsg)) return body;
  if (!looksLikeMisappliedSystemDiagnosisTemplateV1(body)) return body;
  return synthesizePrincipleFootingBodyV1(userMsg);
}

/** lawsUsed のうち本文向けに出してよいものだけを人間語へ（密度パック等は落とす） */
function humanizeLawUsedForSurfaceV1(law: string): string | null {
  const L = String(law || "").trim();
  if (!L) return null;
  if (/TENMON_DENSITY_SURFACE_PACK|^TENMON_DENSITY_/u.test(L)) return null;
  if (L.startsWith("KHSL:LAW:")) return humanizeKhslLawKeyForDisplay(L);
  if (L.length <= 52 && /^[A-Z][A-Z0-9_]+$/u.test(L)) return null;
  return L.slice(0, 72);
}

/** sourcePack＋参照法則から、先頭近くに置く一文（内部キーなし） */
export function buildSourcePackFootingClauseV1(ku: Record<string, unknown> | null | undefined): string {
  if (!ku || typeof ku !== "object") return "";
  const sp = humanizeSourcePackForSurfaceV1(String(ku.sourcePack ?? "").trim());
  const laws = Array.isArray(ku.lawsUsed) ? (ku.lawsUsed as unknown[]) : [];
  const humanLaw =
    laws.map((x) => humanizeLawUsedForSurfaceV1(String(x))).find((x) => x && x.length > 0) || "";
  if (humanLaw && sp) return `読みは${sp}を手元に、${humanLaw}の一節で支えています。`;
  if (sp) return `いまの読み方は${sp}に沿っています。`;
  if (humanLaw) return `手元の法則として${humanLaw}を用いています。`;
  return "";
}

/** 「根拠束:」機械行の代替。数え上げ臭を抑えた一文〜二文。 */
export function buildHumanReadableEvidenceFootingLineV1(args: {
  centerContract: string;
  lawsN: number;
  eviN: number;
  sourceHint: string;
  sourcePackRaw: string;
}): string {
  const pack = humanizeSourcePackForSurfaceV1(args.sourcePackRaw);
  const hint = String(args.sourceHint || "").trim();
  const parts: string[] = [];
  if (hint && hint !== args.centerContract) {
    parts.push(`意味の芯は「${hint.slice(0, 88)}」に置いています`);
  }
  if (pack) parts.push(`典拠は${pack}から拾っています`);
  if (args.lawsN > 0 || args.eviN > 0) {
    parts.push("法則と断片を手元で照合しています");
  }
  if (parts.length === 0) return "";
  return `いまの答えは、${parts.join("。")}。`;
}

/** LLM が本文中に埋め込んだ旧式「根拠束／次の一手」行を落とす（finalize 末尾と重複させない） */
export function stripEmbeddedMechanicalBundleLinesV1(text: string): string {
  return String(text || "")
    .split(/\n\n+/u)
    .map((p) => p.trim())
    .filter((p) => {
      if (/^根拠束[:：]/u.test(p)) return false;
      if (/^次の一手[:：]/u.test(p) && /判断軸|深めてください/u.test(p)) return false;
      return true;
    })
    .join("\n\n")
    .trim();
}

/** 会話系診断の定型段落だけを本文から剥がす（全体置換は repair 側） */
export function stripDiagnosisTemplateParagraphsV1(text: string): string {
  return String(text || "")
    .split(/\n\n+/u)
    .map((p) => p.trim())
    .filter(
      (p) =>
        !/(骨格層はかなり接続済み|通常会話の主権|system diagnosis|residual の入口固定|fallback に流れます)/u.test(
          p
        )
    )
    .join("\n\n")
    .trim();
}

/** 原理4系統＋誤診断救済時: 先頭二文以内に立脚を置く見出し */
export function buildMainlineTenmonHeadV1(args: {
  ku: Record<string, unknown>;
  centerContract: string;
  mission: string;
  userMessage: string;
  sourceFootingClause: string;
}): string {
  const rr = String(args.ku.routeReason ?? "");
  /** CONTINUITY_ROUTE_HOLD_V1: 内部 carry は ku に残し、表面は本文一段のみ（立脚ラベル禁止） */
  if (rr === "CONTINUITY_ROUTE_HOLD_V1") return "";
  /** TENMON_CONVERSATION_COMPLETION_CAMPAIGN_V1: 先頭に「立脚の中心は…」固定を置かず、本文の直接回答を優先 */
  if (
    /^(WORLDVIEW_ROUTE_V1|DEF_LLM_TOP|NATURAL_GENERAL_LLM_TOP|TENMON_SUBCONCEPT_CANON_V1|KANAGI_CONVERSATION_V1|R22_JUDGEMENT_PREEMPT_V1|ABSTRACT_FRAME_VARIATION_V1|TENMON_SCRIPTURE_CANON_V1|KATAKAMUNA_CANON_ROUTE_V1|SOUL_FASTPATH_VERIFIED_V1|SOUL_DEF_SURFACE_V1)$/u.test(
      rr
    ) ||
    /^SOUL_/u.test(rr)
  ) {
    return "【天聞の所見】";
  }
  /** TENMON_FINAL_PWA_SURFACE_LAST_MILE_V1: R22/continuity/compare の表面を「一見出し」に収束（routeReason 的立脚前置きを抑止） */
  if (
    /^(R22_NEXTSTEP_FOLLOWUP_V1|CONTINUITY_ANCHOR_V1|R22_ESSENCE_FOLLOWUP_V1|R22_COMPARE_ASK_V1|R22_COMPARE_FOLLOWUP_V1|RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1)$/u.test(
      rr
    )
  ) {
    return "【天聞の所見】";
  }
  const ck = String(args.ku.centerKey ?? "");
  const probeMsg = isTenmonPrincipleOrCanonProbeMessageV1(args.userMessage);
  const plFromUser = principleFootingLabelFromUserMessageV1(args.userMessage);

  /** ルートが general でも、発話が原理プローブなら立脚ラベルをユーザー意図に合わせる */
  if (probeMsg && plFromUser) {
    const s1 = `立脚の中心は「${plFromUser}」です。`;
    const clause = String(args.sourceFootingClause || "").trim();
    const s2 = clause ? `${clause} いまは${args.mission}の立場で答えます。` : `いまは${args.mission}の立場で答えます。`;
    return `【天聞の所見】${s1}${s2}`;
  }

  const principleRoute =
    /WILL_CORE|LANGUAGE_ESSENCE|TENMON_SCRIPTURE|SCRIPTURE_LOCAL|DEF_FASTPATH_VERIFIED|iroha_kotodama|katakamuna_kotodama|R22_ESSENCE|KOTODAMA|TENMON_STRUCTURE_LOCK_V1/u.test(
      rr
    ) ||
    /will_core|kotodama|language_essence|katakamuna|scripture|kotodama_hisho/u.test(ck);

  let footingLabel = args.centerContract;
  if (rr === "SYSTEM_DIAGNOSIS_PREEMPT_V1" && probeMsg) {
    const pl = principleFootingLabelFromUserMessageV1(args.userMessage);
    if (pl) footingLabel = pl;
  }

  const needPrincipleHead = principleRoute || (rr === "SYSTEM_DIAGNOSIS_PREEMPT_V1" && probeMsg);

  if (needPrincipleHead) {
    const s1 = `立脚の中心は「${footingLabel}」です。`;
    const clause = String(args.sourceFootingClause || "").trim();
    const s2 = clause ? `${clause} いまは${args.mission}の立場で答えます。` : `いまは${args.mission}の立場で答えます。`;
    return `【天聞の所見】${s1}${s2}`;
  }
  return `【天聞の所見】${args.centerContract}について、今回は${args.mission}の立場で答えます。`;
}

/** 本文に紛れた内部 centerKey / 定数を表示名へ（KHSL は humanizeProse 側） */
export function stripInternalApiKeysFromSurfaceProseV1(text: string): string {
  let t = String(text || "");
  const keys = Object.keys(CENTER_KEY_DISPLAY_MAP).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const disp = CENTER_KEY_DISPLAY_MAP[k];
    if (!disp || k.length < 4) continue;
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![A-Za-z0-9_])${esc}(?![A-Za-z0-9_])`, "g");
    t = t.replace(re, disp);
  }
  return t;
}
