import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Conversation, AppMode } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
  isLoading: boolean;
  mode: AppMode;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isLoading,
  mode,
}: ConversationListProps) {
  const filtered = conversations.filter((c) => c.mode === mode);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <Button
          onClick={onNew}
          variant="outline"
          className="w-full justify-start gap-2"
          data-testid="button-new-conversation"
        >
          <Plus className="w-4 h-4" />
          <span>New Conversation</span>
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs py-8">
            No conversations yet
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filtered.map((conv) => {
              const isActive = conv.id === activeId;
              return (
                <div
                  key={conv.id}
                  className={`
                    group relative flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer text-sm
                    toggle-elevate ${isActive ? "toggle-elevated" : ""}
                    hover-elevate
                  `}
                  onClick={() => onSelect(conv.id)}
                  data-testid={`conversation-item-${conv.id}`}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate flex-1">{conv.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className="invisible group-hover:visible shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    data-testid={`button-delete-conversation-${conv.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
