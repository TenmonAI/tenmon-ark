import React, { useEffect, useRef } from "react";
import { Animated, Easing, View, AccessibilityProps, StyleSheet } from "react-native";
import { MOTION } from "../lib/ui/motion";
import { tokens } from "../lib/ui/theme";

type Props = AccessibilityProps & {
  size?: number;
};

export function LoadingGlyph({ size = 24, accessibilityLabel, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.08,
            duration: MOTION.dur.glyphBreath / 2,
            easing: Easing.bezier(...MOTION.ease.standard),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: MOTION.dur.glyphBreath / 2,
            easing: Easing.bezier(...MOTION.ease.standard),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: MOTION.dur.glyphBreath / 2,
            easing: Easing.bezier(...MOTION.ease.standard),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.8,
            duration: MOTION.dur.glyphBreath / 2,
            easing: Easing.bezier(...MOTION.ease.standard),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    anim.start();
    return () => {
      anim.stop();
    };
  }, [scale, opacity]);

  const sizePx = size;

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? "Loading"}
      {...rest}
      style={[
        styles.container,
        {
          width: sizePx,
          height: sizePx,
          borderRadius: sizePx / 2,
          transform: [{ scale }],
          opacity,
        },
      ]}
    >
      <View style={styles.inner} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.dark.accentSoft,
    backgroundColor: "transparent",
  },
  inner: {
    width: "55%",
    height: "55%",
    borderRadius: 999,
    backgroundColor: tokens.colors.dark.accent,
  },
});

