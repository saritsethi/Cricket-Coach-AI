import { useState, useMemo } from "react";
import { getRandomPrompts, type AppMode } from "@shared/schema";
import {
  Target, Zap, TrendingUp, RotateCcw, CloudRain,
  Swords, Flame, Eye, Hand,
  Award, Footprints, Shield, Settings, Circle,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, typeof Target> = {
  target: Target,
  zap: Zap,
  "trending-up": TrendingUp,
  "rotate-ccw": RotateCcw,
  "cloud-rain": CloudRain,
  swords: Swords,
  flame: Flame,
  eye: Eye,
  hand: Hand,
  award: Award,
  footprints: Footprints,
  shield: Shield,
  settings: Settings,
  circle: Circle,
};

interface PromptSuggestionsProps {
  mode: AppMode;
  onSelect: (prompt: string) => void;
}

export function PromptSuggestions({ mode, onSelect }: PromptSuggestionsProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const prompts = useMemo(() => {
    return getRandomPrompts(mode, 5);
  }, [mode, refreshKey]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {prompts.map((item, index) => {
          const Icon = iconMap[item.icon] || Target;
          return (
            <button
              key={`${refreshKey}-${index}`}
              onClick={() => onSelect(item.prompt)}
              data-testid={`button-prompt-${mode}-${index}`}
              className="flex items-start gap-3 rounded-md border border-border p-4 text-left hover-elevate active-elevate-2 transition-colors"
            >
              <div className="flex items-center justify-center rounded-md bg-primary/10 p-2 shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-foreground leading-snug">{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-center mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRefreshKey(k => k + 1)}
          data-testid="button-refresh-prompts"
          className="text-muted-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Show different suggestions
        </Button>
      </div>
    </div>
  );
}
