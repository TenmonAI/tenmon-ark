import React from "react";
import { View, Text, Pressable, Animated, StyleSheet } from "react-native";
import { MOTION } from "../lib/ui/motion";
import { tokens } from "../lib/ui/theme";
import { MC } from "../lib/ui/microcopy";

type Props = {
  visible: boolean;
  onPress: () => void;
};

export function JumpToBottomButton({ visible, onPress }: Props) {
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: MOTION.dur.scrollHintFade,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={MC.chat.jumpToBottom}
        hitSlop={tokens.interaction.hitSlopLarge}
        style={({ pressed }) => [
          styles.button,
          pressed && { opacity: tokens.interaction.opacityPressed },
        ]}
      >
        <Text style={styles.text}>{MC.chat.jumpToBottom}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: tokens.spacing.md,
    bottom: tokens.spacing.lg * 2,
    zIndex: 10,
  },
  button: {
    borderRadius: tokens.radii.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    backgroundColor: tokens.colors.dark.toastBg,
    borderWidth: 1,
    borderColor: tokens.colors.dark.borderMuted,
  },
  text: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.dark.textPrimary,
  },
});

