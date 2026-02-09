import React from "react";
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
} from "react-native";
import * as Haptics from "expo-haptics";
import { componentStyles, tokens } from "../lib/ui/theme";
import { MC } from "../lib/ui/microcopy";

type Props = {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isSending?: boolean;
  onStopTyping?: () => void;
};

const MIN_HEIGHT = 40;
const MAX_HEIGHT = MIN_HEIGHT + tokens.spacing.lg * 5;

export function ComposerBar({
  value,
  onChange,
  onSend,
  disabled,
  isSending,
  onStopTyping,
}: Props) {
  const [inputHeight, setInputHeight] = React.useState<number>(MIN_HEIGHT);

  const canSend =
    !disabled && !isSending && value.trim().length > 0;

  const handleContentSizeChange = (
    e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>
  ) => {
    const h = e.nativeEvent.contentSize.height;
    const clamped = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, h));
    setInputHeight(clamped);
  };

  const handleSend = () => {
    if (!canSend) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend();
  };

  return (
    <View style={componentStyles.composerBar.container}>
      <View style={styles.row}>
        <TextInput
          multiline
          value={value}
          onChangeText={onChange}
          placeholder={MC.chat.composingPlaceholder}
          placeholderTextColor={tokens.colors.dark.textMuted}
          style={[
            componentStyles.composerBar.input,
            { height: inputHeight },
          ]}
          onContentSizeChange={handleContentSizeChange}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSending ? MC.chat.sending : "Send message"}
          onPress={handleSend}
          disabled={!canSend}
          hitSlop={tokens.interaction.hitSlop}
          style={({ pressed }) => [
            componentStyles.composerBar.sendButton,
            (!canSend || disabled) && {
              opacity: tokens.interaction.opacityDisabled,
            },
            pressed && canSend && { opacity: tokens.interaction.opacityPressed },
          ]}
        >
          <Text
            style={{
              fontSize: tokens.typography.size.sm,
              color: tokens.colors.dark.textPrimary,
            }}
          >
            {isSending ? MC.chat.sending : "Send"}
          </Text>
        </Pressable>
      </View>
      {isSending && onStopTyping && (
        <View style={styles.stopRow}>
          <Pressable
            onPress={onStopTyping}
            hitSlop={tokens.interaction.hitSlop}
          >
            <Text
              style={{
                fontSize: tokens.typography.size.xs,
                color: tokens.colors.dark.textMuted,
              }}
            >
              {MC.chat.stopTyping}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  stopRow: {
    marginTop: tokens.spacing.xs,
    alignItems: "flex-start",
  },
});

