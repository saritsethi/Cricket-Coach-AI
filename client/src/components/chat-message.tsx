import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";

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
        {content ? (
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {content}
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
