/**
 * 災い分類エンジン（Disaster Classifier Engine）
 * ================================================
 * 宿曜経の27宿から、行動パターン上の「災い型」を特定する。
 * 
 * 設計思想:
 *   - 宿曜は「どの癖が災いを生むか」を特定する層
 *   - 災いを曖昧にせず、構造化された分類に落とす
 *   - 「性格」ではなく「反復する失敗様式」として記述
 * 
 * 8つの災い型:
 *   1. 衝突型 — 正面衝突で関係を壊す
 *   2. 停滞型 — 判断保留で流れを失う
 *   3. 散漫型 — 集中が続かず成果が散る
 *   4. 依存型 — 他者軸になり自己を失う
 *   5. 過剰責任型 — 抱え込みで消耗する
 *   6. 自己否定型 — 自分を責めて動けなくなる
 *   7. 焦燥暴発型 — 過熱して暴走する
 *   8. 閉塞硬直型 — 閉じこもって変化を拒む
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DisasterProfile {
  /** 主災い型 */
  corePattern: string;
  /** 副災い型 */
  subPattern: string;
  /** 発火条件 */
  triggerConditions: string[];
  /** 崩壊パターン */
  collapsePattern: string;
  /** 回復の鍵 */
  recoveryKey: string;
  /** 対人リスク */
  relationRisk: string;
  /** 金銭リスク */
  moneyRisk: string;
  /** 心身リスク */
  bodyRisk: string;
  /** 時期リスク */
  timingRisk: string;
  /** 水火の偏り方向 */
  fireWaterImbalance: string;
  /** 補足 */
  notes: string[];
}

// ---------------------------------------------------------------------------
// 27宿 → 災い型マッピング
// ---------------------------------------------------------------------------

