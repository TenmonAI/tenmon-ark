// TENMON-ARK motion tokens
// すべてのアニメーションはこの値に従う。画面側でのハードコードは禁止。

export const MOTION = {
  dur: {
    ripple: 900,
    glyphBreath: 1400,
    typingTick: 40,
    cardToggle: 180,
    modalIn: 220,
    modalOut: 180,
    toast: 1200,
    scrollHintFade: 250,
  },
  ease: {
    standard: [0.2, 0.0, 0.2, 1.0] as [number, number, number, number],
    emphasized: [0.2, 0.0, 0.0, 1.0] as [number, number, number, number],
    linear: [0.0, 0.0, 1.0, 1.0] as [number, number, number, number],
  },
  typing: {
    // 1 文字あたりの最小/最大ディレイ（ms）
    chunkMin: 18,
    chunkMax: 55,
    // レスポンス全体が短い場合に自動ブーストするしきい値
    boostThresholdChars: 400,
    boostFactor: 0.6,
  },
  scroll: {
    // 「一番下にいる」とみなすオフセット（px）
    atBottomThreshold: 96,
    // Jump to bottom 時間（ms）
    jumpDuration: 220,
  },
  press: {
    scaleMin: 0.96,
    opacityMin: 0.7,
  },
} as const;

