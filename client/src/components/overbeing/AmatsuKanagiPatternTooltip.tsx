import { motion } from 'framer-motion';

interface Pattern {
  number: number;
  sound: string;
  category: string;
  type?: string;
  pattern: string;
  movements?: string[];
  meaning?: string;
  special: boolean;
}

/**
 * 天津金木パターン詳細表示ツールチップ
 * 
 * マウスホバー時に天津金木パターンの詳細情報を表示する。
 */
export function AmatsuKanagiPatternTooltip({ pattern }: { pattern: Pattern }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute z-50 p-4 bg-black/90 border-2 border-yellow-500 rounded-lg shadow-xl max-w-xs"
      style={{
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: '8px',
      }}
    >
      <div className="space-y-2">
        <div className="text-lg font-bold text-yellow-400">
          パターン #{pattern.number}: {pattern.sound}
        </div>
        <div className="text-sm text-gray-300">
          <div>カテゴリ: {pattern.category}</div>
          {pattern.type && <div>種類: {pattern.type}</div>}
          <div>パターン: {pattern.pattern}</div>
          {pattern.movements && (
            <div className="mt-2">
              <div className="font-semibold">動作:</div>
              <ul className="list-disc list-inside">
                {pattern.movements.map((movement, idx) => (
                  <li key={idx}>{movement}</li>
                ))}
              </ul>
            </div>
          )}
          {pattern.meaning && (
            <div className="mt-2 text-cyan-400">
              {pattern.meaning}
            </div>
          )}
          {pattern.special && (
            <div className="mt-2 text-purple-400 font-semibold">
              ⭐ 特殊パターン（中心霊）
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

