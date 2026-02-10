import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, Users, User } from "lucide-react";
import type { AppMode } from "@shared/schema";

export interface CaptainContext {
  squad: string;
  opponent: string;
  matchFormat: string;
}

export interface SkillsProfile {
  battingStyle: string;
  bowlingStyle: string;
  handedness: string;
  role: string;
  level: string;
}

const CAPTAIN_STORAGE_KEY = "cricketiq_captain_context";
const SKILLS_STORAGE_KEY = "cricketiq_skills_profile";

function loadCaptainContext(): CaptainContext {
  try {
    const stored = localStorage.getItem(CAPTAIN_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { squad: "", opponent: "", matchFormat: "" };
}

function loadSkillsProfile(): SkillsProfile {
  try {
    const stored = localStorage.getItem(SKILLS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { battingStyle: "", bowlingStyle: "", handedness: "", role: "", level: "" };
}

export function getCaptainContextString(): string {
  const ctx = loadCaptainContext();
  const parts: string[] = [];
  if (ctx.squad) parts.push(`My squad: ${ctx.squad}`);
  if (ctx.opponent) parts.push(`Opponent: ${ctx.opponent}`);
  if (ctx.matchFormat) parts.push(`Format: ${ctx.matchFormat}`);
  return parts.length > 0 ? `[CAPTAIN CONTEXT] ${parts.join(" | ")}` : "";
}

export function getSkillsProfileString(): string {
  const profile = loadSkillsProfile();
  const parts: string[] = [];
  if (profile.handedness) parts.push(`${profile.handedness}-handed`);
  if (profile.role) parts.push(`Role: ${profile.role}`);
  if (profile.battingStyle) parts.push(`Batting: ${profile.battingStyle}`);
  if (profile.bowlingStyle) parts.push(`Bowling: ${profile.bowlingStyle}`);
  if (profile.level) parts.push(`Level: ${profile.level}`);
  return parts.length > 0 ? `[PLAYER PROFILE] ${parts.join(" | ")}` : "";
}

interface ContextPanelProps {
  mode: AppMode;
}

export function ContextPanel({ mode }: ContextPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [captainCtx, setCaptainCtx] = useState<CaptainContext>(loadCaptainContext);
  const [skillsProfile, setSkillsProfile] = useState<SkillsProfile>(loadSkillsProfile);

  useEffect(() => {
    localStorage.setItem(CAPTAIN_STORAGE_KEY, JSON.stringify(captainCtx));
  }, [captainCtx]);

  useEffect(() => {
    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(skillsProfile));
  }, [skillsProfile]);

  if (mode === "equipment") return null;

  const hasData = mode === "captain"
    ? !!(captainCtx.squad || captainCtx.opponent || captainCtx.matchFormat)
    : !!(skillsProfile.battingStyle || skillsProfile.bowlingStyle || skillsProfile.handedness || skillsProfile.role || skillsProfile.level);

  const summaryText = mode === "captain"
    ? [captainCtx.matchFormat, captainCtx.opponent ? `vs ${captainCtx.opponent}` : ""].filter(Boolean).join(" ") || "Set squad & opponent"
    : [skillsProfile.handedness ? `${skillsProfile.handedness}-handed` : "", skillsProfile.role].filter(Boolean).join(" ") || "Set your profile";

  return (
    <div className="px-4 pt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left text-xs text-muted-foreground hover-elevate rounded-md px-2 py-1.5"
        data-testid={`button-toggle-context-${mode}`}
      >
        {mode === "captain" ? <Users className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
        <span className="flex-1 truncate">
          {hasData && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1.5 align-middle" />
          )}
          {summaryText}
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <Card className="mt-2 p-3">
          {mode === "captain" ? (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Format</label>
                <Select
                  value={captainCtx.matchFormat}
                  onValueChange={(v) => setCaptainCtx(prev => ({ ...prev, matchFormat: v }))}
                >
                  <SelectTrigger className="h-8 text-xs" data-testid="select-match-format">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="T20">T20</SelectItem>
                    <SelectItem value="ODI">ODI</SelectItem>
                    <SelectItem value="Test">Test</SelectItem>
                    <SelectItem value="T10">T10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Squad (key players, roles)</label>
                <Textarea
                  value={captainCtx.squad}
                  onChange={(e) => setCaptainCtx(prev => ({ ...prev, squad: e.target.value }))}
                  placeholder="e.g., 3 pace bowlers, 2 spinners, top order has 2 left-handers..."
                  rows={2}
                  className="text-xs resize-none"
                  data-testid="input-squad"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Opponent info</label>
                <Input
                  value={captainCtx.opponent}
                  onChange={(e) => setCaptainCtx(prev => ({ ...prev, opponent: e.target.value }))}
                  placeholder="e.g., Strong opening pair, weak against spin..."
                  className="h-8 text-xs"
                  data-testid="input-opponent"
                />
              </div>
              {hasData && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs w-full"
                  onClick={() => setCaptainCtx({ squad: "", opponent: "", matchFormat: "" })}
                  data-testid="button-clear-captain-context"
                >
                  Clear
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Handedness</label>
                  <Select
                    value={skillsProfile.handedness}
                    onValueChange={(v) => setSkillsProfile(prev => ({ ...prev, handedness: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs" data-testid="select-handedness">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Right">Right</SelectItem>
                      <SelectItem value="Left">Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
                  <Select
                    value={skillsProfile.role}
                    onValueChange={(v) => setSkillsProfile(prev => ({ ...prev, role: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs" data-testid="select-role">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Batter">Batter</SelectItem>
                      <SelectItem value="Bowler">Bowler</SelectItem>
                      <SelectItem value="All-rounder">All-rounder</SelectItem>
                      <SelectItem value="Wicketkeeper">Wicketkeeper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Batting style</label>
                  <Select
                    value={skillsProfile.battingStyle}
                    onValueChange={(v) => setSkillsProfile(prev => ({ ...prev, battingStyle: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs" data-testid="select-batting-style">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aggressive">Aggressive</SelectItem>
                      <SelectItem value="Defensive">Defensive</SelectItem>
                      <SelectItem value="Anchor">Anchor</SelectItem>
                      <SelectItem value="Finisher">Finisher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Bowling style</label>
                  <Select
                    value={skillsProfile.bowlingStyle}
                    onValueChange={(v) => setSkillsProfile(prev => ({ ...prev, bowlingStyle: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs" data-testid="select-bowling-style">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fast">Fast</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Off-spin">Off-spin</SelectItem>
                      <SelectItem value="Leg-spin">Leg-spin</SelectItem>
                      <SelectItem value="Left-arm spin">Left-arm spin</SelectItem>
                      <SelectItem value="None">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Level</label>
                <Select
                  value={skillsProfile.level}
                  onValueChange={(v) => setSkillsProfile(prev => ({ ...prev, level: v }))}
                >
                  <SelectTrigger className="h-8 text-xs" data-testid="select-level">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Club">Club</SelectItem>
                    <SelectItem value="District">District</SelectItem>
                    <SelectItem value="Professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasData && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs w-full"
                  onClick={() => setSkillsProfile({ battingStyle: "", bowlingStyle: "", handedness: "", role: "", level: "" })}
                  data-testid="button-clear-skills-profile"
                >
                  Clear
                </Button>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
