import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { componentStyles, markdownStyles, tokens } from "../lib/ui/theme";
import { MC } from "../lib/ui/microcopy";
import { showToast } from "../lib/ui/toastBus";

type Props = {
  role: "user" | "assistant";
  text: string;
};

export function ChatBubble({ role, text }: Props) {
  const isUser = role === "user";

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(text);
      void Haptics.selectionAsync();
      showToast(MC.toast.copied, "success");
    } catch {
      showToast(MC.toast.networkError, "error");
    }
  };

  const bubbleStyle = isUser
    ? componentStyles.chatBubble.user
    : componentStyles.chatBubble.assistant;

  return (
    <View
      style={[
        styles.row,
        { justifyContent: isUser ? "flex-end" : "flex-start" },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chat message. Long press to copy."
        onLongPress={handleCopy}
        hitSlop={tokens.interaction.hitSlop}
        style={({ pressed }) => [
          bubbleStyle,
          pressed && { opacity: tokens.interaction.opacityPressed },
        ]}
      >
        <Markdown
          style={markdownStyles as any}
          mergeStyle
        >
          {text}
        </Markdown>
        <View style={styles.copyRow}>
          <Pressable
            onPress={handleCopy}
            accessibilityRole="button"
            accessibilityLabel={MC.toast.copied}
            hitSlop={tokens.interaction.hitSlop}
          >
            <Text style={styles.copyText}>Copy</Text>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
  },
  copyRow: {
    marginTop: tokens.spacing.xs,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  copyText: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.dark.textMuted,
  },
});

