import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { queryClient, apiRequest, getUserToken } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Upload, Loader2, Users, Calendar, AlertCircle, Pencil, Check, X, BarChart2, Crown } from "lucide-react";
import type { Team, SquadMember, SeasonSchedule, ScheduledMatch } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const roleColors: Record<string, string> = {
  Batter: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Bowler: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "All-rounder": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  Wicketkeeper: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

const statusColors: Record<string, string> = {
  upcoming: "bg-muted text-muted-foreground",
  planned: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

function SquadTab({ teamId }: { teamId: number }) {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", battingStyle: "", bowlingStyle: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", role: "", battingStyle: "", bowlingStyle: "" });
  const [editSaving, setEditSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: squad = [], isLoading } = useQuery<SquadMember[]>({
    queryKey: ["/api/teams", teamId, "squad"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamId}/squad`, {
        headers: { "x-user-token": getUserToken() },
      });
      return res.json();
    },
  });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await apiRequest("POST", `/api/teams/${teamId}/squad`, form);
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "squad"] });
      setForm({ name: "", role: "", battingStyle: "", bowlingStyle: "" });
      setAdding(false);
    } catch {
      toast({ title: "Failed to add player", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/squad/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "squad"] });
    } catch {
      toast({ title: "Failed to remove player", variant: "destructive" });
    }
  };

  const startEdit = (member: SquadMember) => {
    setEditingId(member.id);
    setEditForm({
      name: member.name,
      role: member.role || "",
      battingStyle: member.battingStyle || "",
      bowlingStyle: member.bowlingStyle || "",
    });
  };

  const handleUpdate = async () => {
    if (!editingId || !editForm.name.trim()) return;
    setEditSaving(true);
    try {
      await apiRequest("PATCH", `/api/squad/${editingId}`, editForm);
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "squad"] });
      setEditingId(null);
    } catch {
      toast({ title: "Failed to update player", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const uploadAndExtract = async (file: File) => {
    setUploading(true);
    try {
      const urlRes = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

      const extractRes = await apiRequest("POST", "/api/extract", {
        imageUrl: objectPath,
        extractionType: "squad",
      });
      const { data } = await extractRes.json();

      if (Array.isArray(data) && data.length > 0) {
        await apiRequest("POST", `/api/teams/${teamId}/squad/bulk`, { members: data });
        queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "squad"] });
        toast({ title: `Imported ${data.length} players from team sheet` });
      } else {
        toast({ title: "Could not read any players from that image", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndExtract(f); }}
        />
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          data-testid="button-upload-teamsheet"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Reading team sheet..." : "Import from image"}
        </Button>
        <Button onClick={() => setAdding(true)} className="gap-2" data-testid="button-add-player">
          <Plus className="w-4 h-4" />
          Add player
        </Button>
      </div>

      {uploading && (
        <Card className="p-3 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 text-sm text-primary">
            <Loader2 className="w-4 h-4 animate-spin" />
            AI is reading your team sheet and importing players...
          </div>
        </Card>
      )}

      {adding && (
        <Card className="p-4 space-y-3">
          <p className="font-medium text-sm">Add player</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              autoFocus
              placeholder="Player name *"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              data-testid="input-player-name"
            />
            <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger data-testid="select-player-role">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Batter">Batter</SelectItem>
                <SelectItem value="Bowler">Bowler</SelectItem>
                <SelectItem value="All-rounder">All-rounder</SelectItem>
                <SelectItem value="Wicketkeeper">Wicketkeeper</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.battingStyle} onValueChange={(v) => setForm(f => ({ ...f, battingStyle: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Batting style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Right-hand bat">Right-hand bat</SelectItem>
                <SelectItem value="Left-hand bat">Left-hand bat</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.bowlingStyle} onValueChange={(v) => setForm(f => ({ ...f, bowlingStyle: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Bowling style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Right-arm fast">Right-arm fast</SelectItem>
                <SelectItem value="Right-arm medium">Right-arm medium</SelectItem>
                <SelectItem value="Left-arm medium">Left-arm medium</SelectItem>
                <SelectItem value="Off-spin">Off-spin</SelectItem>
                <SelectItem value="Leg-spin">Leg-spin</SelectItem>
                <SelectItem value="Left-arm spin">Left-arm spin</SelectItem>
                <SelectItem value="N/A">N/A</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={saving || !form.name.trim()} data-testid="button-save-player">
              {saving ? "Saving..." : "Add"}
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : squad.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No players yet. Add players or import from a team sheet image.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {squad.map((member, i) => (
            <Card key={member.id} className="px-4 py-3" data-testid={`squad-member-${member.id}`}>
              {editingId === member.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      autoFocus
                      value={editForm.name}
                      onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Player name *"
                      data-testid={`input-edit-player-name-${member.id}`}
                    />
                    <Select value={editForm.role} onValueChange={(v) => setEditForm(f => ({ ...f, role: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Batter">Batter</SelectItem>
                        <SelectItem value="Bowler">Bowler</SelectItem>
                        <SelectItem value="All-rounder">All-rounder</SelectItem>
                        <SelectItem value="Wicketkeeper">Wicketkeeper</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={editForm.battingStyle} onValueChange={(v) => setEditForm(f => ({ ...f, battingStyle: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Batting style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Right-hand bat">Right-hand bat</SelectItem>
                        <SelectItem value="Left-hand bat">Left-hand bat</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={editForm.bowlingStyle} onValueChange={(v) => setEditForm(f => ({ ...f, bowlingStyle: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Bowling style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Right-arm fast">Right-arm fast</SelectItem>
                        <SelectItem value="Right-arm medium">Right-arm medium</SelectItem>
                        <SelectItem value="Left-arm medium">Left-arm medium</SelectItem>
                        <SelectItem value="Off-spin">Off-spin</SelectItem>
                        <SelectItem value="Leg-spin">Leg-spin</SelectItem>
                        <SelectItem value="Left-arm spin">Left-arm spin</SelectItem>
                        <SelectItem value="N/A">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleUpdate}
                      disabled={editSaving || !editForm.name.trim()}
                      data-testid={`button-save-edit-player-${member.id}`}
                    >
                      {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-5">{i + 1}</span>
                    <div>
                      <span className="font-medium text-sm">{member.name}</span>
                      {(member.battingStyle || member.bowlingStyle) && (
                        <div className="text-xs text-muted-foreground">
                          {[member.battingStyle, member.bowlingStyle].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.role && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[member.role] || "bg-muted text-muted-foreground"}`}>
                        {member.role}
                      </span>
                    )}
                    <button
                      onClick={() => startEdit(member)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      data-testid={`button-edit-player-${member.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      data-testid={`button-remove-player-${member.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleTab({ teamId }: { teamId: number }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [addingMatch, setAddingMatch] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ opponent: "", matchDate: "", venue: "", format: "T20", homeAway: "home" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingFixtureId, setEditingFixtureId] = useState<number | null>(null);
  const [editFixtureForm, setEditFixtureForm] = useState({ opponent: "", matchDate: "", venue: "", format: "T20", homeAway: "home" });
  const [editFixtureSaving, setEditFixtureSaving] = useState(false);

  const { data: fixtures = [], isLoading } = useQuery<ScheduledMatch[]>({
    queryKey: ["/api/teams", teamId, "fixtures"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamId}/fixtures`, {
        headers: { "x-user-token": getUserToken() },
      });
      return res.json();
    },
  });

  const ensureSchedule = async () => {
    const schedulesRes = await fetch(`/api/teams/${teamId}/schedules`, {
      headers: { "x-user-token": getUserToken() },
    });
    const schedules = await schedulesRes.json();
    if (schedules.length > 0) return schedules[0].id;
    const created = await apiRequest("POST", `/api/teams/${teamId}/schedules`, { seasonName: "Season 2025" });
    const s = await created.json();
    return s.id;
  };

  const handleAddMatch = async () => {
    if (!form.opponent.trim() || !form.matchDate) return;
    setSaving(true);
    try {
      const scheduleId = await ensureSchedule();
      await apiRequest("POST", `/api/schedules/${scheduleId}/fixtures`, { ...form, teamId });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "fixtures"] });
      setForm({ opponent: "", matchDate: "", venue: "", format: "T20", homeAway: "home" });
      setAddingMatch(false);
    } catch {
      toast({ title: "Failed to add fixture", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const startEditFixture = (fixture: ScheduledMatch) => {
    setEditingFixtureId(fixture.id);
    setEditFixtureForm({
      opponent: fixture.opponent,
      matchDate: fixture.matchDate || "",
      venue: fixture.venue || "",
      format: fixture.format || "T20",
      homeAway: fixture.homeAway || "home",
    });
  };

  const handleEditFixtureSave = async () => {
    if (!editingFixtureId || !editFixtureForm.opponent.trim()) return;
    setEditFixtureSaving(true);
    try {
      await apiRequest("PATCH", `/api/fixtures/${editingFixtureId}`, editFixtureForm);
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "fixtures"] });
      setEditingFixtureId(null);
      toast({ title: "Fixture updated" });
    } catch {
      toast({ title: "Failed to update fixture", variant: "destructive" });
    } finally {
      setEditFixtureSaving(false);
    }
  };

  const uploadAndExtract = async (file: File) => {
    setUploading(true);
    try {
      const urlRes = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

      const extractRes = await apiRequest("POST", "/api/extract", { imageUrl: objectPath, extractionType: "schedule" });
      const { data } = await extractRes.json();

      if (Array.isArray(data) && data.length > 0) {
        const scheduleId = await ensureSchedule();
        await apiRequest("POST", `/api/schedules/${scheduleId}/fixtures/bulk`, {
          fixtures: (data as { opponent: string; matchDate?: string; venue?: string; format?: string; homeAway?: string }[]).map(f => ({ ...f, teamId, format: f.format || "T20", homeAway: "home" })),
        });
        queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "fixtures"] });
        toast({ title: `Imported ${data.length} fixtures from schedule` });
      } else {
        toast({ title: "Could not read any fixtures from that image", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndExtract(f); }}
        />
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          data-testid="button-upload-schedule"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Reading schedule..." : "Import from image"}
        </Button>
        <Button onClick={() => setAddingMatch(true)} className="gap-2" data-testid="button-add-fixture">
          <Plus className="w-4 h-4" />
          Add fixture
        </Button>
      </div>

      {uploading && (
        <Card className="p-3 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 text-sm text-primary">
            <Loader2 className="w-4 h-4 animate-spin" />
            AI is reading your fixture list and importing matches...
          </div>
        </Card>
      )}

      {addingMatch && (
        <Card className="p-4 space-y-3">
          <p className="font-medium text-sm">Add fixture</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              autoFocus
              placeholder="Opponent *"
              value={form.opponent}
              onChange={(e) => setForm(f => ({ ...f, opponent: e.target.value }))}
              data-testid="input-opponent"
            />
            <Input
              type="date"
              value={form.matchDate}
              onChange={(e) => setForm(f => ({ ...f, matchDate: e.target.value }))}
              data-testid="input-match-date"
            />
            <Input
              placeholder="Venue"
              value={form.venue}
              onChange={(e) => setForm(f => ({ ...f, venue: e.target.value }))}
            />
            <Select value={form.format} onValueChange={(v) => setForm(f => ({ ...f, format: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="T20">T20</SelectItem>
                <SelectItem value="ODI">ODI</SelectItem>
                <SelectItem value="T10">T10</SelectItem>
                <SelectItem value="Test">Test</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAddMatch}
              disabled={saving || !form.opponent.trim()}
              data-testid="button-save-fixture"
            >
              {saving ? "Saving..." : "Add"}
            </Button>
            <Button variant="ghost" onClick={() => setAddingMatch(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : fixtures.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No fixtures yet. Add matches or import from a schedule image.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {fixtures.map((fixture) => (
            <Card key={fixture.id} className="px-4 py-3" data-testid={`fixture-card-${fixture.id}`}>
              {editingFixtureId === fixture.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      autoFocus
                      placeholder="Opponent *"
                      value={editFixtureForm.opponent}
                      onChange={(e) => setEditFixtureForm(f => ({ ...f, opponent: e.target.value }))}
                      data-testid={`input-edit-fixture-opponent-${fixture.id}`}
                    />
                    <Input
                      type="date"
                      value={editFixtureForm.matchDate}
                      onChange={(e) => setEditFixtureForm(f => ({ ...f, matchDate: e.target.value }))}
                      data-testid={`input-edit-fixture-date-${fixture.id}`}
                    />
                    <Input
                      placeholder="Venue"
                      value={editFixtureForm.venue}
                      onChange={(e) => setEditFixtureForm(f => ({ ...f, venue: e.target.value }))}
                      data-testid={`input-edit-fixture-venue-${fixture.id}`}
                    />
                    <Select value={editFixtureForm.format} onValueChange={(v) => setEditFixtureForm(f => ({ ...f, format: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="T20">T20</SelectItem>
                        <SelectItem value="ODI">ODI</SelectItem>
                        <SelectItem value="T10">T10</SelectItem>
                        <SelectItem value="Test">Test</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleEditFixtureSave}
                      disabled={editFixtureSaving || !editFixtureForm.opponent.trim()}
                      data-testid={`button-save-edit-fixture-${fixture.id}`}
                    >
                      {editFixtureSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingFixtureId(null)}
                      data-testid={`button-cancel-edit-fixture-${fixture.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">vs {fixture.opponent}</span>
                      <Badge
                        className={`text-xs ${statusColors[fixture.status || "upcoming"]}`}
                        variant="outline"
                      >
                        {fixture.status || "upcoming"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {fixture.matchDate}
                      {fixture.venue ? ` · ${fixture.venue}` : ""}
                      {" · "}{fixture.format}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => startEditFixture(fixture)}
                      data-testid={`button-edit-fixture-${fixture.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {fixture.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => navigate(`/pre-match?fixture=${fixture.id}`)}
                        data-testid={`button-plan-fixture-${fixture.id}`}
                      >
                        <Crown className="w-3 h-3" />
                        Plan
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => navigate(`/post-match?fixture=${fixture.id}`)}
                      data-testid={`button-analyse-fixture-${fixture.id}`}
                    >
                      <BarChart2 className="w-3 h-3" />
                      Analyse
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const teamId = parseInt(id || "0");

  const { data: team, isLoading } = useQuery<Team>({
    queryKey: ["/api/teams", teamId],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamId}`, {
        headers: { "x-user-token": getUserToken() },
      });
      return res.json();
    },
    enabled: !!teamId,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Team not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/teams">
            <Button variant="ghost" size="icon" data-testid="button-back-to-teams">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{team.name}</h1>
            <p className="text-sm text-muted-foreground">Manage squad and schedule</p>
          </div>
        </div>

        <Tabs defaultValue="squad">
          <TabsList className="mb-6">
            <TabsTrigger value="squad" data-testid="tab-squad">
              <Users className="w-4 h-4 mr-1.5" />
              Squad
            </TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-schedule">
              <Calendar className="w-4 h-4 mr-1.5" />
              Schedule
            </TabsTrigger>
          </TabsList>
          <TabsContent value="squad">
            <SquadTab teamId={teamId} />
          </TabsContent>
          <TabsContent value="schedule">
            <ScheduleTab teamId={teamId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
