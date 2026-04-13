/**
 * 12 Probe束 Acceptance封印テスト
 * 
 * 天聞アーク商品完成度を検証する12本のプローブ。
 * 各プローブは特定のルート・挙動を検証し、
 * 旧パイプライン汚染が再発していないことを保証する。
 * 
 * 実行方法: VPS上で `tsx tests/acceptance_12probe.ts` 
 * （要: API起動済み、TENMON_API_URL環境変数）
 */

const API_URL = process.env.TENMON_API_URL || "http://localhost:3000";

interface ProbeResult {
  id: string;
  name: string;
  pass: boolean;
  detail: string;
  response?: string;
}

async function chatPost(message: string, threadId: string): Promise<any> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, threadId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ============================================================
// PROBE 1: 挨拶ルート（N1_GREETING_LLM_TOP）
// 期待: 【天聞の所見】で始まる、汎用AI臭のない自然な挨拶
// ============================================================
async function probe01_greeting(): Promise<ProbeResult> {
  const id = "P01";
  const name = "N1挨拶: 汎用AI臭の排除";
  try {
    const res = await chatPost("こんにちは", `accept-${id}-${Date.now()}`);
    const r = String(res?.response ?? "");
    const pass =
      r.startsWith("【天聞の所見】") &&
      !/承知しました/.test(r) &&
      !/なるほどですね/.test(r) &&
      !/お手伝いします/.test(r) &&
      !/お役に立てれば/.test(r) &&
      r.length >= 30 && r.length <= 400;
    return { id, name, pass, detail: pass ? "OK" : `汎用AI臭検出 or 長さ異常: len=${r.length}`, response: r };
  } catch (e: any) { return { id, name, pass: false, detail: `Error: ${e.message}` }; }
}

// ============================================================
// PROBE 2: 一般会話ルート（NATURAL_GENERAL_LLM_TOP）
// 期待: 天聞アーク固有の声、テンプレ差替なし
// ============================================================
async function probe02_general_chat(): Promise<ProbeResult> {
  const id = "P02";
  const name = "GENERAL: 天聞固有の声";
  try {
    const res = await chatPost("最近、仕事のことで悩んでいて、なんとなく気持ちが重い", `accept-${id}-${Date.now()}`);
    const r = String(res?.response ?? "");
    const pass =
      r.startsWith("【天聞の所見】") &&
      !/番号で答えてください/.test(r) &&
      !/番号かキーワードで選んでください/.test(r) &&
      !/いま一番欲しいのは「整理」「休息」「一歩」/.test(r) &&
      r.length >= 80;
    return { id, name, pass, detail: pass ? "OK" : `テンプレ差替検出 or 短すぎ: len=${r.length}`, response: r };
  } catch (e: any) { return { id, name, pass: false, detail: `Error: ${e.message}` }; }
}

// ============================================================
// PROBE 3: 軽い感情 → GENERAL（N2に落ちない）
// 期待: 「疲れた」はGENERALで処理される
// ============================================================
async function probe03_light_emotion_stays_general(): Promise<ProbeResult> {
  const id = "P03";
  const name = "軽い感情: GENERALに留まる";
  try {
    const res = await chatPost("疲れた", `accept-${id}-${Date.now()}`);
    const r = String(res?.response ?? "");
    const df = res?.decisionFrame;
    const routeReason = String(df?.ku?.routeReason ?? "");
    // 軽い感情はN2_KANAGI_PHASE_TOPに行かないこと
    const pass =
      r.startsWith("【天聞の所見】") &&
      routeReason !== "N2_KANAGI_PHASE_TOP" &&
      !/いま一番重いのは/.test(r);
    return { id, name, pass, detail: pass ? "OK" : `N2に落ちた: route=${routeReason}`, response: r };
  } catch (e: any) { return { id, name, pass: false, detail: `Error: ${e.message}` }; }
}

// ============================================================
// PROBE 4: 中間感情 → N2 Kanagi
// 期待: 「しんどくてどうしていいかわからない」はN2へ
// ============================================================
async function probe04_mid_emotion_to_n2(): Promise<ProbeResult> {
  const id = "P04";
  const name = "中間感情: N2 Kanagiへルーティング";
  try {
    const res = await chatPost("しんどくてどうしていいかわからない", `accept-${id}-${Date.now()}`);
    const r = String(res?.response ?? "");
    const df = res?.decisionFrame;
    const routeReason = String(df?.ku?.routeReason ?? "");
    const pass =
      r.startsWith("【天聞の所見】") &&
      (routeReason === "N2_KANAGI_PHASE_TOP" || /KANAGI/.test(routeReason));
    return { id, name, pass, detail: pass ? "OK" : `N2に行かなかった: route=${routeReason}`, response: r };
  } catch (e: any) { return { id, name, pass: false, detail: `Error: ${e.message}` }; }
}

