import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/_core/hooks/useAuth";
import { FounderBadge } from "@/components/FounderBadge";

interface ChatRoomListProps {
  currentRoomId: number | null;
  onRoomSelect: (roomId: number) => void;
  onNewChat: () => void;
}

/**
 * Chat room list component (shared between PC sidebar and mobile drawer)
 * Displays list of chat rooms with title and last updated time
 */
export function ChatRoomList({
  currentRoomId,
  onRoomSelect,
  onNewChat,
}: ChatRoomListProps) {
  const { user } = useAuth();
  const { data: rooms, isLoading } = trpc.chat.listRooms.useQuery();
  const { data: currentPlan } = trpc.planManagement.getCurrentPlan.useQuery(undefined, {
    enabled: !!user,
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header with New Chat button */}
      <div className="p-4 border-b border-border space-y-3">
        {/* Founder Badge */}
        {currentPlan?.plan.name === "founder" && (
          <div className="flex justify-center">
            <FounderBadge variant="compact" />
          </div>
        )}
        <Button
          onClick={onNewChat}
          className="w-full"
          variant="default"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Room List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading && (
            <div className="text-center text-muted-foreground py-4">
              Loading...
            </div>
          )}

          {rooms && rooms.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              No chats yet. Start a new chat!
            </div>
          )}

          {rooms?.map((room) => (
            <Button
              key={room.id}
              onClick={() => onRoomSelect(room.id)}
              variant={currentRoomId === room.id ? "secondary" : "ghost"}
              className="w-full justify-start text-left h-auto py-3 px-3"
            >
              <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">
                  {room.title || "New Chat"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(room.updatedAt), {
                    addSuffix: true,
                  })}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
