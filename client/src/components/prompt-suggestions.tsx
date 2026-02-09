import { PRE_CANNED_PROMPTS, type AppMode } from "@shared/schema";
import {
  Target, Zap, TrendingUp, RotateCcw, CloudRain,
  Swords, Flame, Eye, Hand,
  Award, Footprints, Shield, Settings, Circle
} from "lucide-react";

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
  const prompts = PRE_CANNED_PROMPTS[mode];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
      {prompts.map((item, index) => {
        const Icon = iconMap[item.icon] || Target;
        return (
          <button
            key={index}
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
  );
}
