import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  listThreads,
  listAllMessages,
  listAllArtifacts,
  deleteAllLocalData,
  prefsGet,
  prefsSet,
} from "../lib/db/repo";
import { tokens } from "../lib/ui/theme";
import { MC } from "../lib/ui/microcopy";
import { showToast } from "../lib/ui/toastBus";

type TypingSpeed = "normal" | "fast";

const TYPING_SPEED_KEY = "typing_speed";

export default function SettingsScreen() {
  const [typingSpeed, setTypingSpeed] = useState<TypingSpeed>("normal");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadPrefs = async () => {
      try {
        const v = await prefsGet(TYPING_SPEED_KEY);
        if (!cancelled && (v === "normal" || v === "fast")) {
          setTypingSpeed(v);
        }
      } catch (e) {
        console.warn("[Settings] failed to load prefs", e);
      }
    };
    void loadPrefs();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChangeTypingSpeed = async (value: TypingSpeed) => {
    try {
      setTypingSpeed(value);
      await prefsSet(TYPING_SPEED_KEY, value);
      showToast("Typing preference saved", "success");
    } catch (e) {
      console.warn("[Settings] failed to save typing_speed", e);
      showToast("Failed to save preference", "error");
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const [threads, messages, artifacts] = await Promise.all([
        listThreads(),
        listAllMessages(),
        listAllArtifacts(),
      ]);

      let jsonl = "";
      for (const t of threads) {
        jsonl += JSON.stringify({ type: "thread", data: t }) + "\n";
      }
      for (const m of messages) {
        jsonl += JSON.stringify({ type: "message", data: m }) + "\n";
      }
      for (const a of artifacts) {
        jsonl += JSON.stringify({ type: "artifact", data: a }) + "\n";
      }

      const fileUri = FileSystem.cacheDirectory + `tenmon-ark-export-${Date.now()}.jsonl`;
      await FileSystem.writeAsStringAsync(fileUri, jsonl, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/jsonl",
          dialogTitle: "Export TENMON-ARK conversations",
        });
      }

      showToast("Exported conversations", "success");
    } catch (e) {
      console.warn("[Settings] export failed", e);
      showToast("Export failed", "error");
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      MC.settings?.deleteTitle ?? "Delete local data",
      MC.settings?.deleteConfirm ?? "This cannot be undone. Delete now?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void handleDelete(),
        },
      ]
    );
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteAllLocalData();
      showToast("Local data deleted", "success");
    } catch (e) {
      console.warn("[Settings] delete failed", e);
      showToast("Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{MC.settings?.title ?? "Settings"}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {MC.settings?.exportTitle ?? "Export conversations"}
        </Text>
        <Text style={styles.sectionBody}>
          {MC.settings?.exportDescription ?? "Export local data as JSONL."}
        </Text>
        <Pressable
          onPress={handleExport}
          disabled={exporting}
          accessibilityRole="button"
          accessibilityLabel="Export conversations as JSONL"
          hitSlop={tokens.interaction.hitSlopLarge}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && { opacity: tokens.interaction.opacityPressed },
            exporting && { opacity: tokens.interaction.opacityDisabled },
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {exporting ? "Exporting…" : "Export JSONL"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {MC.settings?.deleteTitle ?? "Delete local data"}
        </Text>
        <Text style={styles.sectionBody}>
          {MC.settings?.deleteDescription ??
            "Delete all local threads, messages, and artifacts from this device."}
        </Text>
        <Pressable
          onPress={confirmDelete}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel="Delete all local TENMON-ARK data"
          hitSlop={tokens.interaction.hitSlopLarge}
          style={({ pressed }) => [
            styles.dangerButton,
            pressed && { opacity: tokens.interaction.opacityPressed },
            deleting && { opacity: tokens.interaction.opacityDisabled },
          ]}
        >
          <Text style={styles.dangerButtonText}>
            {deleting ? "Deleting…" : "Delete"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {MC.settings?.typingSpeedTitle ?? "Typing speed"}
        </Text>
        <View style={styles.segmentRow}>
          <Pressable
            onPress={() => handleChangeTypingSpeed("normal")}
            accessibilityRole="button"
            accessibilityLabel="Typing speed normal"
            hitSlop={tokens.interaction.hitSlop}
            style={({ pressed }) => [
              styles.segmentButton,
              typingSpeed === "normal" && styles.segmentButtonActive,
              pressed && { opacity: tokens.interaction.opacityPressed },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                typingSpeed === "normal" && styles.segmentTextActive,
              ]}
            >
              {MC.settings?.typingSpeedNormal ?? "Normal"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleChangeTypingSpeed("fast")}
            accessibilityRole="button"
            accessibilityLabel="Typing speed fast"
            hitSlop={tokens.interaction.hitSlop}
            style={({ pressed }) => [
              styles.segmentButton,
              typingSpeed === "fast" && styles.segmentButtonActive,
              pressed && { opacity: tokens.interaction.opacityPressed },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                typingSpeed === "fast" && styles.segmentTextActive,
              ]}
            >
              {MC.settings?.typingSpeedFast ?? "Fast"}
            </Text>
          </Pressable>
        </View>
      </View>
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
    marginBottom: tokens.spacing.lg,
  },
  section: {
    marginBottom: tokens.spacing.lg,
  },
  sectionTitle: {
    fontSize: tokens.typography.size.md,
    fontWeight: tokens.typography.weight.medium as any,
    color: tokens.colors.dark.textPrimary,
    marginBottom: tokens.spacing.xs,
  },
  sectionBody: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.dark.textSecondary,
    marginBottom: tokens.spacing.sm,
  },
  primaryButton: {
    borderRadius: tokens.radii.pill,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.colors.dark.accent,
    alignSelf: "flex-start",
  },
  primaryButtonText: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.dark.textPrimary,
  },
  dangerButton: {
    borderRadius: tokens.radii.pill,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.colors.dark.negative,
    alignSelf: "flex-start",
  },
  dangerButtonText: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.dark.textPrimary,
  },
  segmentRow: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  segmentButton: {
    borderRadius: tokens.radii.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderWidth: 1,
    borderColor: tokens.colors.dark.borderMuted,
  },
  segmentButtonActive: {
    backgroundColor: tokens.colors.dark.accentSoft,
    borderColor: tokens.colors.dark.accent,
  },
  segmentText: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.dark.textSecondary,
  },
  segmentTextActive: {
    color: tokens.colors.dark.textPrimary,
  },
});


