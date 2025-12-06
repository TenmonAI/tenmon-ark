/**
 * Chat Menu Sheet (Mobile)
 * - スマホ用チャット一覧メニュー
 * - 上スワイプまたは「≡ メニュー」ボタンで表示
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ChatRoom {
  id: number;
  title: string;
  updatedAt: Date;
}

interface ChatMenuSheetProps {
  rooms: ChatRoom[];
  currentRoomId: number | null;
  onSelectRoom: (roomId: number) => void;
  onNewChat: () => void;
  onDeleteChat: (roomId: number) => void;
  isCreating?: boolean;
  userName?: string;
}

export function ChatMenuSheet({
  rooms,
  currentRoomId,
  onSelectRoom,
  onNewChat,
  onDeleteChat,
  isCreating = false,
  userName,
}: ChatMenuSheetProps) {
  const { t } = useTranslation();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed top-4 left-4 z-50 bg-slate-900/80 backdrop-blur-sm hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-80 bg-slate-900/95 backdrop-blur-md border-slate-700"
      >
        <SheetHeader>
          <SheetTitle className="text-amber-400">TENMON-ARK</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* 新規チャットボタン */}
          <Button
            onClick={onNewChat}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            disabled={isCreating}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("chat.new_chat")}
          </Button>

          {/* チャットルーム一覧 */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {rooms?.map((room) => (
              <Card
                key={room.id}
                className={`p-3 cursor-pointer transition-all group ${
                  currentRoomId === room.id
                    ? "bg-amber-500/20 border-amber-500"
                    : "bg-slate-800/50 border-slate-700 hover:bg-slate-800"
                }`}
                onClick={() => onSelectRoom(room.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-slate-100">
                      {room.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(room.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(room.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* ユーザー情報 */}
          {userName ? (
            <div className="pt-4 border-t border-slate-700">
              <div className="text-xs text-slate-400">
                <p className="font-semibold text-amber-400">TENMON-ARK</p>
                <p className="mt-1">{t("app.subtitle")}</p>
                <p className="mt-1 truncate">{userName}</p>
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
