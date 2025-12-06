import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * ChatGPT Mobile UI - 上部固定タブ
 * - Chat / Browser タブ
 * - 左メニューアイコン（≡）
 * - 画面スクロール時も常に表示（position: fixed）
 */

interface ChatGPTMobileHeaderProps {
  activeTab: "chat" | "browser";
  onTabChange: (tab: "chat" | "browser") => void;
  onMenuClick: () => void;
}

export function ChatGPTMobileHeader({
  activeTab,
  onTabChange,
  onMenuClick,
}: ChatGPTMobileHeaderProps) {
  return (
    <header className="chatgpt-mobile-header">
      {/* 左メニューアイコン */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onMenuClick}
        className="chatgpt-mobile-menu-button"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* タブ */}
      <div className="chatgpt-mobile-tabs">
        <button
          className={`chatgpt-mobile-tab ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => onTabChange("chat")}
        >
          Chat
        </button>
        <button
          className={`chatgpt-mobile-tab ${activeTab === "browser" ? "active" : ""}`}
          onClick={() => onTabChange("browser")}
        >
          Browser
        </button>
      </div>

      {/* 右側スペース（将来的に設定アイコンなど） */}
      <div className="chatgpt-mobile-header-right"></div>
    </header>
  );
}
