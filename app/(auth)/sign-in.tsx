import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function SignInScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>TENMON-ARK Mobile</Text>
      <Text style={styles.subtitle}>Sign in (placeholder)</Text>
      {/* 実際の Auth 実装は PROMPT-05 以降で行う */}
      <Link href="/(app)/chats" asChild>
        <Button title="Continue (temp)" onPress={() => {}} />
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
});

