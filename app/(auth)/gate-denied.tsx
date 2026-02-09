import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function GateDeniedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Access denied</Text>
      <Text style={styles.subtitle}>
        Founder Gate is not satisfied. This screen is a placeholder.
      </Text>
      <Link href="/(auth)/sign-in" asChild>
        <Button title="Back to sign-in" onPress={() => {}} />
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
});

