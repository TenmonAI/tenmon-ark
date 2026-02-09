import React from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { subscribeToast, ToastEvent } from "../lib/ui/toastBus";
import { MOTION } from "../lib/ui/motion";
import { tokens } from "../lib/ui/theme";

export function Toast() {
  const [event, setEvent] = React.useState<ToastEvent | null>(null);
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const unsubscribe = subscribeToast((e) => {
      if (!e) {
        setEvent(null);
        return;
      }
      setEvent(e);
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: MOTION.dur.toast,
          useNativeDriver: true,
        }).start();
      });
    });
    return () => {
      unsubscribe();
    };
  }, [opacity]);

  if (!event) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.toast}>
        <Text style={styles.text}>{event.message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: tokens.spacing.lg * 2,
    alignSelf: "center",
    zIndex: 100,
  },
  toast: {
    borderRadius: tokens.radii.lg,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.colors.dark.toastBg,
    borderWidth: 1,
    borderColor: tokens.colors.dark.borderMuted,
  },
  text: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.dark.textPrimary,
  },
});

