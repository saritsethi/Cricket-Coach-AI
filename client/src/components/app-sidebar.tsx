import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Crown, BarChart2, MessageSquare, Trash2, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Conversation } from "@shared/schema";

const captainNavItems = [
  { label: "My Teams", href: "/teams", Icon: Trophy },
  { label: "Pre-Match Planning", href: "/pre-match", Icon: Crown },
  { label: "Post-Match Analysis", href: "/post-match", Icon: BarChart2 },
];

const playerNavItems = [
  { label: "Player Coaching", href: "/player", Icon: GraduationCap },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { toast } = useToast();

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const recentConversations = conversations.slice(0, 8);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await apiRequest("DELETE", `/api/conversations/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const modeIcons: Record<string, typeof Crown> = {
    "pre-match": Crown,
    "post-match": BarChart2,
    "player": MessageSquare,
    "captain": Crown,
    "skills": MessageSquare,
    "equipment": MessageSquare,
  };

  function NavItem({ label, href, Icon }: { label: string; href: string; Icon: typeof Crown }) {
    const isActive = location === href || (href !== "/" && location.startsWith(href));
    return (
      <Link href={href}>
        <div
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors ${
            isActive
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          data-testid={`nav-${href.slice(1) || "home"}`}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span>{label}</span>
        </div>
      </Link>
    );
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/teams">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground font-bold text-sm">
              C
            </div>
            <div>
              <div className="font-semibold text-sm">CricketIQ</div>
              <div className="text-xs text-muted-foreground">AI Cricket Intelligence</div>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Captain</SidebarGroupLabel>
          <SidebarGroupContent>
            <nav className="flex flex-col gap-1 px-2">
              {captainNavItems.map(({ label, href, Icon }) => (
                <NavItem key={href} label={label} href={href} Icon={Icon} />
              ))}
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Player</SidebarGroupLabel>
          <SidebarGroupContent>
            <nav className="flex flex-col gap-1 px-2">
              {playerNavItems.map(({ label, href, Icon }) => (
                <NavItem key={href} label={label} href={href} Icon={Icon} />
              ))}
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>

        {(recentConversations.length > 0 || isLoading) && (
          <>
            <SidebarSeparator />
            <SidebarGroup className="flex-1 min-h-0">
              <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
              <SidebarGroupContent className="flex-1 min-h-0">
                <div className="flex flex-col overflow-y-auto px-2 pb-2">
                  {isLoading ? (
                    <div className="flex flex-col gap-2 p-1">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full rounded-md" />)}
                    </div>
                  ) : (
                    recentConversations.map((conv) => {
                      const ModeIcon = modeIcons[conv.mode] || MessageSquare;
                      return (
                        <div
                          key={conv.id}
                          className="group flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted cursor-default transition-colors"
                          data-testid={`conversation-item-${conv.id}`}
                        >
                          <ModeIcon className="w-3 h-3 shrink-0" />
                          <span className="truncate flex-1">{conv.title}</span>
                          <button
                            onClick={(e) => handleDelete(e, conv.id)}
                            className="invisible group-hover:visible text-muted-foreground hover:text-destructive transition-colors"
                            data-testid={`button-delete-conversation-${conv.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="text-xs text-muted-foreground text-center">
          Powered by AI Cricket Analytics
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
