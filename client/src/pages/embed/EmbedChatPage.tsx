/**
 * EmbedChatPage.tsx - Dynamic Embed Chat Page
 * 
 * 外部サイト埋め込み用のチャットページ
 * uniqueIdに基づいて設定を読み込み、適切なテーマでチャットUIを表示
 */

import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import ChatDivine from "../ChatDivine";
import LpChatFrame from "./LpChatFrame";

export default function EmbedChatPage() {
  const [, params] = useRoute("/embed/ark-chat-:uniqueId");
  const uniqueId = params?.uniqueId || "";

  const { data: embedConfig, isLoading, error } = trpc.embed.getByUniqueId.useQuery(
    { uniqueId },
    { enabled: !!uniqueId }
  );

  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (embedConfig?.theme) {
      setTheme(embedConfig.theme);
      // Apply theme to document
      document.documentElement.classList.toggle("dark", embedConfig.theme === "dark");
      document.documentElement.classList.toggle("light", embedConfig.theme === "light");
    }
  }, [embedConfig?.theme]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-400"></div>
          <p className="mt-4 text-amber-400 font-medium">Loading ARK Chat...</p>
        </div>
      </div>
    );
  }

  if (error || !embedConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-amber-400 mb-2">Embed Not Found</h1>
          <p className="text-gray-400">The requested embed chat does not exist or has been disabled.</p>
        </div>
      </div>
    );
  }

  // Render appropriate chat component based on type
  if (embedConfig.type === "qa") {
    return <LpChatFrame />;
  }

  // Default: Full ChatDivine experience
  return <ChatDivine />;
}
