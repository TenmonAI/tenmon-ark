import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { tokens, componentStyles } from "../lib/ui/theme";
import { MC } from "../lib/ui/microcopy";
import { KotodamaBadgeRow } from "./KotodamaBadgeRow";
import { makeDiveInPrompt } from "../lib/ui/promptTemplates";
import { showToast } from "../lib/ui/toastBus";

type ArtifactBase = {
  id?: string;
  doc?: string;
  pdfPage?: number;
  quote?: string;
  snippet?: string;
  tags?: string[];
};

type Props = {
  kind: "evidence" | "candidates";
  items: ArtifactBase[];
  onDiveIn?: (prompt: string) => void;
};

export function ArtifactCard({ kind, items, onDiveIn }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [modalItem, setModalItem] = useState<ArtifactBase | null>(null);

  if (!items || items.length === 0) return null;

  const title =
    kind === "evidence"
      ? `${MC.artifacts.evidenceTitle} (${items.length})`
      : `${MC.artifacts.candidatesTitle} (${items.length})`;

  const handleCopy = async (text?: string) => {
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      void Haptics.selectionAsync();
      showToast(MC.toast.copied, "success");
    } catch {
      showToast(MC.toast.networkError, "error");
    }
  };

  const openModal = (item: ArtifactBase) => {
    setModalItem(item);
  };

  const closeModal = () => setModalItem(null);

  return (
    <>
      <View style={componentStyles.artifactCard.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={() => setExpanded((v) => !v)}
          style={componentStyles.artifactCard.headerRow}
          hitSlop={tokens.interaction.hitSlop}
        >
          <Text style={componentStyles.artifactCard.title}>{title}</Text>
          <Text style={componentStyles.artifactCard.title}>
            {expanded ? "−" : "+"}
          </Text>
        </Pressable>
        {expanded &&
          items.map((item, idx) => {
            const key = item.id ?? `${kind}_${idx}`;
            const meta =
              item.doc && item.pdfPage
                ? `${item.doc} P${item.pdfPage}`
                : item.doc
                ? item.doc
                : "";
            const body = item.quote ?? item.snippet ?? "";
            const preview =
              body.length > 220 ? `${body.slice(0, 220).trim()}…` : body;

            return (
              <Pressable
                key={key}
                style={{ marginTop: tokens.spacing.sm }}
                onPress={() => openModal(item)}
                hitSlop={tokens.interaction.hitSlop}
              >
                {meta ? (
                  <Text
                    style={{
                      fontSize: tokens.typography.size.xs,
                      color: tokens.colors.dark.textMuted,
                      marginBottom: 2,
                    }}
                  >
                    {meta}
                  </Text>
                ) : null}
                {preview ? (
                  <Text
                    numberOfLines={3}
                    style={{
                      fontSize: tokens.typography.size.sm,
                      color: tokens.colors.dark.textSecondary,
                    }}
                  >
                    {preview}
                  </Text>
                ) : null}
                {kind === "candidates" && item.tags && item.tags.length > 0 && (
                  <KotodamaBadgeRow tags={item.tags} />
                )}
                <View style={componentStyles.artifactCard.footerRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={MC.artifacts.copyQuote}
                    onPress={() => handleCopy(body)}
                    hitSlop={tokens.interaction.hitSlop}
                    style={({ pressed }) => [
                      {
                        paddingHorizontal: tokens.spacing.sm,
                        paddingVertical: 4,
                        borderRadius: tokens.radii.pill,
                        borderWidth: 1,
                        borderColor: tokens.colors.dark.borderMuted,
                      },
                      pressed && {
                        opacity: tokens.interaction.opacityPressed,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: tokens.typography.size.xs,
                        color: tokens.colors.dark.textSecondary,
                      }}
                    >
                      {MC.artifacts.copyQuote}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
      </View>

      <Modal
        visible={!!modalItem}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView style={{ maxHeight: "80%" }}>
              {modalItem?.doc && modalItem.pdfPage ? (
                <Text style={styles.modalMeta}>
                  {modalItem.doc} P{modalItem.pdfPage}
                </Text>
              ) : null}
              <Text style={styles.modalBody}>
                {(modalItem?.quote ?? modalItem?.snippet ?? "").trim()}
              </Text>
            </ScrollView>
            <View style={styles.modalFooter}>
              <Pressable
                onPress={() =>
                  handleCopy(
                    (modalItem?.quote ?? modalItem?.snippet ?? "").trim()
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={MC.artifacts.copyQuote}
                hitSlop={tokens.interaction.hitSlop}
                style={({ pressed }) => [
                  styles.modalButton,
                  pressed && { opacity: tokens.interaction.opacityPressed },
                ]}
              >
                <Text style={styles.modalButtonText}>{MC.artifacts.copyQuote}</Text>
              </Pressable>
              {kind === "evidence" && modalItem?.doc && modalItem.pdfPage && onDiveIn && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={MC.artifacts.diveIn}
                  onPress={() => {
                    const prompt = makeDiveInPrompt({
                      doc: modalItem.doc,
                      pdfPage: modalItem.pdfPage,
                    });
                    onDiveIn(prompt);
                    closeModal();
                  }}
                  hitSlop={tokens.interaction.hitSlop}
                  style={({ pressed }) => [
                    styles.modalButtonPrimary,
                    pressed && { opacity: tokens.interaction.opacityPressed },
                  ]}
                >
                  <Text style={styles.modalButtonText}>{MC.artifacts.diveIn}</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close details"
                onPress={closeModal}
                hitSlop={tokens.interaction.hitSlop}
                style={({ pressed }) => [
                  styles.modalButton,
                  pressed && { opacity: tokens.interaction.opacityPressed },
                ]}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.spacing.lg,
  },
  modalCard: {
    width: "100%",
    borderRadius: tokens.radii.lg,
    backgroundColor: tokens.colors.dark.surface,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.dark.border,
  },
  modalMeta: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.dark.textMuted,
    marginBottom: tokens.spacing.sm,
  },
  modalBody: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.dark.textPrimary,
  },
  modalFooter: {
    marginTop: tokens.spacing.lg,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: tokens.spacing.sm,
    flexWrap: "wrap",
  },
  modalButton: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
    borderColor: tokens.colors.dark.borderMuted,
  },
  modalButtonPrimary: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.dark.accent,
  },
  modalButtonText: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.dark.textPrimary,
  },
});

