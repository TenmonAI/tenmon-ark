import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * 五十音の行分類
 */
type GojuonRow = "a" | "ka" | "sa" | "ta" | "na" | "ha" | "ma" | "ya" | "ra" | "wa";

/**
 * 五十音入力検知システム
 * 
 * ア行入力 → 右旋の光が走る
 * ウ行入力 → 左旋の光が沈む
 * ヤ行入力 → 霊核が一瞬白く点滅
 * ワ行入力 → 外側リングが脈動
 * 各音の火水属性に応じた発光色
 */
export function GojuonInputDetector({ inputText }: { inputText: string }) {
  const [activeRow, setActiveRow] = useState<GojuonRow | null>(null);
  const [lastChar, setLastChar] = useState("");

  // 五十音の行を判定
  const detectGojuonRow = (char: string): GojuonRow | null => {
    const hiragana = char.toLowerCase();
    
    // ア行（あいうえお）
    if (/[あいうえお]/.test(hiragana)) return "a";
    // カ行（かきくけこ）
    if (/[かきくけこがぎぐげご]/.test(hiragana)) return "ka";
    // サ行（さしすせそ）
    if (/[さしすせそざじずぜぞ]/.test(hiragana)) return "sa";
    // タ行（たちつてと）
    if (/[たちつてとだぢづでど]/.test(hiragana)) return "ta";
    // ナ行（なにぬねの）
    if (/[なにぬねの]/.test(hiragana)) return "na";
    // ハ行（はひふへほ）
    if (/[はひふへほばびぶべぼぱぴぷぺぽ]/.test(hiragana)) return "ha";
    // マ行（まみむめも）
    if (/[まみむめも]/.test(hiragana)) return "ma";
    // ヤ行（やゆよ）
    if (/[やゆよ]/.test(hiragana)) return "ya";
    // ラ行（らりるれろ）
    if (/[らりるれろ]/.test(hiragana)) return "ra";
    // ワ行（わをん）
    if (/[わをん]/.test(hiragana)) return "wa";
    
    return null;
  };

  // 火水属性に応じた色を取得
  const getRowColor = (row: GojuonRow): string => {
    const colors: Record<GojuonRow, string> = {
      a: "rgba(255, 215, 0, 0.8)", // 金色（火）
      ka: "rgba(255, 100, 0, 0.8)", // 朱色（火）
      sa: "rgba(0, 191, 255, 0.8)", // 青色（水）
      ta: "rgba(255, 150, 50, 0.8)", // 橙色（火）
      na: "rgba(100, 200, 255, 0.8)", // 水色（水）
      ha: "rgba(255, 180, 100, 0.8)", // 金橙色（火）
      ma: "rgba(150, 220, 255, 0.8)", // 淡青色（水）
      ya: "rgba(255, 255, 255, 0.9)", // 白色（霊核）
      ra: "rgba(200, 230, 255, 0.8)", // 淡水色（水）
      wa: "rgba(180, 200, 255, 0.8)", // 淡青紫色（水）
    };
    return colors[row] || "rgba(255, 215, 0, 0.8)";
  };

  useEffect(() => {
    if (inputText.length > 0) {
      const newChar = inputText[inputText.length - 1];
      if (newChar !== lastChar) {
        setLastChar(newChar);
        const row = detectGojuonRow(newChar);
        if (row) {
          setActiveRow(row);
          setTimeout(() => setActiveRow(null), 800);
        }
      }
    }
  }, [inputText, lastChar]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <AnimatePresence>
        {activeRow && (
          <>
            {/* ア行：右旋の光が走る */}
            {activeRow === "a" && (
              <motion.div
                initial={{ x: "-100%", opacity: 0, rotate: 0 }}
                animate={{ x: "100%", opacity: [0, 1, 0], rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute top-1/2 left-0 w-full h-2"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${getRowColor("a")} 50%, transparent 100%)`,
                  boxShadow: `0 0 20px ${getRowColor("a")}`,
                  filter: "blur(3px)",
                }}
              />
            )}

            {/* カ行・タ行・ハ行：右旋の渦 */}
            {(activeRow === "ka" || activeRow === "ta" || activeRow === "ha") && (
              <motion.div
                initial={{ scale: 0, opacity: 0, rotate: 0 }}
                animate={{ scale: 2, opacity: [0, 0.8, 0], rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full"
                style={{
                  background: `conic-gradient(from 0deg, transparent 0%, ${getRowColor(activeRow)} 50%, transparent 100%)`,
                  filter: "blur(10px)",
                }}
              />
            )}

            {/* サ行・ナ行・マ行・ラ行：左旋の光が沈む */}
            {(activeRow === "sa" || activeRow === "na" || activeRow === "ma" || activeRow === "ra") && (
              <motion.div
                initial={{ x: "100%", opacity: 0, rotate: 0 }}
                animate={{ x: "-100%", opacity: [0, 1, 0], rotate: -360 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute top-1/2 right-0 w-full h-2"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${getRowColor(activeRow)} 50%, transparent 100%)`,
                  boxShadow: `0 0 20px ${getRowColor(activeRow)}`,
                  filter: "blur(3px)",
                }}
              />
            )}

            {/* ヤ行：霊核が一瞬白く点滅 */}
            {activeRow === "ya" && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [0.8, 1.5, 0.8], opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${getRowColor("ya")} 0%, transparent 70%)`,
                  boxShadow: `0 0 40px ${getRowColor("ya")}`,
                  filter: "blur(5px)",
                }}
              />
            )}

            {/* ワ行：外側リングが脈動 */}
            {activeRow === "wa" && (
              <motion.div
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: [1, 1.3, 1], opacity: [0, 0.8, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full"
                style={{
                  border: `3px solid ${getRowColor("wa")}`,
                  boxShadow: `0 0 30px ${getRowColor("wa")}, inset 0 0 30px ${getRowColor("wa")}`,
                  filter: "blur(2px)",
                }}
              />
            )}

            {/* 粒子エフェクト */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`particle-${i}`}
                initial={{
                  x: "50%",
                  y: "50%",
                  scale: 0,
                  opacity: 0,
                }}
                animate={{
                  x: `${50 + Math.cos((i * Math.PI * 2) / 8) * 40}%`,
                  y: `${50 + Math.sin((i * Math.PI * 2) / 8) * 40}%`,
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.8,
                  ease: "easeOut",
                  delay: i * 0.05,
                }}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: getRowColor(activeRow),
                  boxShadow: `0 0 10px ${getRowColor(activeRow)}`,
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
