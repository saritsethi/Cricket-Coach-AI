import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CricketChat } from "@/components/cricket-chat";
import { Crown, Calendar, Users, ChevronDown, ChevronRight } from "lucide-react";
import type { Team, ScheduledMatch, SquadMember } from "@shared/schema";

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
        const teamFixtures = (fixtures[team.id] || []).filter(f => f.status !== "completed");
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
                  <p className="text-xs text-muted-foreground px-3 py-2">No upcoming fixtures</p>
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
                        <div>vs {f.opponent}</div>
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

export function PreMatchPage() {
  const [selectedFixture, setSelectedFixture] = useState<ScheduledMatch | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

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

  const { data: squad = [] } = useQuery<SquadMember[]>({
    queryKey: ["/api/teams", selectedTeamId, "squad"],
    enabled: !!selectedTeamId,
    queryFn: async () => {
      const res = await fetch(`/api/teams/${selectedTeamId}/squad`, {
        headers: { "x-user-token": localStorage.getItem("cricketiq_user_token") || "" },
      });
      return res.json();
    },
  });

  const handleFixtureSelect = (fixture: ScheduledMatch) => {
    setSelectedFixture(fixture);
    setSelectedTeamId(fixture.teamId);
    setConversationId(null);
  };

  const squadContext = useMemo(() => {
    if (!squad.length) return "";
    const lines = squad.map((m, i) =>
      `${i + 1}. ${m.name} (${m.role || "Player"}${m.battingStyle ? `, ${m.battingStyle}` : ""}${m.bowlingStyle ? `, ${m.bowlingStyle}` : ""})`
    );
    return `Squad roster:\n${lines.join("\n")}`;
  }, [squad]);

  const extraBody = useMemo(() => ({
    squadContext,
  }), [squadContext]);

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
          <Crown className="w-12 h-12 mx-auto mb-4 text-primary/40" />
          <h2 className="text-lg font-semibold mb-2">No teams yet</h2>
          <p className="text-sm text-muted-foreground">
            Create a team and add your squad before planning a match.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div
        className={`shrink-0 border-r border-border overflow-y-auto transition-all duration-200 ${panelOpen ? "w-64" : "w-0 overflow-hidden"}`}
      >
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

          {selectedFixture && squad.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Squad ({squad.length})</span>
              </div>
              <div className="space-y-1">
                {squad.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm py-1">
                    <span className="text-muted-foreground w-5 text-xs">{i + 1}</span>
                    <span className="flex-1 truncate">{m.name}</span>
                    {m.role && (
                      <span className="text-xs text-muted-foreground shrink-0">{m.role.slice(0, 3)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {selectedFixture ? (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2.5 border-b border-border bg-background flex items-center gap-2 shrink-0">
              <button
                onClick={() => setPanelOpen(v => !v)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-toggle-panel"
              >
                <Calendar className="w-4 h-4" />
              </button>
              <div>
                <span className="font-medium text-sm">vs {selectedFixture.opponent}</span>
                <span className="text-muted-foreground text-xs ml-2">
                  {selectedFixture.matchDate} · {selectedFixture.format}
                  {selectedFixture.venue ? ` · ${selectedFixture.venue}` : ""}
                </span>
              </div>
              {squad.length > 0 && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {squad.length} players loaded
                </Badge>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <CricketChat
                mode="pre-match"
                conversationId={conversationId}
                onConversationCreated={setConversationId}
                extraBody={extraBody}
                placeholder="Ask about batting order, bowling plan, field placements, toss decision..."
                allowMultipleImages
                fixtureLabel={fixtureLabel}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <Crown className="w-12 h-12 text-primary/30 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Pre-Match Planning</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Select a fixture from the panel to start building your match plan. The AI will use your squad roster to give personalised advice.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
