import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { CricketChat } from "@/components/cricket-chat";

export function GeneralChatPage() {
  const [conversationId, setConversationId] = useState<number | null>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">Ask CricketIQ</h1>
            <p className="text-sm text-muted-foreground">
              Any cricket question — tactics, rules, technique, strategy. No uploads needed.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <CricketChat
          mode="general"
          conversationId={conversationId}
          onConversationCreated={setConversationId}
          placeholder="Ask anything about cricket…"
        />
      </div>
    </div>
  );
}