const SHUKU_DISASTER_MAP: Record<string, Omit<DisasterProfile, 'notes'>> = {
  // === 東方七宿（青龍）===
  "角": {
    corePattern: "過剰責任型",
    subPattern: "緊張持続型",
    triggerConditions: ["役割を背負いすぎる", "期待に応え続けようとする", "完璧主義が発動する"],
    collapsePattern: "限界まで耐えた後に急激に消耗し、突然動けなくなる",
    recoveryKey: "荷重を分散し、開放の音を入れる",
    relationRisk: "正しさが先行して柔らかさを失いやすい。相手を裁く傾向",
    moneyRisk: "堅実だが抱え込みで判断が遅れ、好機を逃す",
    bodyRisk: "肩・首・眼の緊張、頭痛、不眠",
    timingRisk: "責務集中期に崩れやすい",
    fireWaterImbalance: "火が内に籠もり、水が枯渇",
  },
  "亢": {
    corePattern: "衝突型",
    subPattern: "正義暴走型",
    triggerConditions: ["不正を見た時", "自分の信念が否定された時", "理不尽な状況"],
    collapsePattern: "正論で相手を追い詰め、孤立する",
    recoveryKey: "正しさより調和を選ぶ訓練",
    relationRisk: "議論が攻撃に変わりやすい。味方を敵に変える",
    moneyRisk: "感情的な判断で損切りが遅れる",
    bodyRisk: "胃腸の炎症、血圧上昇",
    timingRisk: "対立構造が生まれた時に暴発",
    fireWaterImbalance: "火が過剰、水の鎮静が不足",
  },
  "氐": {
    corePattern: "閉塞硬直型",
    subPattern: "変化拒絶型",
    triggerConditions: ["環境の急変", "慣れた場所・人を失う", "予定外の出来事"],
    collapsePattern: "変化を拒み続け、時代に取り残される",
    recoveryKey: "小さな変化を自ら起こす習慣",
    relationRisk: "相手の変化を受け入れられず、関係が硬直する",
    moneyRisk: "保守的すぎて成長機会を逃す",
    bodyRisk: "腰・関節の硬直、慢性的な重さ",
    timingRisk: "転換期に適応できず停滞",
    fireWaterImbalance: "水が停滞し、火の推進力が不足",
  },
  "房": {
    corePattern: "依存型",
    subPattern: "情緒連動型",
    triggerConditions: ["関係の温度差", "見捨てられ不安", "孤独感"],
    collapsePattern: "相手軸になり自己判断が鈍る。共依存に陥る",
    recoveryKey: "境界を立てる音で自軸を回復",
    relationRisk: "密着と反動の揺れ。相手に合わせすぎて自分を見失う",
    moneyRisk: "情に引かれて判断を誤る。貸し借りのトラブル",
    bodyRisk: "睡眠・自律神経の揺れ、情緒不安定",
    timingRisk: "対人変動期に弱い",
    fireWaterImbalance: "水が過剰に流れ、火の自立が不足",
  },
  "心": {
    corePattern: "焦燥暴発型",
    subPattern: "支配衝動型",
    triggerConditions: ["思い通りにならない時", "権威を脅かされた時", "待てない状況"],
    collapsePattern: "怒りが爆発し、周囲を焼き尽くす。後悔の連鎖",
    recoveryKey: "火を鎮め、一拍置く訓練",
    relationRisk: "支配的になりやすい。相手を萎縮させる",
    moneyRisk: "衝動的な大きな賭けに出やすい",
    bodyRisk: "心臓・血管系の負担、高血圧",
    timingRisk: "勝負期に過熱しすぎる",
    fireWaterImbalance: "火が暴走、水の制御が効かない",
  },
  "尾": {
    corePattern: "自己否定型",
    subPattern: "完璧主義崩壊型",
    triggerConditions: ["失敗した時", "他人と比較された時", "期待に応えられなかった時"],
    collapsePattern: "自分を責め続け、行動が止まる。引きこもり傾向",
    recoveryKey: "不完全を許す言葉を入れる",
    relationRisk: "自己卑下が相手を疲れさせる。助けを求められない",
    moneyRisk: "自分に投資できない。チャンスを「自分には無理」と見送る",
    bodyRisk: "下腹部・腎臓系の冷え、慢性疲労",
    timingRisk: "評価される場面で萎縮",
    fireWaterImbalance: "火が消えかけ、水が冷えすぎている",
  },
  "箕": {
    corePattern: "散漫型",
    subPattern: "自由放縦型",
    triggerConditions: ["束縛された時", "ルーティンの繰り返し", "退屈"],
    collapsePattern: "興味が散り、何も完成しない。信頼を失う",
    recoveryKey: "一つに絞る訓練。完了の快感を知る",
    relationRisk: "約束を守れない。相手の期待を裏切る",
    moneyRisk: "衝動買い、計画性のなさ",
    bodyRisk: "消化器系の不調、過食・拒食の揺れ",
    timingRisk: "長期プロジェクトで集中が切れる",
    fireWaterImbalance: "火が散り、水の集中力が不足",
  },

  // === 北方七宿（玄武）===
  "斗": {
    corePattern: "過剰責任型",
    subPattern: "孤高型",
    triggerConditions: ["誰にも頼れない状況", "リーダーを任された時", "弱みを見せられない"],
    collapsePattern: "一人で全てを背負い、孤立して燃え尽きる",
    recoveryKey: "弱さを見せる勇気。助けを求める音",
    relationRisk: "距離を置きすぎて親密さが生まれない",
    moneyRisk: "大局は見えるが、細部の管理が疎かになる",
    bodyRisk: "背中・脊椎の緊張、慢性的な疲労感",
    timingRisk: "責任が集中する時期に孤立",
    fireWaterImbalance: "火が高く燃えすぎ、水の潤いが不足",
  },
  "女": {
    corePattern: "自己否定型",
    subPattern: "比較劣等型",
    triggerConditions: ["他者の成功を見た時", "評価されなかった時", "容姿・能力の比較"],
    collapsePattern: "嫉妬が自己否定に変わり、行動が止まる",
    recoveryKey: "自分の固有価値を言語化する",
    relationRisk: "嫉妬が関係を蝕む。素直に喜べない",
    moneyRisk: "見栄で浪費する傾向",
    bodyRisk: "婦人科系・ホルモンバランスの乱れ",
    timingRisk: "他者が注目される時期に崩れる",
    fireWaterImbalance: "水が濁り、火の自信が不足",
  },
  "虚": {
    corePattern: "停滞型",
    subPattern: "空虚逃避型",
    triggerConditions: ["意味を見失った時", "努力が報われない時", "虚しさ"],
    collapsePattern: "何をしても無意味に感じ、全てを放棄する",
    recoveryKey: "小さな達成感を積み上げる",
    relationRisk: "心ここにあらずで相手を不安にさせる",
    moneyRisk: "無関心による管理放棄",
    bodyRisk: "倦怠感、免疫力低下、無気力",
    timingRisk: "目標喪失期に長期停滞",
    fireWaterImbalance: "火も水も枯渇、生命力の低下",
  },
  "危": {
    corePattern: "焦燥暴発型",
    subPattern: "危険誘引型",
    triggerConditions: ["安定が続いた時の退屈", "刺激への渇望", "リスクへの魅力"],
    collapsePattern: "わざわざ危険に飛び込み、自ら崩壊を招く",
    recoveryKey: "安定の中に小さな冒険を設計する",
    relationRisk: "刺激を求めて関係を壊す。浮気・裏切りの誘惑",
    moneyRisk: "ギャンブル的投資、ハイリスク行動",
    bodyRisk: "事故・怪我のリスク、アドレナリン依存",
    timingRisk: "平穏期にわざと波乱を起こす",
    fireWaterImbalance: "火が暴走し、水の冷静さが消失",
  },
  "室": {
    corePattern: "閉塞硬直型",
    subPattern: "内向閉鎖型",
    triggerConditions: ["外部からの干渉", "プライバシーの侵害", "強制的な社交"],
    collapsePattern: "殻に閉じこもり、外界との接点を断つ",
    recoveryKey: "安全な場所から少しずつ外へ出る",
    relationRisk: "心を開かない。相手が壁を感じる",
    moneyRisk: "情報不足による判断ミス",
    bodyRisk: "呼吸器系の不調、閉塞感",
    timingRisk: "社交が求められる時期に引きこもる",
    fireWaterImbalance: "水が内に溜まり、火の発散が不足",
  },
  "壁": {
    corePattern: "停滞型",
    subPattern: "理想乖離型",
    triggerConditions: ["理想と現実のギャップ", "計画通りに進まない時", "不完全な状況"],
    collapsePattern: "完璧を求めすぎて動けない。計画倒れ",
    recoveryKey: "60点で動く訓練。完璧より完了",
    relationRisk: "相手に理想を押し付ける",
    moneyRisk: "準備に時間をかけすぎて機会損失",
    bodyRisk: "頭痛、思考の堂々巡り",
    timingRisk: "決断が求められる時期に固まる",
    fireWaterImbalance: "水が理想に流れ、火の実行力が不足",
  },

  // === 西方七宿（白虎）===
  "奎": {
    corePattern: "散漫型",
    subPattern: "多才分散型",
    triggerConditions: ["選択肢が多い時", "新しいことへの誘惑", "飽き"],
    collapsePattern: "あれもこれもと手を出し、どれも中途半端",
    recoveryKey: "一つを極める覚悟。選択と集中",
    relationRisk: "関心が移りやすく、相手が不安になる",
    moneyRisk: "投資先が分散しすぎる",
    bodyRisk: "神経系の疲労、注意力散漫",
    timingRisk: "選択を迫られる時期に迷走",
    fireWaterImbalance: "火が散り、水の集約力が不足",
  },
  "婁": {
    corePattern: "過剰責任型",
    subPattern: "世話焼き消耗型",
    triggerConditions: ["困っている人を見た時", "頼まれた時", "断れない状況"],
    collapsePattern: "他者の問題を引き受けすぎて自分が潰れる",
    recoveryKey: "自分を先に満たす。断る技術",
    relationRisk: "恩着せがましくなる。見返りを期待する",
    moneyRisk: "他者への出費が嵩む",
    bodyRisk: "胃腸の不調、ストレス性の体調不良",
    timingRisk: "周囲が困窮する時期に共倒れ",
    fireWaterImbalance: "水が他者に流れ出し、火の自己保全が不足",
  },
  "胃": {
    corePattern: "焦燥暴発型",
    subPattern: "欲望暴走型",
    triggerConditions: ["欲しいものが目の前にある時", "我慢を強いられた時", "空腹感（物質的・精神的）"],
    collapsePattern: "欲望に突き動かされ、後先考えずに行動する",
    recoveryKey: "欲望と必要を区別する訓練",
    relationRisk: "自分の欲求を優先し、相手を顧みない",
    moneyRisk: "衝動的な浪費、過食的な消費",
    bodyRisk: "胃腸の過負荷、肥満、消化器系疾患",
    timingRisk: "豊かさが手に入りそうな時に暴走",
    fireWaterImbalance: "火が貪欲に燃え、水の節制が不足",
  },
  "昴": {
    corePattern: "焦燥暴発型",
    subPattern: "成果圧迫型",
    triggerConditions: ["急な評価競争", "比較される状況", "成果を急かされる"],
    collapsePattern: "急進→摩擦→孤立。スピードで周囲を置き去りにする",
    recoveryKey: "火を鎮め、水の音で温度を下げる",
    relationRisk: "勝ち負けで人間関係を壊しやすい",
    moneyRisk: "勢いで動き、計算を怠る",
    bodyRisk: "のぼせ・炎症・焦燥、頭部の熱",
    timingRisk: "勝負期に過熱しやすい",
    fireWaterImbalance: "火が過熱、水の冷却が追いつかない",
  },
  "畢": {
    corePattern: "閉塞硬直型",
    subPattern: "執着固定型",
    triggerConditions: ["手放すべきものがある時", "過去への未練", "変化の要求"],
    collapsePattern: "過去に執着し、新しい可能性を閉ざす",
    recoveryKey: "手放す練習。古いものを流す音",
    relationRisk: "過去の関係に囚われる。元恋人への執着",
    moneyRisk: "損切りができない。含み損を抱え続ける",
    bodyRisk: "肩・首の凝り、目の疲れ",
    timingRisk: "手放しが必要な転換期に固着",
    fireWaterImbalance: "水が固まり、火の新生力が不足",
  },
  "觜": {
    corePattern: "衝突型",
    subPattern: "言葉の刃型",
    triggerConditions: ["論理的に正しい時", "相手の矛盾を見つけた時", "知的優位に立てる時"],
    collapsePattern: "鋭い言葉で相手を切り、関係を破壊する",
    recoveryKey: "知性を癒しに使う訓練。言葉を柔らかくする",
    relationRisk: "正論で相手を傷つける。知的マウント",
    moneyRisk: "分析は得意だが、行動に移せない",
    bodyRisk: "喉・口腔の不調、歯の問題",
    timingRisk: "議論が白熱する場面で暴発",
    fireWaterImbalance: "火が言葉に集中し、水の共感が不足",
  },
  "参": {
    corePattern: "衝突型",
    subPattern: "戦闘本能型",
    triggerConditions: ["競争環境", "挑戦を受けた時", "負けそうな時"],
    collapsePattern: "戦い続けて疲弊し、味方まで敵に回す",
    recoveryKey: "戦わない強さを知る。協調の音",
    relationRisk: "常に勝負モードで、相手が疲れる",
    moneyRisk: "勝負に賭けすぎる",
    bodyRisk: "筋肉・関節の過負荷、怪我",
    timingRisk: "競争が激化する時期に消耗",
    fireWaterImbalance: "火が戦闘に燃え、水の和合が不足",
  },

  // === 南方七宿（朱雀）===
  "井": {
    corePattern: "停滞型",
    subPattern: "知識溺没型",
    triggerConditions: ["情報が多すぎる時", "学びが目的化した時", "行動より理解を優先する時"],
    collapsePattern: "知識を溜め込むだけで行動に移せない",
    recoveryKey: "知ったら即動く。アウトプットの習慣",
    relationRisk: "頭でっかちで相手の感情を見落とす",
    moneyRisk: "分析麻痺で投資タイミングを逃す",
    bodyRisk: "目の疲れ、脳の過負荷、座りすぎ",
    timingRisk: "行動が求められる時期に動けない",
    fireWaterImbalance: "水が知識に溜まり、火の行動力が不足",
  },
  "鬼": {
    corePattern: "自己否定型",
    subPattern: "感受性過敏型",
    triggerConditions: ["他者の感情を受けすぎた時", "批判された時", "孤独を感じた時"],
    collapsePattern: "他者の痛みを自分のものとして背負い、潰れる",
    recoveryKey: "自他の境界を明確にする。防御の音",
    relationRisk: "共感しすぎて消耗する。境界線が曖昧",
    moneyRisk: "感情的な判断で散財",
    bodyRisk: "精神的な疲労、うつ傾向、免疫低下",
    timingRisk: "感情的な波が大きい時期に崩れる",
    fireWaterImbalance: "水が他者の感情で溢れ、火の自己防衛が不足",
  },
  "柳": {
    corePattern: "依存型",
    subPattern: "承認渇望型",
    triggerConditions: ["認められなかった時", "無視された時", "存在価値を疑う時"],
    collapsePattern: "承認を求めて自分を曲げ、本来の自分を見失う",
    recoveryKey: "自己承認の訓練。外からの評価に依存しない",
    relationRisk: "相手の顔色を窺いすぎる。自分の意見を言えない",
    moneyRisk: "見栄のための出費",
    bodyRisk: "消化器系の不調、ストレス性の症状",
    timingRisk: "評価が下がる時期に自己崩壊",
    fireWaterImbalance: "水が外に流れ出し、火の自己主張が不足",
  },
  "星": {
    corePattern: "焦燥暴発型",
    subPattern: "完璧主義暴発型",
    triggerConditions: ["不完全な状況", "自分の基準に達しない時", "中途半端な結果"],
    collapsePattern: "完璧を求めて周囲に怒りをぶつけ、関係を壊す",
    recoveryKey: "不完全の美を受け入れる。許しの音",
    relationRisk: "高い基準を相手にも求め、圧力をかける",
    moneyRisk: "品質にこだわりすぎてコスト超過",
    bodyRisk: "心臓・循環器系の負担、緊張性頭痛",
    timingRisk: "成果を求められる時期に暴発",
    fireWaterImbalance: "火が完璧に燃え、水の柔軟性が不足",
  },
  "張": {
    corePattern: "散漫型",
    subPattern: "華美拡散型",
    triggerConditions: ["注目を浴びたい時", "地味な作業が続く時", "表舞台から外れた時"],
    collapsePattern: "見栄えを追い、中身が伴わない。信頼を失う",
    recoveryKey: "地味な積み重ねの価値を知る",
    relationRisk: "表面的な付き合いが多く、深い関係が築けない",
    moneyRisk: "見栄のための浪費、ブランド依存",
    bodyRisk: "心臓の負担、過労",
    timingRisk: "華やかさが求められない時期に焦る",
    fireWaterImbalance: "火が外に散り、水の内省が不足",
  },
  "翼": {
    corePattern: "過剰責任型",
    subPattern: "献身消耗型",
    triggerConditions: ["誰かのために動きすぎる", "自分の時間がなくなる", "感謝されない時"],
    collapsePattern: "献身が報われず、静かに燃え尽きる",
    recoveryKey: "自分のための時間を確保する。自己充電の音",
    relationRisk: "尽くしすぎて対等な関係が築けない",
    moneyRisk: "他者への投資が過剰になる",
    bodyRisk: "慢性疲労、背中・肩の痛み",
    timingRisk: "奉仕が長期化する時期に消耗",
    fireWaterImbalance: "水が他者に注がれ、火の自己保全が不足",
  },
  "軫": {
    corePattern: "停滞型",
    subPattern: "優柔不断型",
    triggerConditions: ["二択を迫られた時", "どちらも正しい時", "失敗を恐れる時"],
    collapsePattern: "決められずに時間だけが過ぎ、全てを失う",
    recoveryKey: "不完全でも選ぶ訓練。決断の音",
    relationRisk: "態度が曖昧で相手を不安にさせる",
    moneyRisk: "判断の遅れで損失が拡大",
    bodyRisk: "胃腸の不調、優柔不断からくるストレス",
    timingRisk: "決断期に動けない",
    fireWaterImbalance: "水が迷いに流れ、火の決断力が不足",
  },
};

