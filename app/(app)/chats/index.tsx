import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { listThreads, createThread, type DbThread } from "../../../lib/db/repo";
import { tokens } from "../../../lib/ui/theme";
import { MC } from "../../../lib/ui/microcopy";

export default function ChatsIndexScreen() {
  const router = useRouter();
  const [threads, setThreads] = React.useState<DbThread[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  const loadThreads = React.useCallback(async () => {
    try {
      setLoading(true);
      const rows = await listThreads();
      setThreads(rows);
    } catch (e) {
      console.warn("[Chats] Failed to load threads", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadThreads();
    }, [loadThreads])
  );

  const handleNewChat = async () => {
    try {
      setCreating(true);
      const thread = await createThread(null);
      setThreads((prev) => [thread, ...prev]);
      router.push(`/(app)/chats/chat/${thread.id}`);
    } catch (e) {
      console.warn("[Chats] Failed to create thread", e);
    } finally {
      setCreating(false);
    }
  };

  const renderItem = ({ item }: { item: DbThread }) => {
    const title = item.title || "New chat";
    const updated = new Date(item.updatedAt);
    const subtitle = updated.toLocaleString();

    return (
      <Pressable
        onPress={() => router.push(`/(app)/chats/chat/${item.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Open chat thread: ${title}`}
        style={({ pressed }) => [
          styles.row,
          pressed && { opacity: tokens.interaction.opacityPressed },
        ]}
        hitSlop={tokens.interaction.hitSlop}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </Pressable>
    );
  };

  const keyExtractor = (item: DbThread) => item.id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{MC.chats?.title ?? "Chats"}</Text>
        <Pressable
          onPress={handleNewChat}
          disabled={creating}
          accessibilityRole="button"
          accessibilityLabel={MC.chats?.newChat ?? "New chat"}
          hitSlop={tokens.interaction.hitSlopLarge}
          style={({ pressed }) => [
            styles.newChatButton,
            pressed && { opacity: tokens.interaction.opacityPressed },
            creating && { opacity: tokens.interaction.opacityDisabled },
          ]}
        >
          <Text style={styles.newChatText}>
            {MC.chats?.newChat ?? "New chat"}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : threads.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {MC.chats?.emptyStateTitle ?? "No conversations yet"}
          </Text>
          <Text style={styles.emptyBody}>
            {MC.chats?.emptyStateBody ?? "Start a new chat."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.semibold as any,
    color: tokens.colors.dark.textPrimary,
  },
  newChatButton: {
    borderRadius: tokens.radii.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    backgroundColor: tokens.colors.dark.accent,
  },
  newChatText: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.dark.textPrimary,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.lg,
  },
  emptyTitle: {
    fontSize: tokens.typography.size.md,
    fontWeight: tokens.typography.weight.medium as any,
    color: tokens.colors.dark.textPrimary,
    marginBottom: tokens.spacing.xs,
  },
  emptyBody: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.dark.textSecondary,
    textAlign: "center",
  },
  listContent: {
    paddingBottom: tokens.spacing.lg,
  },
  row: {
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.dark.borderMuted,
  },
  rowTitle: {
    fontSize: tokens.typography.size.md,
    color: tokens.colors.dark.textPrimary,
  },
  rowSubtitle: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.dark.textMuted,
    marginTop: 2,
  },
});


