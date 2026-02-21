import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Bot, User, HelpCircle, BookOpen, ExternalLink, Play } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
  isStreaming?: boolean;
}

function stripContextTags(text: string): string {
  return text
    .replace(/^\[CAPTAIN CONTEXT\][^\n]*\n\n/g, "")
    .replace(/^\[PLAYER PROFILE\][^\n]*\n\n/g, "")
    .trim();
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

interface Citation {
  match: string;
  detail: string;
  url: string | null;
}

function parseCitations(text: string): { cleanText: string; citations: Citation[] } {
  const citations: Citation[] = [];
  const regex = /<<CITATION>>([\s\S]*?)<<END_CITATION>>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const lines = match[1].trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length >= 1) {
      let url: string | null = null;
      const detailLines: string[] = [];
      for (const line of lines.slice(1)) {
        const urlMatch = line.match(/\[.*?\]\((https?:\/\/[^\s)]+)\)/);
        const plainUrlMatch = line.match(/(?:Scorecard|URL|Link):\s*(https?:\/\/[^\s]+)/i);
        if (urlMatch) {
          url = urlMatch[1];
        } else if (plainUrlMatch) {
          url = plainUrlMatch[1];
        } else {
          detailLines.push(line);
        }
      }
      citations.push({
        match: lines[0],
        detail: detailLines.join(" "),
        url,
      });
    }
  }
  const cleanText = text.replace(/<<CITATION>>[\s\S]*?<<END_CITATION>>/g, "").trim();
  return { cleanText, citations };
}

function renderWithLinks(text: string) {
  const parts = text.split(/(\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}

interface Reference {
  title: string;
  url: string;
  type: "youtube" | "article";
}

function parseReferences(text: string): { cleanText: string; references: Reference[] } {
  const references: Reference[] = [];
  const regex = /<<REFERENCE>>([\s\S]*?)<<END_REFERENCE>>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const lines = match[1].trim().split("\n").map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const urlMatch = line.match(/\[(.*?)\]\((.*?)\)/);
      if (urlMatch) {
        const isYouTube = urlMatch[2].includes("youtube.com") || urlMatch[2].includes("youtu.be");
        references.push({
          title: urlMatch[1],
          url: urlMatch[2],
          type: isYouTube ? "youtube" : "article",
        });
      }
    }
  }
  const cleanText = text.replace(/<<REFERENCE>>[\s\S]*?<<END_REFERENCE>>/g, "").trim();
  return { cleanText, references };
}

export function ChatMessage({ role, content, imageUrl, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";

  let mainContent = isUser ? stripContextTags(content) : content;
  let followUp: string | null = null;
  let citations: Citation[] = [];
  let references: Reference[] = [];

  if (!isUser) {
    const followUpResult = parseFollowUp(content);
    mainContent = followUpResult.mainContent;
    followUp = followUpResult.followUp;

    const citationResult = parseCitations(mainContent);
    mainContent = citationResult.cleanText;
    citations = citationResult.citations;

    const refResult = parseReferences(mainContent);
    mainContent = refResult.cleanText;
    references = refResult.references;
  }

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
        {isUser && imageUrl && (
          <div className="mb-2" data-testid="user-attached-image">
            <img
              src={imageUrl}
              alt="Attached"
              className="max-w-full max-h-64 rounded-md object-contain"
            />
          </div>
        )}
        {mainContent ? (
          <div className="space-y-3">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {mainContent}
            </div>

            {citations.length > 0 && (
              <div className="space-y-2 mt-3 pt-3 border-t border-border" data-testid="citations-section">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <BookOpen className="w-3.5 h-3.5" />
                  Match References
                </div>
                {citations.map((c, i) => (
                  <Card key={i} className="p-3" data-testid={`citation-card-${i}`}>
                    <div className="text-sm font-medium">{c.match}</div>
                    {c.detail && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {renderWithLinks(c.detail)}
                      </div>
                    )}
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-2"
                        data-testid={`citation-link-${i}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Full Scorecard
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {references.length > 0 && (
              <div className="space-y-2 mt-3 pt-3 border-t border-border" data-testid="references-section">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Reviews & Resources
                </div>
                {references.map((ref, i) => (
                  <a
                    key={i}
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-md border border-border hover-elevate text-sm"
                    data-testid={`reference-link-${i}`}
                  >
                    {ref.type === "youtube" ? (
                      <Play className="w-4 h-4 text-red-500 shrink-0" />
                    ) : (
                      <ExternalLink className="w-4 h-4 text-primary shrink-0" />
                    )}
                    <span className="truncate">{ref.title}</span>
                  </a>
                ))}
              </div>
            )}

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
