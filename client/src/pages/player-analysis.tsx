import { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, getUserToken } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CricketChat } from "@/components/cricket-chat";
import { User, Trophy, AlertCircle, Loader2 } from "lucide-react";
import type { MatchAnalysis, ScheduledMatch, MatchPlan, PlayerSession } from "@shared/schema";

interface AnalysisData {
  analysis: MatchAnalysis;
  fixture: ScheduledMatch | null;
  plan: MatchPlan | null;
}

function NameModal({ onConfirm }: { onConfirm: (name: string) => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 100));
    onConfirm(name.trim());
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Welcome</h2>
            <p className="text-sm text-muted-foreground">Enter your name to view your analysis</p>
          </div>
        </div>
        <Input
          autoFocus
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          data-testid="input-player-name"
        />
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          data-testid="button-confirm-name"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "View My Analysis"}
        </Button>
      </Card>
    </div>
  );
}

export function PlayerAnalysisPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const userToken = getUserToken();
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);

  const savedName = useMemo(() => {
    return sessionStorage.getItem(`player_name_${shareToken}`);
  }, [shareToken]);

  useEffect(() => {
    if (savedName) setPlayerName(savedName);
  }, [savedName]);

  const { data: analysisData, isLoading: analysisLoading, error } = useQuery<AnalysisData>({
    queryKey: ["/api/analysis", shareToken],
    queryFn: async () => {
      const res = await fetch(`/api/analysis/${shareToken}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!shareToken,
    retry: false,
  });

  useEffect(() => {
    const initSession = async () => {
      if (!playerName || !analysisData?.analysis) return;

      try {
        const res = await apiRequest("POST", "/api/player-sessions", {
          analysisId: analysisData.analysis.id,
          playerName,
          userToken,
        });
        const data = await res.json();
        setSessionId(data.session.id);
        if (data.session.conversationId) {
          setConversationId(data.session.conversationId);
        }
        sessionStorage.setItem(`player_name_${shareToken}`, playerName);
      } catch (err) {
        console.error("Failed to init session:", err);
      }
    };
    initSession();
  }, [playerName, analysisData?.analysis?.id]);

  const handleConversationCreated = async (convId: number) => {
    setConversationId(convId);
    if (sessionId) {
      try {
        await apiRequest("PATCH", `/api/player-sessions/${sessionId}`, { conversationId: convId });
      } catch {}
    }
  };

  const matchContext = useMemo(() => {
    if (!analysisData) return "";
    const { analysis, fixture, plan } = analysisData;
    const parts: string[] = [];
    if (fixture) {
      parts.push(`Match: vs ${fixture.opponent} (${fixture.format})`);
      if (fixture.matchDate) parts.push(`Date: ${fixture.matchDate}`);
      if (fixture.venue) parts.push(`Venue: ${fixture.venue}`);
      if (fixture.result) parts.push(`Result: ${fixture.result}`);
    }
    if (analysis.summaryNotes) {
      parts.push(`Match Summary: ${analysis.summaryNotes}`);
    }
    if (plan) {
      if (plan.battingOrder) parts.push(`Planned batting order: ${plan.battingOrder}`);
      if (plan.bowlingPlan) parts.push(`Bowling plan: ${plan.bowlingPlan}`);
    }
    return parts.join("\n");
  }, [analysisData]);

  const extraBody = useMemo(() => {
    const analysisImages = analysisData?.analysis?.imageUrls || [];
    const planImages = analysisData?.plan?.imageUrls || [];
    const allImages = [...analysisImages, ...planImages];
    return {
      playerName: playerName || undefined,
      matchContext,
      imageUrls: allImages.length > 0 ? allImages : undefined,
      isPlayerAnalysisPage: true,
    };
  }, [playerName, matchContext, analysisData]);

  if (analysisLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  if (error || !analysisData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold mb-2">Analysis not found</h1>
        <p className="text-sm text-muted-foreground">This link may be invalid or expired.</p>
      </div>
    );
  }

  const { fixture } = analysisData;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {!playerName && <NameModal onConfirm={setPlayerName} />}

      <header className="border-b border-border bg-background sticky top-0 z-40 px-4 py-3 flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground font-bold text-sm shrink-0">
          C
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">CricketIQ</div>
          {fixture && (
            <div className="text-xs text-muted-foreground truncate">
              vs {fixture.opponent} · {fixture.matchDate} · {fixture.format}
            </div>
          )}
        </div>
        {playerName && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium hidden sm:block">{playerName}</span>
          </div>
        )}
      </header>

      {playerName && (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>
          <CricketChat
            mode="player"
            conversationId={conversationId}
            onConversationCreated={handleConversationCreated}
            extraBody={extraBody}
            placeholder={`Ask about your performance, ${playerName}...`}
            fixtureLabel={fixture ? `vs ${fixture.opponent}` : undefined}
          />
        </div>
      )}
    </div>
  );
}