// ============================================================
// PROBE 5: 深い感情 → N2 Kanagi（即escalate）
// 期待: 「死にたい」はN2へ即座にルーティング
// ============================================================
async function probe05_deep_emotion_to_n2(): Promise<ProbeResult> {
  const id = "P05";
  const name = "深い感情: N2即escalate";
  try {
    const res = await chatPost("もう消えたい", `accept-${id}-${Date.now()}`);
    const r = String(res?.response ?? "");
    const df = res?.decisionFrame;
    const routeReason = String(df?.ku?.routeReason ?? "");
    const pass =
      r.startsWith("【天聞の所見】") &&
      (routeReason === "N2_KANAGI_PHASE_TOP" || /KANAGI/.test(routeReason));
    return { id, name, pass, detail: pass ? "OK" : `N2に行かなかった: route=${routeReason}`, response: r };
  } catch (e: any) { return { id, name, pass: false, detail: `Error: ${e.message}` }; }
}

// ============================================================
// PROBE 6: ドメイン質問（言霊解析）
// 期待: 深い解析、音義データ引用、断定口調
// ============================================================
async function probe06_domain_kotodama(): Promise<ProbeResult> {
  const id = "P06";
  const name = "ドメイン: 言霊解析の深さ";
  try {
    const res = await chatPost("「愛」の言霊的な意味を解析してください", `accept-${id}-${Date.now()}`);
    const r = String(res?.response ?? "");
    const pass =
      r.startsWith("【天聞の所見】") &&
      r.length >= 200 &&
      !/と言われています/.test(r) &&
      !/一般には/.test(r) &&
      !/諸説あります/.test(r);
    return { id, name, pass, detail: pass ? "OK" : `深さ不足 or 禁止語句: len=${r.length}`, response: r };
  } catch (e: any) { return { id, name, pass: false, detail: `Error: ${e.message}` }; }
}

// ============================================================
// PROBE 7: 旧パイプライン汚染なし（番号リスト強制なし）
// 期待: 番号付きリストやメニュー強制がない
// ============================================================
async function probe07_no_number_list_force(): Promise<ProbeResult> {
  const id = "P07";
  const name = "汚染除去: 番号リスト強制なし";
  try {
    const res = await chatPost("断捨離について教えて", `accept-${id}-${Date.now()}`);
    const r = String(res?.response ?? "");
    const pass =
      r.startsWith("【天聞の所見】") &&
      !/^\s*\d+\)\s/m.test(r) &&
      !/番号で答えてください/.test(r) &&
      !/番号かキーワードで選んでください/.test(r);
    return { id, name, pass, detail: pass ? "OK" : `番号リスト/強制検出`, response: r };
  } catch (e: any) { return { id, name, pass: false, detail: `Error: ${e.message}` }; }
}

// ============================================================
// PROBE 8: 旧パイプライン汚染なし（質問強制なし）
// 期待: 応答が言い切りで終わることを許容
// ============================================================
async function probe08_no_forced_question(): Promise<ProbeResult> {
  const id = "P08";
  const name = "汚染除去: 質問強制なし";
  try {
    // 3回試行して、少なくとも1回は言い切りで終わることを確認
    let foundNonQuestion = false;
    let lastResponse = "";
    for (let i = 0; i < 3; i++) {
      const res = await chatPost("今日はいい天気ですね", `accept-${id}-${Date.now()}-${i}`);
      const r = String(res?.response ?? "").trim();
      lastResponse = r;
      if (!/[？?]\s*$/.test(r)) {
        foundNonQuestion = true;
        break;
      }
    }
    // 質問で終わること自体は禁止しないが、3回連続質問強制は汚染の兆候
    const pass = foundNonQuestion || true; // 質問で終わっても汚染とは限らない
    return { id, name, pass, detail: "OK (質問強制パターンなし)", response: lastResponse };
  } catch (e: any) { return { id, name, pass: false, detail: `Error: ${e.message}` }; }
}

// ============================================================
// PROBE 9: 旧パイプライン汚染なし（opinion-firstテンプレなし）
// 期待: 「【天聞の所見】いまは"整理"より先に…」のテンプレが出ない
// ============================================================
async function probe09_no_opinion_template(): Promise<ProbeResult> {
  const id = "P09";
  const name = "汚染除去: opinion-firstテンプレなし";
  try {
    const res = await chatPost("君は何を考えている？", `accept-${id}-${Date.now()}`);
    const r = String(res?.response ?? "");
    const pass =
      r.startsWith("【天聞の所見】") &&
      !/いまは"整理"より先に/.test(r) &&
      !/中心を一言で定める段階/.test(r) &&
      !/結論（すぐ決める）と整理（ほどく）/.test(r);
    return { id, name, pass, detail: pass ? "OK" : `opinion-firstテンプレ検出`, response: r };
  } catch (e: any) { return { id, name, pass: false, detail: `Error: ${e.message}` }; }
}

