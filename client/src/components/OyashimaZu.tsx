import { Circle, Square } from "lucide-react";
import { useState } from "react";

// 言霊秘書の詳細情報
const kotodamaDetails: Record<string, {
  classification: string;
  meanings: string[];
  spiritual_origin: string;
}> = {
  "あ": {
    classification: "空中ノ水灵",
    meanings: ["出息也", "命也", "五十連総名", "天也", "海也", "吾也", "自然也", "○也"],
    spiritual_origin: "天の初発、息の解き始め"
  },
  "い": {
    classification: "空中ノ水灵（霊核）",
    meanings: ["浮昇也", "動也", "生也", "暗也"],
    spiritual_origin: "霊核、天地の中心点"
  },
  "う": {
    classification: "空中ノ水灵",
    meanings: ["胞衣也", "肢也", "枝也"],
    spiritual_origin: "包む、抱く"
  },
  "え": {
    classification: "空中ノ水灵（霊核）",
    meanings: ["起也", "貴也", "高也", "於也"],
    spiritual_origin: "霊核、天地の中心点"
  },
  "お": {
    classification: "空中ノ水灵",
    meanings: ["此ア行ヘ総テ天ニ位シテ親音也"],
    spiritual_origin: "天の総括音"
  },
  "か": {
    classification: "昇火ノ灵",
    meanings: ["彰也", "昇也", "別也", "家也", "真也"],
    spiritual_origin: "火の芽ぶき、発・端"
  },
  "き": {
    classification: "昇火ノ灵",
    meanings: ["彰ノ火ノ灵", "気也", "正気也"],
    spiritual_origin: "気・正気"
  },
  "し": {
    classification: "昇水ノ灵",
    meanings: ["静寂", "火の鍵まり"],
    spiritual_origin: "静寂"
  },
  "ち": {
    classification: "水中火ノ灵",
    meanings: ["地の力", "水の安定"],
    spiritual_origin: "地の力"
  },
  "ア": {
    classification: "空中ノ水灵",
    meanings: ["出息也", "命也", "五十連総名"],
    spiritual_origin: "天の初発、息の解き始め"
  },
  "イ": {
    classification: "空中ノ水灵（霊核）",
    meanings: ["浮昇也", "動也", "生也"],
    spiritual_origin: "霊核、天地の中心点"
  },
  "カ": {
    classification: "昇火ノ灵",
    meanings: ["彰也", "昇也", "別也"],
    spiritual_origin: "火の芽ぶき"
  },
  "サ": {
    classification: "昇水ノ灵",
    meanings: ["割別也", "細也", "小也"],
    spiritual_origin: "霊の分離と発動"
  },
};

// 大八嶋図の五十音配置（言霊秘書に基づく）
const oyashimaHiragana = [
  // 円環状配置（時計回り、外側から内側へ）
  { sound: "あ", angle: 0, radius: 120, color: "#00BFFF" },
  { sound: "か", angle: 36, radius: 120, color: "#FF4500" },
  { sound: "さ", angle: 72, radius: 120, color: "#4169E1" },
  { sound: "た", angle: 108, radius: 120, color: "#FF8C00" },
  { sound: "な", angle: 144, radius: 120, color: "#9370DB" },
  { sound: "は", angle: 180, radius: 120, color: "#FF4500" },
  { sound: "ま", angle: 216, radius: 120, color: "#4169E1" },
  { sound: "や", angle: 252, radius: 120, color: "#FFD700" },
  { sound: "ら", angle: 288, radius: 120, color: "#FF4500" },
  { sound: "わ", angle: 324, radius: 120, color: "#00BFFF" },
  // 内側の円
  { sound: "い", angle: 18, radius: 80, color: "#00BFFF" },
  { sound: "き", angle: 54, radius: 80, color: "#FF4500" },
  { sound: "し", angle: 90, radius: 80, color: "#4169E1" },
  { sound: "ち", angle: 126, radius: 80, color: "#FF8C00" },
  { sound: "に", angle: 162, radius: 80, color: "#9370DB" },
  { sound: "ひ", angle: 198, radius: 80, color: "#FF4500" },
  { sound: "み", angle: 234, radius: 80, color: "#4169E1" },
  { sound: "り", angle: 270, radius: 80, color: "#FF4500" },
  { sound: "ゐ", angle: 306, radius: 80, color: "#00BFFF" },
  { sound: "う", angle: 342, radius: 80, color: "#00BFFF" },
];

