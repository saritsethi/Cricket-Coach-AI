import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { CricketChat } from "@/components/cricket-chat";
import { GraduationCap } from "lucide-react";

export function PlayerCoachingPage() {
  const [conversationId, setConversationId] = useState<number | null>(null);

  const handleConversationCreated = (id: number) => {
    setConversationId(id);
    queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <GraduationCap className="w-5 h-5 text-primary" />
        <div>
          <h1 className="font-semibold text-sm" data-testid="text-player-coaching-title">Player Coaching</h1>
          <p className="text-xs text-muted-foreground">Private one-on-one coaching session</p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <CricketChat
          mode="player"
          conversationId={conversationId}
          onConversationCreated={handleConversationCreated}
          placeholder="Ask your coach anything — batting technique, footwork, shot selection, mental game..."
        />
      </div>
    </div>
  );
}
