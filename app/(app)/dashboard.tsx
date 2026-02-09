import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { countThreads, countMessages, countArtifacts } from "../lib/db/repo";
import { tokens } from "../lib/ui/theme";
import { MC } from "../lib/ui/microcopy";
import { showToast } from "../lib/ui/toastBus";

type Stats = {
  threads: number;
  messages: number;
  artifacts: number;
};

export default function DashboardScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const [threads, messages, artifacts] = await Promise.all([
          countThreads(),
          countMessages(),
          countArtifacts(),
        ]);
        if (!cancelled) {
          setStats({ threads, messages, artifacts });
        }
      } catch (e) {
        console.warn("[Dashboard] failed to load stats", e);
        showToast("Failed to load local DB stats", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{MC.dashboard?.title ?? "Dashboard"}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{MC.dashboard?.founderBadge ?? "Founder"}</Text>
      </View>

      <Text style={styles.sectionTitle}>Local-first</Text>
      <Text style={styles.sectionBody}>
        All conversations stay on this device in a local SQLite database. Export and deletion are fully under your control.
      </Text>

      <Text style={styles.sectionTitle}>{MC.dashboard?.dbStatusLabel ?? "Local DB status"}</Text>
      {loading || !stats ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
        </View>
      ) : (
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{MC.dashboard?.threadsLabel ?? "Threads"}</Text>
            <Text style={styles.statValue}>{stats.threads}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{MC.dashboard?.messagesLabel ?? "Messages"}</Text>
            <Text style={styles.statValue}>{stats.messages}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{MC.dashboard?.artifactsLabel ?? "Artifacts"}</Text>
            <Text style={styles.statValue}>{stats.artifacts}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: tokens.spacing.lg,
    backgroundColor: tokens.colors.dark.background,
  },
  title: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.semibold as any,
    color: tokens.colors.dark.textPrimary,
    marginBottom: tokens.spacing.sm,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: tokens.radii.pill,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    backgroundColor: tokens.colors.dark.badgeBg,
    borderWidth: 1,
    borderColor: tokens.colors.dark.badgeBorder,
    marginBottom: tokens.spacing.lg,
  },
  badgeText: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.dark.textSecondary,
  },
  sectionTitle: {
    fontSize: tokens.typography.size.md,
    fontWeight: tokens.typography.weight.medium as any,
    color: tokens.colors.dark.textPrimary,
    marginTop: tokens.spacing.md,
    marginBottom: tokens.spacing.xs,
  },
  sectionBody: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.dark.textSecondary,
  },
  loadingRow: {
    marginTop: tokens.spacing.md,
  },
  statsCard: {
    marginTop: tokens.spacing.sm,
    borderRadius: tokens.radii.md,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.dark.surfaceMuted,
    borderWidth: 1,
    borderColor: tokens.colors.dark.border,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  statLabel: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.dark.textSecondary,
  },
  statValue: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.dark.textPrimary,
  },
});