const oyashimaKatakana = [
  // 方形配置（上から下、右から左）
  { sound: "ア", x: 3, y: 0, color: "#00BFFF" },
  { sound: "カ", x: 2, y: 0, color: "#FF4500" },
  { sound: "サ", x: 1, y: 0, color: "#4169E1" },
  { sound: "タ", x: 0, y: 0, color: "#FF8C00" },
  { sound: "イ", x: 3, y: 1, color: "#00BFFF" },
  { sound: "キ", x: 2, y: 1, color: "#FF4500" },
  { sound: "シ", x: 1, y: 1, color: "#4169E1" },
  { sound: "チ", x: 0, y: 1, color: "#FF8C00" },
  { sound: "ウ", x: 3, y: 2, color: "#00BFFF" },
  { sound: "ク", x: 2, y: 2, color: "#FF4500" },
  { sound: "ス", x: 1, y: 2, color: "#4169E1" },
  { sound: "ツ", x: 0, y: 2, color: "#FF8C00" },
  { sound: "エ", x: 3, y: 3, color: "#00BFFF" },
  { sound: "ケ", x: 2, y: 3, color: "#FF4500" },
  { sound: "セ", x: 1, y: 3, color: "#4169E1" },
  { sound: "テ", x: 0, y: 3, color: "#FF8C00" },
];

interface OyashimaZuProps {
  type: "hiragana" | "katakana";
}