// ---------------------------------------------------------------------------
// Core Function
// ---------------------------------------------------------------------------

/**
 * 宿名から災い型プロファイルを生成する
 */
export function classifyDisaster(
  honmeiShuku: string,
  options?: {
    boundaryRange?: string;
    confidence?: string;
    consultationTheme?: string;
  }
): DisasterProfile {
  const base = SHUKU_DISASTER_MAP[honmeiShuku];

  if (!base) {
    // 未登録宿のデフォルト
    return {
      corePattern: "停滞型",
      subPattern: "未分類",
      triggerConditions: ["情報不足", "自己解釈の迷走"],
      collapsePattern: "判断保留が続いて流れを失う",
      recoveryKey: "構造化して一歩ずつ動く",
      relationRisk: "誤解の固定化",
      moneyRisk: "様子見が長引く",
      bodyRisk: "慢性的な重さ",
      timingRisk: "判断先送り期",
      fireWaterImbalance: "火も水も不明瞭",
      notes: ["宿別ルール未登録のため暫定分類"],
    };
  }

  const notes: string[] = [
    `本命宿「${honmeiShuku}」を主軸に分類`,
  ];

  if (options?.confidence) {
    notes.push(`信頼度: ${options.confidence}`);
  }
  if (options?.boundaryRange) {
    notes.push(`境界帯あり: ${options.boundaryRange}`);
  }
  if (options?.consultationTheme) {
    notes.push(`相談テーマ: ${options.consultationTheme}`);
  }

  return { ...base, notes };
}