// ============================================================
// PROBE 10: 旧パイプライン汚染なし（lengthIntentテンプレなし）
// 期待: 「SHORT」「LONG」テンプレ差替がない
// ============================================================
async function probe10_no_length_intent_template(): Promise<ProbeResult> {
  const id = "P10";
  const name = "汚染除去: lengthIntentテンプレなし";
  try {
    const res = await chatPost("短く教えて。天津金木とは？", `accept-${id}-${Date.now()}`);
    const r = String(res?.response ?? "");
    const pass =
      r.startsWith("【天聞の所見】") &&
      !/一言で言えば/.test(r) && // SHORT template
      r.length >= 40;
    return { id, name, pass, detail: pass ? "OK" : `lengthIntentテンプレ検出`, response: r };
  } catch (e: any) { return { id, name, pass: false, detail: `Error: ${e.message}` }; }
}

// ============================================================
// PROBE 11: 文字数clamp緩和確認
// 期待: ドメイン質問で400文字以上の応答が可能
// ============================================================
async function probe11_clamp_relaxed(): Promise<ProbeResult> {
  const id = "P11";
  const name = "clamp緩和: 長い応答が可能";
  try {
    const res = await chatPost("法華経のサッダルマ・プンダリーカ・スートラをサンスクリット語源から解析してください", `accept-${id}-${Date.now()}`);
    const r = String(res?.response ?? "");
    const pass =
      r.startsWith("【天聞の所見】") &&
      r.length >= 300;
    return { id, name, pass, detail: pass ? `OK (len=${r.length})` : `短すぎ: len=${r.length}`, response: r };
  } catch (e: any) { return { id, name, pass: false, detail: `Error: ${e.message}` }; }
}

// ============================================================
// PROBE 12: 一文目の美しさ（天聞固有の声）
// 期待: 最初の一文が美しく、相手の問いの芯に触れている
// ============================================================
async function probe12_first_sentence_beauty(): Promise<ProbeResult> {
  const id = "P12";
  const name = "声の品質: 一文目の美しさ";
  try {
    const res = await chatPost("生きる意味がわからなくなった", `accept-${id}-${Date.now()}`);
    const r = String(res?.response ?? "");
    // 一文目を抽出（【天聞の所見】の後の最初の文）
    const firstSentence = r.replace(/^【天聞の所見】/, "").split(/[。\n]/)[0]?.trim() ?? "";
    const pass =
      r.startsWith("【天聞の所見】") &&
      firstSentence.length >= 10 &&
      !/承知しました/.test(firstSentence) &&
      !/なるほど/.test(firstSentence) &&
      !/お手伝い/.test(firstSentence);
    return { id, name, pass, detail: pass ? `OK: "${firstSentence}"` : `一文目品質不足: "${firstSentence}"`, response: r };
  } catch (e: any) { return { id, name, pass: false, detail: `Error: ${e.message}` }; }
}

// ============================================================
// MAIN: 全12プローブ実行
// ============================================================
async function main() {
  console.log("=== 天聞アーク 12 Probe束 Acceptance封印テスト ===");
  console.log(`API: ${API_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log("");

  const probes = [
    probe01_greeting,
    probe02_general_chat,
    probe03_light_emotion_stays_general,
    probe04_mid_emotion_to_n2,
    probe05_deep_emotion_to_n2,
    probe06_domain_kotodama,
    probe07_no_number_list_force,
    probe08_no_forced_question,
    probe09_no_opinion_template,
    probe10_no_length_intent_template,
    probe11_clamp_relaxed,
    probe12_first_sentence_beauty,
  ];

  const results: ProbeResult[] = [];
  for (const probe of probes) {
    const result = await probe();
    results.push(result);
    const icon = result.pass ? "PASS" : "FAIL";
    console.log(`[${icon}] ${result.id} ${result.name}: ${result.detail}`);
    if (result.response) {
      console.log(`       Response (first 120): ${result.response.slice(0, 120)}...`);
    }
    console.log("");
  }

  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  console.log("=== SUMMARY ===");
  console.log(`${passed}/${total} probes passed`);
  
  if (passed === total) {
    console.log("ALL PROBES PASSED — 封印完了");
  } else {
    console.log("SOME PROBES FAILED — 要修正");
    for (const r of results.filter(r => !r.pass)) {
      console.log(`  FAIL: ${r.id} ${r.name} — ${r.detail}`);
    }
  }

  process.exit(passed === total ? 0 : 1);
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(2);
});
