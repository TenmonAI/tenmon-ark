/**
 * User-Sync Evolution: 誤タップ傾向学習
 * - タップミス領域を記録
 * - 自動的に当たり判定を拡大
 */

interface TapEvent {
  x: number;
  y: number;
  targetId: string;
  timestamp: number;
  isMiss: boolean;
}

interface TapHeatmap {
  [targetId: string]: {
    hits: { x: number; y: number }[];
    misses: { x: number; y: number }[];
    expandedHitbox: { top: number; right: number; bottom: number; left: number };
  };
}

const TAP_HISTORY_KEY = 'ark_tap_history';
const TAP_HEATMAP_KEY = 'ark_tap_heatmap';
const MAX_HISTORY_SIZE = 1000;
const MISS_THRESHOLD = 50; // px

/**
 * タップイベントを記録
 */
export function recordTap(event: {
  x: number;
  y: number;
  targetId: string;
  isMiss: boolean;
}): void {
  const history = getTapHistory();
  const tapEvent: TapEvent = {
    ...event,
    timestamp: Date.now(),
  };

  history.push(tapEvent);

  // 履歴サイズ制限
  if (history.length > MAX_HISTORY_SIZE) {
    history.shift();
  }

  localStorage.setItem(TAP_HISTORY_KEY, JSON.stringify(history));

  // ヒートマップ更新
  updateTapHeatmap(tapEvent);
}

/**
 * タップ履歴を取得
 */
export function getTapHistory(): TapEvent[] {
  const stored = localStorage.getItem(TAP_HISTORY_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * タップヒートマップを取得
 */
export function getTapHeatmap(): TapHeatmap {
  const stored = localStorage.getItem(TAP_HEATMAP_KEY);
  return stored ? JSON.parse(stored) : {};
}

/**
 * タップヒートマップを更新
 */
function updateTapHeatmap(tapEvent: TapEvent): void {
  const heatmap = getTapHeatmap();

  if (!heatmap[tapEvent.targetId]) {
    heatmap[tapEvent.targetId] = {
      hits: [],
      misses: [],
      expandedHitbox: { top: 0, right: 0, bottom: 0, left: 0 },
    };
  }

  const target = heatmap[tapEvent.targetId];

  if (tapEvent.isMiss) {
    target.misses.push({ x: tapEvent.x, y: tapEvent.y });
  } else {
    target.hits.push({ x: tapEvent.x, y: tapEvent.y });
  }

  // ミス領域から当たり判定拡大を計算
  if (target.misses.length >= 5) {
    const expansion = calculateHitboxExpansion(target.hits, target.misses);
    target.expandedHitbox = expansion;
  }

  localStorage.setItem(TAP_HEATMAP_KEY, JSON.stringify(heatmap));
}

/**
 * 当たり判定拡大を計算
 */
function calculateHitboxExpansion(
  hits: { x: number; y: number }[],
  misses: { x: number; y: number }[]
): { top: number; right: number; bottom: number; left: number } {
  if (hits.length === 0) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  // ヒット領域の中心を計算
  const centerX = hits.reduce((sum, h) => sum + h.x, 0) / hits.length;
  const centerY = hits.reduce((sum, h) => sum + h.y, 0) / hits.length;

  // ミス領域からの拡大量を計算
  const expansion = { top: 0, right: 0, bottom: 0, left: 0 };

  misses.forEach((miss) => {
    const dx = miss.x - centerX;
    const dy = miss.y - centerY;

    if (dy < 0 && Math.abs(dy) > expansion.top) {
      expansion.top = Math.min(Math.abs(dy), MISS_THRESHOLD);
    }
    if (dx > 0 && dx > expansion.right) {
      expansion.right = Math.min(dx, MISS_THRESHOLD);
    }
    if (dy > 0 && dy > expansion.bottom) {
      expansion.bottom = Math.min(dy, MISS_THRESHOLD);
    }
    if (dx < 0 && Math.abs(dx) > expansion.left) {
      expansion.left = Math.min(Math.abs(dx), MISS_THRESHOLD);
    }
  });

  return expansion;
}

/**
 * 要素に拡大された当たり判定を適用
 */
export function applyExpandedHitbox(targetId: string, element: HTMLElement): void {
  const heatmap = getTapHeatmap();
  const target = heatmap[targetId];

  if (!target || !target.expandedHitbox) return;

  const { top, right, bottom, left } = target.expandedHitbox;

  // CSSで当たり判定を拡大（padding追加）
  element.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
  element.style.margin = `-${top}px -${right}px -${bottom}px -${left}px`;
}

/**
 * タップ履歴をクリア
 */
export function clearTapHistory(): void {
  localStorage.removeItem(TAP_HISTORY_KEY);
  localStorage.removeItem(TAP_HEATMAP_KEY);
}

/**
 * 誤タップ率を計算
 */
export function calculateMissRate(targetId?: string): number {
  const history = getTapHistory();

  if (history.length === 0) return 0;

  const filtered = targetId
    ? history.filter((e) => e.targetId === targetId)
    : history;

  if (filtered.length === 0) return 0;

  const missCount = filtered.filter((e) => e.isMiss).length;
  return (missCount / filtered.length) * 100;
}
