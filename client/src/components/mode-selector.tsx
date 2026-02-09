import { Crown, Swords, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { AppMode } from "@shared/schema";

const modes: { key: AppMode; label: string; description: string; Icon: typeof Crown }[] = [
  {
    key: "captain",
    label: "Captain's Strategy",
    description: "Tactical field placements, bowling changes, and match-winning strategies",
    Icon: Crown,
  },
  {
    key: "skills",
    label: "Skill Building",
    description: "Technique analysis, drills, and performance improvement guidance",
    Icon: Swords,
  },
  {
    key: "equipment",
    label: "Equipment Review",
    description: "Expert reviews, comparisons, and recommendations for cricket gear",
    Icon: ShieldCheck,
  },
];

interface ModeSelectorProps {
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function ModeSelector({ activeMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5 p-3">
      {modes.map(({ key, label, description, Icon }) => {
        const isActive = activeMode === key;
        return (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            data-testid={`button-mode-${key}`}
            className={`
              relative flex items-start gap-3 rounded-md p-3 text-left transition-colors
              toggle-elevate ${isActive ? "toggle-elevated" : ""}
              hover-elevate
            `}
          >
            <div
              className={`
                flex items-center justify-center rounded-md p-2 shrink-0
                ${isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
                }
              `}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
