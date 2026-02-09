import { useState, useCallback } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeProvider } from "@/lib/theme";
import { ChatPage } from "@/pages/chat";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AppMode, Conversation } from "@shared/schema";

function MainApp() {
  const [mode, setMode] = useState<AppMode>("captain");
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const handleModeChange = useCallback((newMode: AppMode) => {
    setMode(newMode);
    setActiveConversationId(null);
  }, []);

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  const handleDeleteConversation = useCallback(async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/conversations/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
      toast({ title: "Conversation deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  }, [activeConversationId, toast]);

  const handleConversationCreated = useCallback((id: number) => {
    setActiveConversationId(id);
  }, []);

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          mode={mode}
          onModeChange={handleModeChange}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          isLoading={isLoading}
        />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b border-border sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-hidden">
            <ChatPage
              mode={mode}
              conversationId={activeConversationId}
              onConversationCreated={handleConversationCreated}
            />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <MainApp />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
