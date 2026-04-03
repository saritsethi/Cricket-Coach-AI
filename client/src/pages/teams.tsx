import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest, getUserToken } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users, ChevronRight, Trophy } from "lucide-react";
import type { Team } from "@shared/schema";

export function TeamsPage() {
  const [creating, setCreating] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const handleCreate = async () => {
    if (!teamName.trim()) return;
    setSaving(true);
    try {
      await apiRequest("POST", "/api/teams", { name: teamName.trim() });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setTeamName("");
      setCreating(false);
    } catch (err) {
      console.error("Failed to create team:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              My Teams
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your squads, schedules, and match strategies
            </p>
          </div>
          {!creating && (
            <Button
              onClick={() => setCreating(true)}
              data-testid="button-create-team"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Team
            </Button>
          )}
        </div>

        {creating && (
          <Card className="p-4 mb-6">
            <p className="text-sm font-medium mb-3">New Team Name</p>
            <div className="flex gap-2">
              <Input
                autoFocus
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Sunday XI, Riverside CC..."
                data-testid="input-team-name"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button onClick={handleCreate} disabled={saving || !teamName.trim()} data-testid="button-save-team">
                {saving ? "Saving..." : "Create"}
              </Button>
              <Button variant="ghost" onClick={() => { setCreating(false); setTeamName(""); }}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No teams yet</p>
            <p className="text-sm mt-1">Create your first team to get started</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {teams.map((team) => (
              <Link key={team.id} href={`/teams/${team.id}`}>
                <Card
                  className="p-4 cursor-pointer hover-elevate flex items-center justify-between"
                  data-testid={`team-card-${team.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg">
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold">{team.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Created {new Date(team.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
