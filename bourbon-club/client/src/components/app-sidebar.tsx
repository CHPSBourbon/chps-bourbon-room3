import { useState } from "react";
import { Users, CalendarDays, LayoutDashboard, Settings, Wine, LogOut, KeyRound, LogIn, UserPlus } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/App";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Members", url: "/members", icon: Users },
  { title: "Events", url: "/events", icon: CalendarDays },
  { title: "Admin", url: "/admin", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const auth = useAuthContext();
  const { toast } = useToast();
  const [pwDialog, setPwDialog] = useState(false);
  const [authDialog, setAuthDialog] = useState(false);

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3 group" data-testid="link-home">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
            <Wine className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-medium tracking-tight text-sidebar-foreground leading-none">
              CHPS
            </h1>
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mt-0.5">
              Bourbon Room
            </p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {auth.member ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary">
                {auth.member.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{auth.member.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{auth.member.email}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 flex-1 text-[10px] gap-1 text-muted-foreground"
                onClick={() => setPwDialog(true)}
                data-testid="button-member-change-password"
              >
                <KeyRound className="w-3 h-3" />
                Password
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 flex-1 text-[10px] gap-1 text-muted-foreground"
                onClick={async () => {
                  await auth.logout();
                  toast({ title: "Signed out" });
                }}
                data-testid="button-member-logout"
              >
                <LogOut className="w-3 h-3" />
                Sign out
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 flex-1 text-xs gap-1.5 text-muted-foreground"
              onClick={() => setAuthDialog(true)}
              data-testid="button-sign-in-prompt"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign in
            </Button>
            <Button
              size="sm"
              variant="default"
              className="h-8 flex-1 text-xs gap-1.5"
              onClick={() => setAuthDialog(true)}
              data-testid="button-sign-up-prompt"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Sign up
            </Button>
          </div>
        )}
      </SidebarFooter>

      <ChangePasswordDialog open={pwDialog} onClose={() => setPwDialog(false)} />
      <AuthDialog open={authDialog} onClose={() => setAuthDialog(false)} auth={auth} />
    </Sidebar>
  );
}

// Auth dialog — login or register
function AuthDialog({
  open,
  onClose,
  auth,
}: {
  open: boolean;
  onClose: () => void;
  auth: ReturnType<typeof useAuthContext>;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [favoriteBourbons, setFavoriteBourbons] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setEmail("");
    setPassword("");
    setName("");
    setPhone("");
    setFavoriteBourbons("");
    setMode("login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await auth.login(email, password);
        toast({ title: "Welcome back" });
      } else {
        await auth.register({ name, email, password, phone: phone || undefined, favoriteBourbons: favoriteBourbons || undefined });
        toast({ title: "Account created", description: "You can now RSVP to events." });
      }
      reset();
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); reset(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {mode === "login" ? "Sign In" : "Create an Account"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {mode === "register" && (
            <div>
              <Label htmlFor="sidebar-auth-name">Name</Label>
              <Input id="sidebar-auth-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required data-testid="input-sidebar-auth-name" />
            </div>
          )}
          <div>
            <Label htmlFor="sidebar-auth-email">Email</Label>
            <Input id="sidebar-auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required data-testid="input-sidebar-auth-email" />
          </div>
          <div>
            <Label htmlFor="sidebar-auth-password">Password</Label>
            <Input id="sidebar-auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "register" ? "At least 6 characters" : "••••••••"} required data-testid="input-sidebar-auth-password" />
          </div>
          {mode === "register" && (
            <>
              <div>
                <Label htmlFor="sidebar-auth-phone">Phone (optional)</Label>
                <Input id="sidebar-auth-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" data-testid="input-sidebar-auth-phone" />
              </div>
              <div>
                <Label htmlFor="sidebar-auth-bourbons">Favorite Bourbons (optional)</Label>
                <Input id="sidebar-auth-bourbons" value={favoriteBourbons} onChange={(e) => setFavoriteBourbons(e.target.value)} placeholder="Buffalo Trace, Maker's Mark..." data-testid="input-sidebar-auth-bourbons" />
              </div>
            </>
          )}
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-sidebar-auth-submit">
            {loading ? (mode === "login" ? "Signing in..." : "Creating account...") : mode === "login" ? "Sign In" : "Create Account"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button type="button" className="text-primary hover:underline" onClick={() => setMode("register")} data-testid="button-sidebar-switch-register">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" className="text-primary hover:underline" onClick={() => setMode("login")} data-testid="button-sidebar-switch-login">
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { changePassword } = useAuthContext();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = currentPassword && newPassword && newPassword === confirmPassword && newPassword.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast({ title: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">Change Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="member-current-pw">Current Password</Label>
            <Input id="member-current-pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required data-testid="input-member-current-password" />
          </div>
          <div>
            <Label htmlFor="member-new-pw">New Password</Label>
            <Input id="member-new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" required data-testid="input-member-new-password" />
          </div>
          <div>
            <Label htmlFor="member-confirm-pw">Confirm New Password</Label>
            <Input id="member-confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required data-testid="input-member-confirm-password" />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive mt-1">Passwords do not match</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={!canSubmit || loading} data-testid="button-member-save-password">
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
