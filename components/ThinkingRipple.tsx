import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { MOTION } from "../lib/ui/motion";
import { tokens } from "../lib/ui/theme";

type Props = {
  size?: number;
};

export function ThinkingRipple({ size = 80 }: Props) {
  const baseSize = size;
  const waves = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const createLoop = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: MOTION.dur.ripple,
            easing: Easing.bezier(...MOTION.ease.emphasized),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const loops = waves.map((v, i) => createLoop(v, (MOTION.dur.ripple / 3) * i));
    loops.forEach((l) => l.start());
    return () => {
      loops.forEach((l) => l.stop());
    };
  }, [waves]);

  return (
    <View style={[styles.container, { width: baseSize, height: baseSize }]}>
      {waves.map((value, idx) => {
        const scale = value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1.3],
        });
        const opacity = value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.1, 0],
        });
        return (
          <Animated.View
            key={idx}
            pointerEvents="none"
            style={[
              styles.ripple,
              {
                borderRadius: baseSize,
                transform: [{ scale }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  ripple: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderWidth: 1,
    borderColor: tokens.colors.dark.ripple,
    backgroundColor: "transparent",
  },
});

