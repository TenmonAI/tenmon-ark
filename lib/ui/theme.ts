// TENMON-ARK UI Tokens Spec v1 (single source of truth)
// 数値・色・タイポグラフィはこのファイルのみで定義し、他所での直書きは禁止。

export const tokens = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    "2xl": 32,
  },
  radii: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
  },
  typography: {
    family: {
      default: "System",
      mono: "Menlo",
    },
    size: {
      xs: 11,
      sm: 13,
      md: 15,
      lg: 17,
      xl: 20,
      "2xl": 24,
    },
    lineHeight: {
      tight: 1.1,
      normal: 1.4,
      relaxed: 1.6,
    },
    weight: {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
  },
  colors: {
    light: {
      background: "#050814",
      surface: "#0B1020",
      surfaceMuted: "#111729",
      border: "#1F2937",
      borderMuted: "#111827",
      accent: "#38BDF8",
      accentSoft: "rgba(56, 189, 248, 0.12)",
      accentStrong: "#0EA5E9",
      negative: "#F97373",
      textPrimary: "#E5E7EB",
      textSecondary: "#9CA3AF",
      textMuted: "#6B7280",
      badgeBg: "rgba(15, 23, 42, 0.9)",
      badgeBorder: "rgba(148, 163, 184, 0.5)",
      bubbleUser: "#1E293B",
      bubbleAssistant: "#020617",
      codeBg: "#020617",
      divider: "rgba(148, 163, 184, 0.24)",
      ripple: "rgba(56, 189, 248, 0.12)",
      toastBg: "rgba(15, 23, 42, 0.98)",
    },
    dark: {
      background: "#020617",
      surface: "#020617",
      surfaceMuted: "#020617",
      border: "#1F2937",
      borderMuted: "#111827",
      accent: "#38BDF8",
      accentSoft: "rgba(56, 189, 248, 0.12)",
      accentStrong: "#0EA5E9",
      negative: "#F97373",
      textPrimary: "#E5E7EB",
      textSecondary: "#9CA3AF",
      textMuted: "#6B7280",
      badgeBg: "rgba(15, 23, 42, 0.9)",
      badgeBorder: "rgba(148, 163, 184, 0.5)",
      bubbleUser: "#1E293B",
      bubbleAssistant: "#020617",
      codeBg: "#020617",
      divider: "rgba(148, 163, 184, 0.24)",
      ripple: "rgba(56, 189, 248, 0.12)",
      toastBg: "rgba(15, 23, 42, 0.98)",
    },
  },
  shadows: {
    ios: {
      card: {
        shadowColor: "#000",
        shadowOpacity: 0.28,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
    },
    android: {
      cardElevation: 5,
    },
  },
  interaction: {
    hitSlop: 10,
    hitSlopLarge: 16,
    opacityDisabled: 0.4,
    opacityPressed: 0.7,
  },
} as const;

// react-native-markdown-display 用スタイル
// 実際のコンポーネント側では、ここを唯一の参照元とする。
export const markdownStyles = {
  body: {
    color: tokens.colors.dark.textPrimary,
    fontSize: tokens.typography.size.md,
    lineHeight: tokens.typography.size.md * tokens.typography.lineHeight.relaxed,
  },
  heading1: {
    color: tokens.colors.dark.textPrimary,
    fontSize: tokens.typography.size["2xl"],
    fontWeight: tokens.typography.weight.semibold as any,
    marginBottom: tokens.spacing.sm,
  },
  heading2: {
    color: tokens.colors.dark.textPrimary,
    fontSize: tokens.typography.size.xl,
    fontWeight: tokens.typography.weight.semibold as any,
    marginBottom: tokens.spacing.xs,
  },
  heading3: {
    color: tokens.colors.dark.textPrimary,
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.medium as any,
  },
  paragraph: {
    marginTop: tokens.spacing.xs,
    marginBottom: tokens.spacing.xs,
  },
  bullet_list: {
    marginTop: tokens.spacing.xs,
    marginBottom: tokens.spacing.xs,
  },
  list_item: {
    flexDirection: "row",
    marginBottom: tokens.spacing.xs,
  },
  code_inline: {
    backgroundColor: tokens.colors.dark.codeBg,
    borderRadius: tokens.radii.sm,
    paddingHorizontal: tokens.spacing.xs,
    paddingVertical: 2,
    fontFamily: tokens.typography.family.mono,
    fontSize: tokens.typography.size.sm,
  },
  code_block: {
    backgroundColor: tokens.colors.dark.codeBg,
    borderRadius: tokens.radii.md,
    padding: tokens.spacing.md,
    fontFamily: tokens.typography.family.mono,
    fontSize: tokens.typography.size.sm,
  },
  link: {
    color: tokens.colors.dark.accentStrong,
    textDecorationLine: "underline",
  },
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: tokens.colors.dark.border,
    paddingLeft: tokens.spacing.md,
    marginVertical: tokens.spacing.sm,
  },
} as const;

// コンポーネント共通スタイル
// ChatBubble / ArtifactCard / ComposerBar はこの定義に従う。
export const componentStyles = {
  chatBubble: {
    assistant: {
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.sm,
      borderRadius: tokens.radii.lg,
      backgroundColor: tokens.colors.dark.bubbleAssistant,
      maxWidth: "94%",
    },
    user: {
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.sm,
      borderRadius: tokens.radii.lg,
      backgroundColor: tokens.colors.dark.bubbleUser,
      maxWidth: "94%",
      alignSelf: "flex-end" as const,
    },
    timestamp: {
      marginTop: tokens.spacing.xs,
      fontSize: tokens.typography.size.xs,
      color: tokens.colors.dark.textMuted,
    },
  },
  artifactCard: {
    container: {
      borderRadius: tokens.radii.md,
      padding: tokens.spacing.md,
      backgroundColor: tokens.colors.dark.surfaceMuted,
      borderWidth: 1,
      borderColor: tokens.colors.dark.borderMuted,
      marginVertical: tokens.spacing.xs,
    },
    headerRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: tokens.spacing.xs,
    },
    title: {
      fontSize: tokens.typography.size.sm,
      fontWeight: tokens.typography.weight.medium as any,
      color: tokens.colors.dark.textSecondary,
    },
    footerRow: {
      flexDirection: "row" as const,
      justifyContent: "flex-end" as const,
      gap: tokens.spacing.sm,
      marginTop: tokens.spacing.sm,
    },
  },
  composerBar: {
    container: {
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: tokens.colors.dark.border,
      backgroundColor: tokens.colors.dark.surface,
    },
    input: {
      borderRadius: tokens.radii.lg,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
      minHeight: 40,
      maxHeight: 40 + tokens.spacing.lg * 4,
      backgroundColor: tokens.colors.dark.surfaceMuted,
      color: tokens.colors.dark.textPrimary,
      fontSize: tokens.typography.size.md,
    },
    sendButton: {
      marginLeft: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
      borderRadius: tokens.radii.pill,
      backgroundColor: tokens.colors.dark.accent,
    },
  },
} as const;

