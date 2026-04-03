import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, getUserToken } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeProvider } from "@/lib/theme";
import { Router, Switch, Route, Redirect } from "wouter";
import { TeamsPage } from "@/pages/teams";
import { TeamDetailPage } from "@/pages/team-detail";
import { PreMatchPage } from "@/pages/pre-match";
import { PostMatchPage } from "@/pages/post-match";
import { PlayerAnalysisPage } from "@/pages/player-analysis";
import { PlayerCoachingPage } from "@/pages/player-coaching";
import NotFound from "@/pages/not-found";

// Ensure userToken is generated deterministically on first app module load
getUserToken();

const style = {
  "--sidebar-width": "16rem",
  "--sidebar-width-icon": "3rem",
};

function CaptainLayout() {
  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <header className="flex items-center justify-between gap-2 p-2 border-b border-border sticky top-0 z-50 bg-background shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            <Switch>
              <Route path="/teams" component={TeamsPage} />
              <Route path="/teams/:id" component={TeamDetailPage} />
              <Route path="/pre-match" component={PreMatchPage} />
              <Route path="/post-match" component={PostMatchPage} />
              <Route path="/player" component={PlayerCoachingPage} />
              <Route path="/">
                <Redirect to="/teams" />
              </Route>
              <Route component={NotFound} />
            </Switch>
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
          <Router>
            <Switch>
              <Route path="/analysis/:shareToken" component={PlayerAnalysisPage} />
              <Route component={CaptainLayout} />
            </Switch>
          </Router>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
