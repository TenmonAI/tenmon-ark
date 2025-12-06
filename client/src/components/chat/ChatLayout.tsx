import { useState, ReactNode } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { ChatRoomList } from "./ChatRoomList";

interface ChatLayoutProps {
  children: ReactNode;
  currentRoomId: number | null;
  onRoomSelect: (roomId: number) => void;
  onNewChat: () => void;
}

/**
 * ChatGPT-style layout with PC sidebar and mobile drawer
 * PC: Left sidebar (280px) + Right chat area
 * Mobile: Drawer (swipe to open) + Full-width chat area
 */
export function ChatLayout({
  children,
  currentRoomId,
  onRoomSelect,
  onNewChat,
}: ChatLayoutProps) {
  // React Error #185予防: childrenの存在チェック
  if (!children) {
    return null;
  }

  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* PC Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex md:w-[280px] md:flex-col md:border-r md:border-border md:bg-background">
        <ChatRoomList
          currentRoomId={currentRoomId}
          onRoomSelect={(roomId) => {
            onRoomSelect(roomId);
          }}
          onNewChat={onNewChat}
        />
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-50"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <ChatRoomList
            currentRoomId={currentRoomId}
            onRoomSelect={(roomId) => {
              onRoomSelect(roomId);
              setDrawerOpen(false); // Close drawer after selection
            }}
            onNewChat={() => {
              onNewChat();
              setDrawerOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
