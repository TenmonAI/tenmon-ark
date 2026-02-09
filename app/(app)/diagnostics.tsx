import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Pressable,
} from "react-native";
import { countThreads, countMessages, countArtifacts, prefsGet, prefsSet } from "../../lib/db/repo";
import { API_BASE_URL } from "../../constants/env";
import { tokens } from "../../lib/ui/theme";
import { MC } from "../../lib/ui/microcopy";
import { showToast } from "../../lib/ui/toastBus";

type Stats = {
  threads: number;
  messages: number;
  artifacts: number;
};

type HealthStatus = {
  status: "ok" | "error" | "loading";
  text: string;
};

type AuditStatus = {
  status: "ok" | "error" | "loading";
  text: string;
};

export default function DiagnosticsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    status: "loading",
    text: "",
  });
  const [auditStatus, setAuditStatus] = useState<AuditStatus>({
    status: "loading",
    text: "",
  });
  const [apiUrlInput, setApiUrlInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const [threads, messages, artifacts, overrideUrl] = await Promise.all([
          countThreads(),
          countMessages(),
          countArtifacts(),
          prefsGet("api_base_url_override"),
        ]);
        if (!cancelled) {
          setStats({ threads, messages, artifacts });
          setApiUrlInput(overrideUrl || "");
        }
      } catch (e) {
        console.warn("[Diagnostics] failed to load stats", e);
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

  useEffect(() => {
    let cancelled = false;
    const checkHealth = async () => {
      try {
        setHealthStatus({ status: "loading", text: "" });
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const url = `${API_BASE_URL.replace(/\/$/, "")}/health`;
        const res = await fetch(url, {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (cancelled) return;
        const text = await res.text();
        if (res.ok) {
          setHealthStatus({ status: "ok", text: text.substring(0, 200) });
        } else {
          setHealthStatus({ status: "error", text: `HTTP ${res.status}: ${text.substring(0, 200)}` });
        }
      } catch (e: any) {
        if (cancelled) return;
        setHealthStatus({
          status: "error",
          text: e?.message || "Failed to fetch /health",
        });
      }
    };
    void checkHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const checkAudit = async () => {
      try {
        setAuditStatus({ status: "loading", text: "" });
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const url = `${API_BASE_URL.replace(/\/$/, "")}/api/audit`;
        const res = await fetch(url, {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (cancelled) return;
        const text = await res.text();
        if (res.ok) {
          setAuditStatus({ status: "ok", text: text.substring(0, 200) });
        } else {
          setAuditStatus({ status: "error", text: `HTTP ${res.status}: ${text.substring(0, 200)}` });
        }
      } catch (e: any) {
        if (cancelled) return;
        setAuditStatus({
          status: "error",
          text: e?.message || "Failed to fetch /api/audit",
        });
      }
    };
    void checkAudit();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveUrl = async () => {
    try {
      setSaving(true);
      await prefsSet("api_base_url_override", apiUrlInput.trim());
      showToast("API URL saved", "success");
    } catch (e) {
      console.warn("[Diagnostics] failed to save URL", e);
      showToast("Failed to save API URL", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Diagnostics</Text>

      <Text style={styles.sectionTitle}>API Base URL</Text>
      <View style={styles.card}>
        <Text style={styles.monoText}>{API_BASE_URL}</Text>
      </View>

      <Text style={styles.sectionTitle}>API URL Override</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          value={apiUrlInput}
          onChangeText={setApiUrlInput}
          placeholder="http://127.0.0.1:3000"
          placeholderTextColor={tokens.colors.dark.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          onPress={handleSaveUrl}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && { opacity: tokens.interaction.opacityPressed },
            saving && { opacity: tokens.interaction.opacityDisabled },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Save API URL"
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>/health</Text>
      <View style={styles.card}>
        {healthStatus.status === "loading" ? (
          <ActivityIndicator />
        ) : (
          <Text
            style={[
              styles.statusText,
              healthStatus.status === "ok" ? styles.statusOk : styles.statusError,
            ]}
          >
            {healthStatus.status === "ok" ? "✓ " : "✗ "}
            {healthStatus.text || "(empty)"}
          </Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>/api/audit</Text>
      <View style={styles.card}>
        {auditStatus.status === "loading" ? (
          <ActivityIndicator />
        ) : (
          <Text
            style={[
              styles.statusText,
              auditStatus.status === "ok" ? styles.statusOk : styles.statusError,
            ]}
          >
            {auditStatus.status === "ok" ? "✓ " : "✗ "}
            {auditStatus.text || "(empty)"}
          </Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Local DB Statistics</Text>
      {loading || !stats ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Threads</Text>
            <Text style={styles.statValue}>{stats.threads}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Messages</Text>
            <Text style={styles.statValue}>{stats.messages}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Artifacts</Text>
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
    marginBottom: tokens.spacing.md,
  },
  sectionTitle: {
    fontSize: tokens.typography.size.md,
    fontWeight: tokens.typography.weight.medium as any,
    color: tokens.colors.dark.textPrimary,
    marginTop: tokens.spacing.md,
    marginBottom: tokens.spacing.xs,
  },
  card: {
    marginTop: tokens.spacing.sm,
    borderRadius: tokens.radii.md,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.dark.surfaceMuted,
    borderWidth: 1,
    borderColor: tokens.colors.dark.border,
  },
  monoText: {
    fontSize: tokens.typography.size.sm,
    fontFamily: "monospace",
    color: tokens.colors.dark.textPrimary,
  },
  input: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.dark.textPrimary,
    backgroundColor: tokens.colors.dark.background,
    borderRadius: tokens.radii.sm,
    padding: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.dark.border,
    marginBottom: tokens.spacing.sm,
  },
  saveButton: {
    alignSelf: "flex-start",
    borderRadius: tokens.radii.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    backgroundColor: tokens.colors.dark.accent,
  },
  saveButtonText: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.dark.textPrimary,
    fontWeight: tokens.typography.weight.medium as any,
  },
  statusText: {
    fontSize: tokens.typography.size.sm,
    fontFamily: "monospace",
  },
  statusOk: {
    color: tokens.colors.dark.textPrimary,
  },
  statusError: {
    color: "#ff6b6b",
  },
  loadingRow: {
    marginTop: tokens.spacing.sm,
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