export function OyashimaZu({ type }: OyashimaZuProps) {
  const [hoveredSound, setHoveredSound] = useState<string | null>(null);

  if (type === "hiragana") {
    return (
      <div className="relative w-full h-96 flex items-center justify-center">
        <svg width="300" height="300" viewBox="-150 -150 300 300" className="overflow-visible">
          {/* 外側の円 */}
          <circle
            cx="0"
            cy="0"
            r="120"
            fill="none"
            stroke="#00BFFF"
            strokeWidth="2"
            className="animate-spin"
            style={{ animationDuration: "30s" }}
          />
          
          {/* 内側の円 */}
          <circle
            cx="0"
            cy="0"
            r="80"
            fill="none"
            stroke="#00BFFF"
            strokeWidth="1.5"
            opacity="0.6"
            className="animate-spin"
            style={{ animationDuration: "20s", animationDirection: "reverse" }}
          />
          
          {/* 中心の円 */}
          <circle
            cx="0"
            cy="0"
            r="40"
            fill="none"
            stroke="#FFD700"
            strokeWidth="1"
            opacity="0.4"
          />

          {/* カタカムナ図形（⊕）のパターン */}
          {oyashimaHiragana.map((item, idx) => {
            const x = item.radius * Math.cos((item.angle * Math.PI) / 180);
            const y = item.radius * Math.sin((item.angle * Math.PI) / 180);
            
            return (
              <g key={idx}>
                {/* ⊕ 図形 */}
                <circle
                  cx={x}
                  cy={y}
                  r="15"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="1.5"
                  opacity="0.6"
                />
                <line
                  x1={x - 15}
                  y1={y}
                  x2={x + 15}
                  y2={y}
                  stroke={item.color}
                  strokeWidth="1"
                  opacity="0.6"
                />
                <line
                  x1={x}
                  y1={y - 15}
                  x2={x}
                  y2={y + 15}
                  stroke={item.color}
                  strokeWidth="1"
                  opacity="0.6"
                />
                
                {/* 文字 */}
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={item.color}
                  fontSize="18"
                  fontWeight="bold"
                  className="cursor-pointer hover:opacity-100 transition-opacity"
                  opacity="0.9"
                  onMouseEnter={() => setHoveredSound(item.sound)}
                  onMouseLeave={() => setHoveredSound(null)}
                >
                  {item.sound}
                </text>
              </g>
            );
          })}

          {/* ミナカ点（中心） */}
          <circle
            cx="0"
            cy="0"
            r="8"
            fill="#FFD700"
            className="animate-pulse"
          />
          <circle
            cx="0"
            cy="0"
            r="12"
            fill="none"
            stroke="#FFD700"
            strokeWidth="2"
            opacity="0.5"
            className="animate-ping"
          />
        </svg>
        
      {hoveredSound && kotodamaDetails[hoveredSound] && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-black/95 border-2 border-cyan-400 rounded-lg p-4 text-sm shadow-xl z-10 min-w-[300px]">
          <div className="space-y-2">
            <p className="font-bold text-cyan-400 text-lg">{hoveredSound}</p>
            <p className="text-cyan-300 text-xs">{kotodamaDetails[hoveredSound].classification}</p>
            <p className="text-white">{kotodamaDetails[hoveredSound].spiritual_origin}</p>
            <div className="pt-2 border-t border-cyan-400/30">
              <p className="text-gray-300 text-xs">
                {kotodamaDetails[hoveredSound].meanings.slice(0, 3).join("、")}
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    );
  }

  // カタカナ（方形）
  return (
    <div className="relative w-full h-96 flex items-center justify-center">
      <svg width="300" height="300" viewBox="-150 -150 300 300" className="overflow-visible">
        {/* 外側の方形 */}
        <rect
          x="-120"
          y="-120"
          width="240"
          height="240"
          fill="none"
          stroke="#FFD700"
          strokeWidth="2"
          className="animate-pulse"
        />
        
        {/* 内側の方形 */}
        <rect
          x="-80"
          y="-80"
          width="160"
          height="160"
          fill="none"
          stroke="#FFD700"
          strokeWidth="1.5"
          opacity="0.6"
        />
        
        {/* 中心の方形 */}
        <rect
          x="-40"
          y="-40"
          width="80"
          height="80"
          fill="none"
          stroke="#FFD700"
          strokeWidth="1"
          opacity="0.4"
        />

        {/* カタカムナ図形（⊕と十の組み合わせ）のパターン */}
        {oyashimaKatakana.map((item, idx) => {
          const x = -90 + item.x * 60;
          const y = -90 + item.y * 60;
          
          return (
            <g key={idx}>
              {/* ⊕ 図形 */}
              <rect
                x={x - 15}
                y={y - 15}
                width="30"
                height="30"
                fill="none"
                stroke={item.color}
                strokeWidth="1.5"
                opacity="0.6"
              />
              <line
                x1={x - 15}
                y1={y}
                x2={x + 15}
                y2={y}
                stroke={item.color}
                strokeWidth="1"
                opacity="0.6"
              />
              <line
                x1={x}
                y1={y - 15}
                x2={x}
                y2={y + 15}
                stroke={item.color}
                strokeWidth="1"
                opacity="0.6"
              />
              
              {/* 文字 */}
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={item.color}
                fontSize="20"
                fontWeight="bold"
                className="cursor-pointer hover:opacity-100 transition-opacity"
                opacity="0.9"
                onMouseEnter={() => setHoveredSound(item.sound)}
                onMouseLeave={() => setHoveredSound(null)}
              >
                {item.sound}
              </text>
            </g>
          );
        })}

        {/* ミナカ点（中心） */}
        <circle
          cx="0"
          cy="0"
          r="8"
          fill="#FFD700"
          className="animate-pulse"
        />
        <rect
          x="-12"
          y="-12"
          width="24"
          height="24"
          fill="none"
          stroke="#FFD700"
          strokeWidth="2"
          opacity="0.5"
          className="animate-ping"
        />
      </svg>
      
      {hoveredSound && kotodamaDetails[hoveredSound] && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-black/95 border-2 border-yellow-400 rounded-lg p-4 text-sm shadow-xl z-10 min-w-[300px]">
          <div className="space-y-2">
            <p className="font-bold text-yellow-400 text-lg">{hoveredSound}</p>
            <p className="text-yellow-300 text-xs">{kotodamaDetails[hoveredSound].classification}</p>
            <p className="text-white">{kotodamaDetails[hoveredSound].spiritual_origin}</p>
            <div className="pt-2 border-t border-yellow-400/30">
              <p className="text-gray-300 text-xs">
                {kotodamaDetails[hoveredSound].meanings.slice(0, 3).join("、")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
