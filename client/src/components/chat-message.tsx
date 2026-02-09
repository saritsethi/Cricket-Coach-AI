import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, HelpCircle } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

function parseFollowUp(text: string): { mainContent: string; followUp: string | null } {
  const match = text.match(/<<FOLLOWUP>>([\s\S]*?)<<END_FOLLOWUP>>/);
  if (match) {
    const mainContent = text.replace(/<<FOLLOWUP>>[\s\S]*?<<END_FOLLOWUP>>/, "").trim();
    const followUp = match[1].trim();
    return { mainContent, followUp };
  }
  return { mainContent: text, followUp: null };
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";
  const { mainContent, followUp } = isUser ? { mainContent: content, followUp: null } : parseFollowUp(content);

  return (
    <div
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
      data-testid={`chat-message-${role}`}
    >
      {!isUser && (
        <Avatar className="shrink-0 w-8 h-8">
          <AvatarFallback className="bg-primary/10 text-primary">
            <Bot className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={`
          max-w-[80%] rounded-md px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-card-border"
          }
        `}
      >
        {mainContent ? (
          <div className="space-y-3">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {mainContent}
            </div>
            {followUp && (
              <div
                className="flex items-start gap-2 mt-3 pt-3 border-t border-border"
                data-testid="followup-question"
              >
                <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-primary">{followUp}</p>
              </div>
            )}
          </div>
        ) : isStreaming ? (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.15s" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.3s" }} />
          </div>
        ) : null}
      </div>
      {isUser && (
        <Avatar className="shrink-0 w-8 h-8">
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
