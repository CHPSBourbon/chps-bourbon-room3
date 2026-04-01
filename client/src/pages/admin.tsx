import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Member, Event as ClubEvent, Rsvp } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldOff, Trash2, Users, CalendarDays, Settings2, LogOut, KeyRound, Lock, Plus } from "lucide-react";

// Admin auth state — stored in React state (no localStorage in sandbox)
type AdminSession = { id: number; email: string; name: string } | null;

export default function Admin() {
  const { toast } = useToast();
  const [adminSession, setAdminSession] = useState<AdminSession>(null);
  const [checkedSession, setCheckedSession] = useState(false);

  // Check if already logged in on mount
  const sessionQuery = useQuery({
    queryKey: ["/api/admin/me"],
    queryFn: async () => {
      try {
        const res = await fetch(
          ("__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__") + "/api/admin/me"
        );
        if (!res.ok) {
          setCheckedSession(true);
          return null;
        }
        const data = await res.json();
        setAdminSession(data);
        setCheckedSession(true);
        return data;
      } catch {
        setCheckedSession(true);
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (!checkedSession && sessionQuery.isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-40 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!adminSession) {
    return <AdminLogin onLogin={setAdminSession} />;
  }

  return <AdminPanel session={adminSession} onLogout={() => setAdminSession(null)} />;
}

// LOGIN SCREEN
function AdminLogin({ onLogin }: { onLogin: (session: AdminSession) => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        ("__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__") + "/api/admin/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Invalid email or password");
      }
      return res.json();
    },
    onSuccess: (data) => {
      onLogin(data);
      toast({ title: `Welcome back, ${data.name}` });
    },
    onError: (err: Error) => {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-6">
      <Card className="w-full max-w-sm bg-card border-card-border">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-serif text-xl tracking-tight" data-testid="text-admin-login-title">Admin Login</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to access the admin panel</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loginMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                data-testid="input-admin-email"
              />
            </div>
            <div>
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                data-testid="input-admin-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
              data-testid="button-admin-login"
            >
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ADMIN PANEL (authenticated)
function AdminPanel({ session, onLogout }: { session: NonNullable<AdminSession>; onLogout: () => void }) {
  const { toast } = useToast();
  const [capDialog, setCapDialog] = useState<ClubEvent | null>(null);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [capEnabled, setCapEnabled] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "", description: "", date: "", time: "",
    location: "", featuredBourbon: "", maxAttendees: "",
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<ClubEvent[]>({
    queryKey: ["/api/events"],
  });

  const toggleRoleMutation = useMutation({
    mutationFn: async ({ id, newRole }: { id: number; newRole: string }) => {
      const res = await apiRequest("PATCH", `/api/members/${id}`, { role: newRole });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update role");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Role updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Member removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/events", data);
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.message || "Failed to create event");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setCreateEventOpen(false);
      setCapEnabled(false);
      setEventForm({ title: "", description: "", date: "", time: "", location: "", featuredBourbon: "", maxAttendees: "" });
      toast({ title: "Event created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateCapMutation = useMutation({
    mutationFn: async ({ id, maxAttendees }: { id: number; maxAttendees: number | null }) => {
      const res = await apiRequest("PATCH", `/api/events/${id}`, { maxAttendees });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update capacity");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setCapDialog(null);
      toast({ title: "Capacity updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/me"] });
      onLogout();
      toast({ title: "Logged out" });
    },
  });

  if (membersLoading || eventsLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-40 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl tracking-tight" data-testid="text-page-title">
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Signed in as {session.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPasswordDialog(true)}
            className="h-8 gap-1.5"
            data-testid="button-change-password"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Password</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => logoutMutation.mutate()}
            className="h-8 gap-1.5 text-muted-foreground"
            data-testid="button-admin-logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </div>
      </div>

      {/* Member Management */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Member Management
          </h2>
        </div>

        <div className="space-y-2">
          {members.map((member) => (
            <Card key={member.id} className="bg-card border-card-border" data-testid={`admin-member-${member.id}`}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ backgroundColor: member.avatarColor + "22", color: member.avatarColor }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{member.name}</span>
                      <Badge
                        variant={member.role === "admin" ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      toggleRoleMutation.mutate({
                        id: member.id,
                        newRole: member.role === "admin" ? "member" : "admin",
                      })
                    }
                    className="h-8 px-2"
                    title={member.role === "admin" ? "Remove admin" : "Make admin"}
                    data-testid={`button-toggle-role-${member.id}`}
                  >
                    {member.role === "admin" ? (
                      <ShieldOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Shield className="w-4 h-4 text-primary" />
                    )}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-destructive hover:text-destructive"
                        data-testid={`button-delete-member-${member.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove this member and all their RSVPs. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMemberMutation.mutate(member.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Event Management */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Event Management
            </h2>
          </div>
          <Dialog open={createEventOpen} onOpenChange={setCreateEventOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-create-event">
                <Plus className="w-4 h-4 mr-2" />
                New Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif">Create Event</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createEventMutation.mutate({
                    title: eventForm.title,
                    description: eventForm.description || null,
                    date: eventForm.date,
                    time: eventForm.time,
                    location: eventForm.location,
                    featuredBourbon: eventForm.featuredBourbon || null,
                    maxAttendees: eventForm.maxAttendees ? Number(eventForm.maxAttendees) : null,
                    createdBy: session.id,
                    createdAt: new Date().toISOString(),
                  });
                }}
                className="space-y-4 mt-2"
              >
                <div>
                  <Label htmlFor="evt-title">Event Title</Label>
                  <Input id="evt-title" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Monthly Tasting" required data-testid="input-event-title" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="evt-date">Date</Label>
                    <Input id="evt-date" type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} required data-testid="input-event-date" />
                  </div>
                  <div>
                    <Label htmlFor="evt-time">Time</Label>
                    <Input id="evt-time" type="time" value={eventForm.time} onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })} required data-testid="input-event-time" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="evt-location">Location</Label>
                  <Input id="evt-location" value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} placeholder="The Bourbon Lounge" required data-testid="input-event-location" />
                </div>
                <div>
                  <Label htmlFor="evt-desc">Description (optional)</Label>
                  <Textarea id="evt-desc" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="What are we doing?" rows={2} data-testid="input-event-description" />
                </div>
                <div>
                  <Label htmlFor="evt-bourbon">Featured Bourbon (optional)</Label>
                  <Input id="evt-bourbon" value={eventForm.featuredBourbon} onChange={(e) => setEventForm({ ...eventForm, featuredBourbon: e.target.value })} placeholder="Blanton's" data-testid="input-event-bourbon" />
                </div>
                <div className="rounded-lg border border-card-border bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="evt-cap-toggle" className="text-sm font-medium">Limit Attendance</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Cap RSVPs and waitlist overflow</p>
                    </div>
                    <Switch
                      id="evt-cap-toggle"
                      checked={capEnabled}
                      onCheckedChange={(checked) => {
                        setCapEnabled(checked);
                        if (!checked) setEventForm({ ...eventForm, maxAttendees: "" });
                      }}
                      data-testid="switch-cap-toggle"
                    />
                  </div>
                  {capEnabled && (
                    <div>
                      <Label htmlFor="evt-max">Max Attendees</Label>
                      <Input id="evt-max" type="number" min="1" value={eventForm.maxAttendees} onChange={(e) => setEventForm({ ...eventForm, maxAttendees: e.target.value })} placeholder="20" data-testid="input-event-max" />
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={createEventMutation.isPending || (capEnabled && !eventForm.maxAttendees)} data-testid="button-submit-event">
                  {createEventMutation.isPending ? "Creating..." : "Create Event"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {events.length === 0 ? (
          <Card className="bg-card border-card-border">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No events yet. Create one above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <AdminEventCard
                key={event.id}
                event={event}
                onDelete={() => deleteEventMutation.mutate(event.id)}
                onEditCap={() => setCapDialog(event)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cap Editor Dialog */}
      <CapEditorDialog
        event={capDialog}
        onClose={() => setCapDialog(null)}
        onSave={(maxAttendees) => {
          if (capDialog) updateCapMutation.mutate({ id: capDialog.id, maxAttendees });
        }}
        isPending={updateCapMutation.isPending}
      />

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={passwordDialog}
        onClose={() => setPasswordDialog(false)}
      />
    </div>
  );
}

// CHANGE PASSWORD DIALOG
function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/change-password", {
        currentPassword,
        newPassword,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to change password");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = currentPassword && newPassword && newPassword === confirmPassword && newPassword.length >= 6;

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">Change Password</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) changeMutation.mutate();
          }}
          className="space-y-4 mt-2"
        >
          <div>
            <Label htmlFor="current-pw">Current Password</Label>
            <Input
              id="current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              data-testid="input-current-password"
            />
          </div>
          <div>
            <Label htmlFor="new-pw">New Password</Label>
            <Input
              id="new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              data-testid="input-new-password"
            />
          </div>
          <div>
            <Label htmlFor="confirm-pw">Confirm New Password</Label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              data-testid="input-confirm-password"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive mt-1">Passwords do not match</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={!canSubmit || changeMutation.isPending}
            data-testid="button-save-password"
          >
            {changeMutation.isPending ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminEventCard({
  event,
  onDelete,
  onEditCap,
}: {
  event: ClubEvent;
  onDelete: () => void;
  onEditCap: () => void;
}) {
  const { data: rsvps = [] } = useQuery<Rsvp[]>({
    queryKey: ["/api/events", event.id, "rsvps"],
  });

  const totalGoing = rsvps
    .filter((r) => r.status === "going")
    .reduce((sum, r) => sum + 1 + (r.bringingGuest || 0), 0);
  const waitlistCount = rsvps.filter((r) => r.status === "waitlist").length;

  // Format time to 12h
  const formatTime12h = (t: string) => {
    const [h, m] = t.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${m} ${ampm} EST`;
  };

  return (
    <Card className="bg-card border-card-border" data-testid={`admin-event-${event.id}`}>
      <CardContent className="p-3 flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{event.title}</p>
            {event.maxAttendees ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {totalGoing}/{event.maxAttendees} spots
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                No cap
              </Badge>
            )}
            {waitlistCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/15 text-amber-400 border-0">
                {waitlistCount} waitlisted
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {event.date} at {formatTime12h(event.time)} — {event.location}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            onClick={onEditCap}
            title="Edit capacity"
            data-testid={`button-edit-cap-${event.id}`}
          >
            <Settings2 className="w-4 h-4 text-muted-foreground" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-destructive hover:text-destructive"
                data-testid={`button-delete-event-${event.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{event.title}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this event and all RSVPs. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

function CapEditorDialog({
  event,
  onClose,
  onSave,
  isPending,
}: {
  event: ClubEvent | null;
  onClose: () => void;
  onSave: (maxAttendees: number | null) => void;
  isPending: boolean;
}) {
  const [capEnabled, setCapEnabled] = useState(false);
  const [capValue, setCapValue] = useState("");

  // Sync state when dialog opens with a new event
  const [lastEventId, setLastEventId] = useState<number | null>(null);
  if (event && event.id !== lastEventId) {
    setLastEventId(event.id);
    setCapEnabled(!!event.maxAttendees);
    setCapValue(event.maxAttendees ? String(event.maxAttendees) : "");
  }

  const { data: rsvps = [] } = useQuery<Rsvp[]>({
    queryKey: ["/api/events", event?.id, "rsvps"],
    enabled: !!event,
  });

  const totalGoing = rsvps
    .filter((r) => r.status === "going")
    .reduce((sum, r) => sum + 1 + (r.bringingGuest || 0), 0);
  const waitlistCount = rsvps.filter((r) => r.status === "waitlist").length;

  return (
    <Dialog open={!!event} onOpenChange={() => { onClose(); setLastEventId(null); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">Capacity: {event?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {(totalGoing > 0 || waitlistCount > 0) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {totalGoing > 0 && <span>{totalGoing} going (incl. guests)</span>}
              {waitlistCount > 0 && <span className="text-amber-400">{waitlistCount} waitlisted</span>}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Limit Attendance</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Cap RSVPs and waitlist overflow</p>
            </div>
            <Switch
              checked={capEnabled}
              onCheckedChange={(checked) => {
                setCapEnabled(checked);
                if (!checked) setCapValue("");
              }}
              data-testid="switch-edit-cap-toggle"
            />
          </div>
          {capEnabled && (
            <div>
              <Label htmlFor="edit-max">Max Attendees</Label>
              <Input
                id="edit-max"
                type="number"
                min="1"
                value={capValue}
                onChange={(e) => setCapValue(e.target.value)}
                placeholder="20"
                data-testid="input-edit-cap-value"
              />
              {capValue && Number(capValue) < totalGoing && (
                <p className="text-xs text-amber-400 mt-1">
                  {totalGoing} people are already going (incl. guests). Lowering the cap won't remove them but will prevent new RSVPs.
                </p>
              )}
            </div>
          )}
          <Button
            className="w-full"
            disabled={isPending || (capEnabled && !capValue)}
            onClick={() => onSave(capEnabled && capValue ? Number(capValue) : null)}
            data-testid="button-save-cap"
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
