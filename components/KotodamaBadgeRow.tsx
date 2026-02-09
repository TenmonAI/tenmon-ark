import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { tokens } from "../lib/ui/theme";

type Props = {
  tags?: string[];
  onPressTag?: (tag: string) => void;
};

export function KotodamaBadgeRow({ tags, onPressTag }: Props) {
  if (!tags || tags.length === 0) return null;

  const visible = tags.slice(0, 3);
  const extraCount = tags.length - visible.length;

  return (
    <View style={styles.row}>
      {visible.map((tag) => (
        <Pressable
          key={tag}
          onPress={() => onPressTag?.(tag)}
          hitSlop={tokens.interaction.hitSlopLarge}
          style={({ pressed }) => [
            styles.badge,
            pressed && { opacity: tokens.interaction.opacityPressed },
          ]}
        >
          <Text style={styles.badgeText}>{tag}</Text>
        </Pressable>
      ))}
      {extraCount > 0 && (
        <View style={[styles.badge, styles.badgeExtra]}>
          <Text style={styles.badgeText}>+{extraCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs,
    marginTop: tokens.spacing.xs,
  },
  badge: {
    borderRadius: tokens.radii.pill,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    backgroundColor: tokens.colors.dark.badgeBg,
    borderWidth: 1,
    borderColor: tokens.colors.dark.badgeBorder,
  },
  badgeExtra: {
    opacity: 0.8,
  },
  badgeText: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.dark.textSecondary,
  },
});

