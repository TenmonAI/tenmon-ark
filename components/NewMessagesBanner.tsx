import React from "react";
import { View, Text, Pressable, Animated, StyleSheet } from "react-native";
import { MOTION } from "../lib/ui/motion";
import { tokens } from "../lib/ui/theme";
import { newMessagesCountLabel } from "../lib/ui/microcopy";

type Props = {
  count: number;
  onPress: () => void;
};

export function NewMessagesBanner({ count, onPress }: Props) {
  if (count <= 0) return null;

  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: MOTION.dur.scrollHintFade,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && { opacity: tokens.interaction.opacityPressed },
        ]}
        accessibilityRole="button"
        accessibilityLabel={newMessagesCountLabel(count)}
        hitSlop={tokens.interaction.hitSlopLarge}
        onPress={onPress}
      >
        <Text style={styles.text}>{newMessagesCountLabel(count)}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: tokens.spacing.md,
    alignSelf: "center",
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

