import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection, { schema, mode: "default" });

// いろは47文字のデータ（空海のいろは文原稿から抽出）
const irohaData = [
  { character: "い", order: 1, reading: "イ", interpretation: "生命の始まり、根源", lifePrinciple: "生命の根源・血液と肉体の結びつき" },
  { character: "ろ", order: 2, reading: "ロ", interpretation: "流れ、循環", lifePrinciple: "血液の流れ・生命活動のエネルギー" },
  { character: "は", order: 3, reading: "ハ", interpretation: "発する、開く", lifePrinciple: "生命の発現・エネルギーの放出" },
  { character: "に", order: 4, reading: "ニ", interpretation: "二つの存在、陰陽", lifePrinciple: "肉体と血液の二つの存在・互いに結び合う" },
  { character: "ほ", order: 5, reading: "ホ", interpretation: "穂、実り", lifePrinciple: "生命の実り・成長の結果" },
  { character: "へ", order: 6, reading: "ヘ", interpretation: "辺、境界", lifePrinciple: "生命の境界・内と外の区別" },
  { character: "と", order: 7, reading: "ト", interpretation: "戸、入口", lifePrinciple: "生命の入口・栄養の取り込み" },
  { character: "ち", order: 8, reading: "チ", interpretation: "血、生命力", lifePrinciple: "血液・生命の根源的なエネルギー" },
  { character: "り", order: 9, reading: "リ", interpretation: "理、法則", lifePrinciple: "生命の法則・秩序" },
  { character: "ぬ", order: 10, reading: "ヌ", interpretation: "縫う、織る", lifePrinciple: "織ぬき・生命の織り成す構造" },
  { character: "る", order: 11, reading: "ル", interpretation: "流る、巡る", lifePrinciple: "湯つ水ヨ・生命の循環" },
  { character: "を", order: 12, reading: "ヲ", interpretation: "緒、つながり", lifePrinciple: "縦縦の巻・生命のつながり" },
  { character: "わ", order: 13, reading: "ワ", interpretation: "輪、円", lifePrinciple: "ワ輪・生命の円環構造" },
  { character: "か", order: 14, reading: "カ", interpretation: "楕、形", lifePrinciple: "カ楕・生命の形態" },
  { character: "よ", order: 15, reading: "ヨ", interpretation: "世、時代", lifePrinciple: "世代・生命の継承" },
  { character: "た", order: 16, reading: "タ", interpretation: "田、育む", lifePrinciple: "食物の浄化・栄養を育てる" },
  { character: "れ", order: 17, reading: "レ", interpretation: "連れ、伴う", lifePrinciple: "健康が生まれる・生命の伴走者" },
  { character: "そ", order: 18, reading: "ソ", interpretation: "そこ、基盤", lifePrinciple: "消化器官・生命の基盤" },
  { character: "つ", order: 19, reading: "ツ", interpretation: "繋ぐ、続く", lifePrinciple: "体を育てる・生命の継続" },
  { character: "ね", order: 20, reading: "ネ", interpretation: "根、基礎", lifePrinciple: "栄養を取り込む・生命の根" },
  { character: "な", order: 21, reading: "ナ", interpretation: "名、本質", lifePrinciple: "エネルギーを生み出す・生命の本質" },
  { character: "ら", order: 22, reading: "ラ", interpretation: "螺旋、上昇", lifePrinciple: "習慣の力・螺旋的な成長" },
  { character: "む", order: 23, reading: "ム", interpretation: "無、空", lifePrinciple: "決断と選択・無から有を生む" },
  { character: "う", order: 24, reading: "ウ", interpretation: "宇、空間", lifePrinciple: "宇宙の法則・生命の空間" },
  { character: "ゐ", order: 25, reading: "ヰ", interpretation: "居、存在", lifePrinciple: "存在の確立・生命の居場所" },
  { character: "の", order: 26, reading: "ノ", interpretation: "野、広がり", lifePrinciple: "生命の広がり・可能性の拡大" },
  { character: "お", order: 27, reading: "オ", interpretation: "起、始動", lifePrinciple: "人生における調和・出来事の起こり" },
  { character: "く", order: 28, reading: "ク", interpretation: "無の味、決断", lifePrinciple: "決断と生きの選択・人生の味わい" },
  { character: "や", order: 29, reading: "ヤ", interpretation: "矢、方向", lifePrinciple: "宿命と運命・人生の方向性" },
  { character: "ま", order: 30, reading: "マ", interpretation: "真、誠", lifePrinciple: "運命を動かす・真実の力" },
  { character: "け", order: 31, reading: "ケ", interpretation: "差別、区別", lifePrinciple: "差別を超える・本質を見極める" },
  { character: "ふ", order: 32, reading: "フ", interpretation: "吹、風", lifePrinciple: "風のように柔軟に対応する" },
  { character: "こ", order: 33, reading: "コ", interpretation: "凝、固まる", lifePrinciple: "意識の凝縮・決意の固まり" },
  { character: "え", order: 34, reading: "エ", interpretation: "胞衣、包む", lifePrinciple: "生命を包む・保護する力" },
  { character: "て", order: 35, reading: "テ", interpretation: "発、現れる", lifePrinciple: "天命を導く・生命の発現" },
  { character: "あ", order: 36, reading: "ア", interpretation: "阿、始まり", lifePrinciple: "すべての始まり・根源の音" },
  { character: "さ", order: 37, reading: "サ", interpretation: "差、違い", lifePrinciple: "個性・それぞれの違い" },
  { character: "き", order: 38, reading: "キ", interpretation: "気、エネルギー", lifePrinciple: "生命のエネルギー・気の流れ" },
  { character: "ゆ", order: 39, reading: "ユ", interpretation: "湯、温かさ", lifePrinciple: "温かさ・生命の温もり" },
  { character: "め", order: 40, reading: "メ", interpretation: "芽、発芽", lifePrinciple: "新しい生命の芽生え" },
  { character: "み", order: 41, reading: "ミ", interpretation: "実、結実", lifePrinciple: "生命の実り・成果" },
  { character: "し", order: 42, reading: "シ", interpretation: "死、終わり", lifePrinciple: "生命の終わりと再生" },
  { character: "ゑ", order: 43, reading: "ヱ", interpretation: "恵、恩恵", lifePrinciple: "生命の恵み・恩恵" },
  { character: "ひ", order: 44, reading: "ヒ", interpretation: "火、光", lifePrinciple: "火のエネルギー・光の力" },
  { character: "も", order: 45, reading: "モ", interpretation: "藻、生命", lifePrinciple: "水中の生命・藻のように繁茂する" },
  { character: "せ", order: 46, reading: "セ", interpretation: "背、支える", lifePrinciple: "生命を支える・背骨のような存在" },
  { character: "す", order: 47, reading: "ス", interpretation: "巣、居場所", lifePrinciple: "生命の居場所・帰るべき場所" }
];

async function seed() {
  console.log("🌱 Seeding Iroha interpretations...");
  
  // いろは言灵解を投入
  for (const iroha of irohaData) {
    await db.insert(schema.irohaInterpretations).values(iroha).onDuplicateKeyUpdate({ set: iroha });
  }
  
  console.log("✅ Iroha interpretations seeded successfully!");
  console.log("🎉 All seed data has been inserted!");
}

seed()
  .then(() => {
    console.log("✅ Seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
