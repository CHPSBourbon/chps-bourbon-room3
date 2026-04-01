import { createContext, useContext } from "react";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Dashboard from "@/pages/dashboard";
import Members from "@/pages/members";
import Events from "@/pages/events";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import { useAuth, type MemberSession } from "@/hooks/use-auth";

type AuthContextType = ReturnType<typeof useAuth>;

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/members" component={Members} />
      <Route path="/events" component={Events} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

const sidebarStyle = {
  "--sidebar-width": "16rem",
  "--sidebar-width-icon": "3rem",
};

function App() {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router hook={useHashLocation}>
            <SidebarProvider style={sidebarStyle as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-w-0">
                  <header className="flex items-center h-12 px-3 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                  </header>
                  <main className="flex-1 overflow-auto">
                    <AppRouter />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </Router>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

export default App;
