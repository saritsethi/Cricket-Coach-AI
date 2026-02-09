import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { PromptSuggestions } from "@/components/prompt-suggestions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown, Swords, ShieldCheck } from "lucide-react";
import type { AppMode, Message, Conversation } from "@shared/schema";

const modeConfig: Record<AppMode, { label: string; Icon: typeof Crown; greeting: string }> = {
  captain: {
    label: "Captain's Strategy",
    Icon: Crown,
    greeting: "Ready to plan your match strategy. Ask about field placements, bowling changes, batting orders, or chase plans.",
  },
  skills: {
    label: "Skill Building",
    Icon: Swords,
    greeting: "Let's work on improving your cricket skills. Ask about batting, bowling, fielding techniques, or training drills.",
  },
  equipment: {
    label: "Equipment Review",
    Icon: ShieldCheck,
    greeting: "Need help choosing the right gear? Ask about bats, pads, helmets, shoes, or any cricket equipment.",
  },
};

interface ChatPageProps {
  mode: AppMode;
  conversationId: number | null;
  onConversationCreated: (id: number) => void;
}

export function ChatPage({ mode, conversationId, onConversationCreated }: ChatPageProps) {
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const config = modeConfig[mode];

  const { data: conversationData } = useQuery<{ messages: Message[] } & Conversation>({
    queryKey: ["/api/conversations", conversationId],
    enabled: !!conversationId,
  });

  const messages = conversationData?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const sendMessage = useCallback(async (content: string, imageUrl?: string) => {
    let currentConvId = conversationId;

    if (!currentConvId) {
      const res = await apiRequest("POST", "/api/conversations", {
        title: content.slice(0, 60) + (content.length > 60 ? "..." : ""),
        mode,
      });
      const newConv = await res.json();
      currentConvId = newConv.id;
      onConversationCreated(newConv.id);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    }

    queryClient.setQueryData(
      ["/api/conversations", currentConvId],
      (old: any) => {
        const existingMessages = old?.messages || [];
        return {
          ...old,
          messages: [...existingMessages, { id: Date.now(), role: "user", content, imageUrl: imageUrl || null, conversationId: currentConvId, createdAt: new Date().toISOString() }],
        };
      }
    );

    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch(`/api/chat/${currentConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mode, imageUrl }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.content) {
              fullResponse += event.content;
              setStreamingContent(fullResponse);
            }
            if (event.done) {
              queryClient.setQueryData(
                ["/api/conversations", currentConvId],
                (old: any) => {
                  const existingMessages = old?.messages || [];
                  return {
                    ...old,
                    messages: [...existingMessages, { id: Date.now() + 1, role: "assistant", content: fullResponse, conversationId: currentConvId, createdAt: new Date().toISOString() }],
                  };
                }
              );
              setIsStreaming(false);
              setStreamingContent("");
              queryClient.invalidateQueries({ queryKey: ["/api/conversations", currentConvId] });
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setIsStreaming(false);
      setStreamingContent("");
    }
  }, [conversationId, mode, onConversationCreated]);

  const handlePromptSelect = (prompt: string) => {
    sendMessage(prompt);
  };

  const showWelcome = messages.length === 0 && !isStreaming;

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {showWelcome ? (
          <div className="flex flex-col items-center justify-center min-h-full px-6 py-12">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <config.Icon className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2" data-testid="text-mode-title">
              {config.label}
            </h2>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
              {config.greeting}
            </p>
            <PromptSuggestions mode={mode} onSelect={handlePromptSelect} />
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto">
            {messages.map((msg: any) => (
              <ChatMessage
                key={msg.id}
                role={msg.role as "user" | "assistant"}
                content={msg.content}
                imageUrl={msg.imageUrl}
              />
            ))}
            {isStreaming && (
              <ChatMessage
                role="assistant"
                content={streamingContent}
                isStreaming
              />
            )}
          </div>
        )}
      </div>
      <div className="max-w-4xl mx-auto w-full">
        <ChatInput
          onSend={sendMessage}
          disabled={isStreaming}
          value={inputValue}
          onChange={setInputValue}
          placeholder={`Ask about ${config.label.toLowerCase()}...`}
        />
      </div>
    </div>
  );
}
