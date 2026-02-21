import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ModeSelector } from "./mode-selector";
import { ConversationList } from "./conversation-list";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Conversation, AppMode } from "@shared/schema";

interface AppSidebarProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  conversations: Conversation[];
  activeConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: number) => void;
  isLoading: boolean;
  userName?: string;
  onLogout?: () => void;
}

export function AppSidebar({
  mode,
  onModeChange,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isLoading,
  userName,
  onLogout,
}: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground font-bold text-sm">
            C
          </div>
          <div>
            <div className="font-semibold text-sm">CricketIQ</div>
            <div className="text-xs text-muted-foreground">AI Cricket Intelligence</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Mode</SidebarGroupLabel>
          <SidebarGroupContent>
            <ModeSelector activeMode={mode} onModeChange={onModeChange} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup className="flex-1 min-h-0">
          <SidebarGroupLabel>Conversations</SidebarGroupLabel>
          <SidebarGroupContent className="flex-1 min-h-0">
            <ConversationList
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={onSelectConversation}
              onNew={onNewConversation}
              onDelete={onDeleteConversation}
              isLoading={isLoading}
              mode={mode}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        {userName && onLogout ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate" data-testid="text-sidebar-user">
                {userName}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={onLogout}
              data-testid="button-sidebar-logout"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center">
            Powered by AI Cricket Analytics
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
