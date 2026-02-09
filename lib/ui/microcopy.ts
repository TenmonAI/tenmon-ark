// TENMON-ARK Mobile microcopy dictionary
// すべての文言はここから参照し、画面ファイルには直書きしない。

export const MC = {
  appName: "TENMON-ARK",

  chats: {
    title: "Chats",
    newChat: "New chat",
    emptyStateTitle: "No conversations yet",
    emptyStateBody: "Start a new chat to awaken TENMON-ARK.",
  },

  chat: {
    composingPlaceholder: "Ask anything into the虚空蔵…",
    sending: "Sending…",
    retry: "Retry",
    stopTyping: "Stop",
    thinking: "Thinking in the ark…",
    newMessagesBanner: (n: number) =>
      n === 1 ? "1 new message" : `${n} new messages`,
    jumpToBottom: "Jump to latest",
  },

  artifacts: {
    evidenceTitle: "Evidence",
    candidatesTitle: "Related pages",
    diveIn: "Dive in",
    copyQuote: "Copy quote",
    openPage: "Open page",
  },

  toast: {
    copied: "Copied to clipboard",
    networkError: "Network error. Please try again.",
    parseError: "Unexpected response. Please retry.",
  },

  auth: {
    signInTitle: "Sign in to TENMON-ARK",
    signInButton: "Sign in",
    gateDeniedTitle: "Founder access required",
    gateDeniedBody:
      "This build is limited to TENMON-ARK founders. Please check your account claims.",
    signOut: "Sign out",
  },

  settings: {
    title: "Settings",
    exportTitle: "Export conversations",
    exportDescription: "Export local data as JSONL.",
    deleteTitle: "Delete local data",
    deleteDescription:
      "Delete all local threads, messages, and artifacts from this device.",
    deleteConfirm: "This cannot be undone. Delete now?",
    typingSpeedTitle: "Typing speed",
    typingSpeedNormal: "Normal",
    typingSpeedFast: "Fast",
    motionReduceTitle: "Reduce motion",
  },

  dashboard: {
    title: "Dashboard",
    founderBadge: "Founder",
    threadsLabel: "Threads",
    messagesLabel: "Messages",
    artifactsLabel: "Artifacts",
    dbStatusLabel: "Local DB status",
    appVersionLabel: "App version",
  },
} as const;

export function newMessagesCountLabel(n: number): string {
  return MC.chat.newMessagesBanner(n);
}

