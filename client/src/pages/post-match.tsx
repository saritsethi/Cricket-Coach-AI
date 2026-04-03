import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CricketChat } from "@/components/cricket-chat";
import { useToast } from "@/hooks/use-toast";
import { BarChart2, Calendar, Share2, ChevronDown, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import type { Team, ScheduledMatch, MatchPlan, MatchAnalysis } from "@shared/schema";

function FixtureSelector({
  teams,
  fixtures,
  selected,
  onSelect,
}: {
  teams: Team[];
  fixtures: Record<number, ScheduledMatch[]>;
  selected: ScheduledMatch | null;
  onSelect: (f: ScheduledMatch) => void;
}) {
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {teams.map((team) => {
        const teamFixtures = (fixtures[team.id] || []);
        const isExpanded = expandedTeam === team.id;
        return (
          <div key={team.id}>
            <button
              className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-left"
              onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
              data-testid={`button-expand-team-${team.id}`}
            >
              <span className="font-medium text-sm">{team.name}</span>
              {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
            {isExpanded && (
              <div className="ml-3 mt-1 space-y-1">
                {teamFixtures.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-3 py-2">No fixtures</p>
                ) : (
                  teamFixtures.map((f) => {
                    const isSelected = selected?.id === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => onSelect(f)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}
                        data-testid={`fixture-option-${f.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <span>vs {f.opponent}</span>
                          {f.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                        </div>
                        <div className="text-xs text-muted-foreground">{f.matchDate} · {f.format}</div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PostMatchPage() {
  const { toast } = useToast();
  const [selectedFixture, setSelectedFixture] = useState<ScheduledMatch | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const fixtureQueries = useQuery<Record<number, ScheduledMatch[]>>({
    queryKey: ["/api/all-fixtures", teams.map(t => t.id)],
    enabled: teams.length > 0,
    queryFn: async () => {
      const results: Record<number, ScheduledMatch[]> = {};
      await Promise.all(
        teams.map(async (team) => {
          const res = await fetch(`/api/teams/${team.id}/fixtures`, {
            headers: { "x-user-token": localStorage.getItem("cricketiq_user_token") || "" },
          });
          results[team.id] = await res.json();
        })
      );
      return results;
    },
  });

  const allFixtures = fixtureQueries.data || {};

  const { data: prePlan } = useQuery<MatchPlan | null>({
    queryKey: ["/api/fixtures", selectedFixture?.id, "plan"],
    enabled: !!selectedFixture?.id,
    queryFn: async () => {
      const res = await fetch(`/api/fixtures/${selectedFixture!.id}/plan`, {
        headers: { "x-user-token": localStorage.getItem("cricketiq_user_token") || "" },
      });
      return res.json();
    },
  });

  const { data: analysis } = useQuery<MatchAnalysis | null>({
    queryKey: ["/api/fixtures", selectedFixture?.id, "analysis"],
    enabled: !!selectedFixture?.id,
    queryFn: async () => {
      const res = await fetch(`/api/fixtures/${selectedFixture!.id}/analysis`, {
        headers: { "x-user-token": localStorage.getItem("cricketiq_user_token") || "" },
      });
      return res.json();
    },
  });

  const handleFixtureSelect = (fixture: ScheduledMatch) => {
    setSelectedFixture(fixture);
    setConversationId(null);
    setShareLink(null);
  };

  const prePlanContext = useMemo(() => {
    if (!prePlan) return "";
    const parts: string[] = [];
    if (prePlan.battingOrder) parts.push(`Batting order: ${prePlan.battingOrder}`);
    if (prePlan.bowlingPlan) parts.push(`Bowling plan: ${prePlan.bowlingPlan}`);
    if (prePlan.notes) parts.push(`Notes: ${prePlan.notes}`);
    return parts.join("\n");
  }, [prePlan]);

  const extraBody = useMemo(() => ({
    prePlan: prePlanContext,
  }), [prePlanContext]);

  const handleShare = async () => {
    if (!selectedFixture) return;
    if (analysis?.shareToken) {
      const link = `${window.location.origin}/analysis/${analysis.shareToken}`;
      setShareLink(link);
      return;
    }

    setSharing(true);
    try {
      const res = await apiRequest("POST", `/api/fixtures/${selectedFixture.id}/analysis`, {
        scheduledMatchId: selectedFixture.id,
        conversationId,
        summaryNotes: "Post-match analysis",
      });
      const data = await res.json();
      const link = `${window.location.origin}/analysis/${data.shareToken}`;
      setShareLink(link);
    } catch {
      toast({ title: "Failed to generate share link", variant: "destructive" });
    } finally {
      setSharing(false);
    }
  };

  const handleWhatsApp = () => {
    if (!shareLink) return;
    const text = `Match analysis ready for review: ${shareLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const fixtureLabel = selectedFixture
    ? `vs ${selectedFixture.opponent} (${selectedFixture.format})`
    : undefined;

  if (teamsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <BarChart2 className="w-12 h-12 mx-auto mb-4 text-primary/40" />
          <h2 className="text-lg font-semibold mb-2">No teams yet</h2>
          <p className="text-sm text-muted-foreground">Create a team and add fixtures before analysing a match.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className={`shrink-0 border-r border-border overflow-y-auto transition-all duration-200 ${panelOpen ? "w-64" : "w-0 overflow-hidden"}`}>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Select Fixture</span>
          </div>
          <FixtureSelector
            teams={teams}
            fixtures={allFixtures}
            selected={selectedFixture}
            onSelect={handleFixtureSelect}
          />

          {shareLink && (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Share link</p>
              <div className="text-xs text-primary break-all bg-primary/5 rounded-md p-2">{shareLink}</div>
              <Button
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleWhatsApp}
                data-testid="button-share-whatsapp"
              >
                <Share2 className="w-4 h-4" />
                Share on WhatsApp
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {selectedFixture ? (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2.5 border-b border-border bg-background flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => setPanelOpen(v => !v)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-toggle-panel"
              >
                <Calendar className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm">vs {selectedFixture.opponent}</span>
                <span className="text-muted-foreground text-xs ml-2">
                  {selectedFixture.matchDate} · {selectedFixture.format}
                </span>
              </div>
              {prePlan && (
                <Badge variant="outline" className="text-xs shrink-0">Plan loaded</Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleShare}
                disabled={sharing}
                className="gap-1.5 shrink-0"
                data-testid="button-generate-share"
              >
                {sharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                Share
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CricketChat
                mode="post-match"
                conversationId={conversationId}
                onConversationCreated={setConversationId}
                extraBody={extraBody}
                placeholder="Upload the scorecard or ask about match performance..."
                allowMultipleImages
                fixtureLabel={fixtureLabel}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <BarChart2 className="w-12 h-12 text-primary/30 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Post-Match Analysis</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Select a fixture to analyse. Upload the scorecard and the AI will compare against your pre-match plan. Then share the analysis with your players via WhatsApp.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