/**
 * 災い型の日本語説明を生成する（レポート用）
 */
export function describeDisasterPattern(profile: DisasterProfile): string {
  let text = "";
  text += `【主災い型】${profile.corePattern}\n`;
  text += `【副災い型】${profile.subPattern}\n\n`;

  text += `この構造が意味するのは、あなたの人生において「${profile.corePattern}」が最も繰り返されやすい失敗パターンであるということです。`;
  text += `これは性格の欠点ではなく、宿命的な反応回路です。\n\n`;

  text += `【発火条件】\n`;
  for (const trigger of profile.triggerConditions) {
    text += `　・${trigger}\n`;
  }
  text += `\n`;

  text += `【崩壊パターン】\n`;
  text += `　${profile.collapsePattern}\n\n`;

  text += `【各領域のリスク】\n`;
  text += `　対人: ${profile.relationRisk}\n`;
  text += `　金銭: ${profile.moneyRisk}\n`;
  text += `　心身: ${profile.bodyRisk}\n`;
  text += `　時期: ${profile.timingRisk}\n\n`;

  text += `【水火の偏り】\n`;
  text += `　${profile.fireWaterImbalance}\n\n`;

  text += `【回復の鍵】\n`;
  text += `　${profile.recoveryKey}\n`;

  return text;
}
