import { useState } from "react";
import { Users, CalendarDays, LayoutDashboard, Settings, Wine, LogOut, KeyRound, LogIn } from "lucide-react";
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
  const { member, logout } = useAuthContext();
  const { toast } = useToast();
  const [pwDialog, setPwDialog] = useState(false);

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
        {member ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{member.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
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
                  await logout();
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
          <Link href="/events">
            <Button
              size="sm"
              variant="ghost"
              className="w-full h-8 text-xs gap-1.5 text-muted-foreground"
              data-testid="button-sign-in-prompt"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign in to RSVP
            </Button>
          </Link>
        )}
      </SidebarFooter>

      <ChangePasswordDialog open={pwDialog} onClose={() => setPwDialog(false)} />
    </Sidebar>
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
