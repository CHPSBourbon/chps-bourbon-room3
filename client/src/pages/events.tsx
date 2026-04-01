import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Event as ClubEvent, Member, Rsvp } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { useAuthContext } from "@/App";
import { Plus, MapPin, Clock, Users, Wine, CalendarDays, Check, HelpCircle, AlertCircle, LogIn, UserPlus, Lock } from "lucide-react";
import { format, parseISO, isAfter, isBefore } from "date-fns";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

export default function Events() {
  const { toast } = useToast();
  const auth = useAuthContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [authDialog, setAuthDialog] = useState<{ eventId: number } | null>(null);
  const [capEnabled, setCapEnabled] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    featuredBourbon: "",
    maxAttendees: "",
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<ClubEvent[]>({
    queryKey: ["/api/events"],
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/events", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setDialogOpen(false);
      setCapEnabled(false);
      setFormData({ title: "", description: "", date: "", time: "", location: "", featuredBourbon: "", maxAttendees: "" });
      toast({ title: "Event created", description: "New event has been scheduled." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: number; status: string }) => {
      const res = await fetch(`${API_BASE}/api/events/${eventId}/rsvps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "RSVP failed");
      }
      return res.json();
    },
    onSuccess: (data: Record<string, unknown>, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", variables.eventId, "rsvps"] });
      if (data._waitlisted) {
        toast({ title: "Added to waitlist", description: "This event is full. You've been placed on the waitlist." });
      } else {
        toast({ title: "RSVP recorded" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const cancelRsvpMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await fetch(`${API_BASE}/api/events/${eventId}/rsvps`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to cancel RSVP");
      }
    },
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "rsvps"] });
      toast({ title: "RSVP cancelled" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const now = new Date();
  const upcoming = events
    .filter((e) => isAfter(parseISO(e.date), now) || e.date === format(now, "yyyy-MM-dd"))
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = events
    .filter((e) => isBefore(parseISO(e.date), now) && e.date !== format(now, "yyyy-MM-dd"))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (eventsLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl tracking-tight" data-testid="text-page-title">Events</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tastings, gatherings, and bottle shares
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                createMutation.mutate({
                  title: formData.title,
                  description: formData.description || null,
                  date: formData.date,
                  time: formData.time,
                  location: formData.location,
                  featuredBourbon: formData.featuredBourbon || null,
                  maxAttendees: formData.maxAttendees ? Number(formData.maxAttendees) : null,
                  createdBy: auth.member?.id || 1,
                  createdAt: new Date().toISOString(),
                });
              }}
              className="space-y-4 mt-2"
            >
              <div>
                <Label htmlFor="title">Event Title</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Monthly Tasting" required data-testid="input-event-title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required data-testid="input-event-date" />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} required data-testid="input-event-time" />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="The Bourbon Lounge" required data-testid="input-event-location" />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="What are we doing?" rows={2} data-testid="input-event-description" />
              </div>
              <div>
                <Label htmlFor="bourbon">Featured Bourbon</Label>
                <Input id="bourbon" value={formData.featuredBourbon} onChange={(e) => setFormData({ ...formData, featuredBourbon: e.target.value })} placeholder="Blanton's" data-testid="input-event-bourbon" />
              </div>
              <div className="rounded-lg border border-card-border bg-muted/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="cap-toggle" className="text-sm font-medium">Limit Attendance</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Cap RSVPs and waitlist overflow</p>
                  </div>
                  <Switch
                    id="cap-toggle"
                    checked={capEnabled}
                    onCheckedChange={(checked) => {
                      setCapEnabled(checked);
                      if (!checked) setFormData({ ...formData, maxAttendees: "" });
                    }}
                    data-testid="switch-cap-toggle"
                  />
                </div>
                {capEnabled && (
                  <div>
                    <Label htmlFor="max">Max Attendees</Label>
                    <Input id="max" type="number" min="1" value={formData.maxAttendees} onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })} placeholder="20" data-testid="input-event-max" />
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || (capEnabled && !formData.maxAttendees)} data-testid="button-submit-event">
                {createMutation.isPending ? "Creating..." : "Create Event"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Auth Dialog for RSVP */}
      <AuthDialog open={!!authDialog} onClose={() => setAuthDialog(null)} auth={auth} />

      {/* Upcoming Events */}
      <div>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <Card className="bg-card border-card-border">
            <CardContent className="p-8 text-center">
              <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                members={members}
                currentMemberId={auth.member?.id}
                onRsvp={(status) => {
                  if (!auth.member) {
                    setAuthDialog({ eventId: event.id });
                    return;
                  }
                  rsvpMutation.mutate({ eventId: event.id, status });
                }}
                onCancel={() => cancelRsvpMutation.mutate(event.id)}
                rsvpPending={rsvpMutation.isPending}
                cancelPending={cancelRsvpMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Past Events */}
      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
            Past
          </h2>
          <div className="space-y-3 opacity-70">
            {past.map((event) => (
              <EventCard key={event.id} event={event} members={members} isPast />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Auth dialog — login or register to RSVP
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
        toast({ title: `Welcome back` });
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
            {mode === "login" ? "Sign in to RSVP" : "Create an Account"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {mode === "register" && (
            <>
              <div>
                <Label htmlFor="auth-name">Name</Label>
                <Input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required data-testid="input-auth-name" />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="auth-email">Email</Label>
            <Input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required data-testid="input-auth-email" />
          </div>
          <div>
            <Label htmlFor="auth-password">Password</Label>
            <Input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "register" ? "At least 6 characters" : "••••••••"} required data-testid="input-auth-password" />
          </div>
          {mode === "register" && (
            <>
              <div>
                <Label htmlFor="auth-phone">Phone (optional)</Label>
                <Input id="auth-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" data-testid="input-auth-phone" />
              </div>
              <div>
                <Label htmlFor="auth-bourbons">Favorite Bourbons (optional)</Label>
                <Input id="auth-bourbons" value={favoriteBourbons} onChange={(e) => setFavoriteBourbons(e.target.value)} placeholder="Buffalo Trace, Maker's Mark..." data-testid="input-auth-bourbons" />
              </div>
            </>
          )}
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-auth-submit">
            {loading ? (mode === "login" ? "Signing in..." : "Creating account...") : mode === "login" ? "Sign In" : "Create Account"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button type="button" className="text-primary hover:underline" onClick={() => setMode("register")} data-testid="button-switch-register">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" className="text-primary hover:underline" onClick={() => setMode("login")} data-testid="button-switch-login">
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

function EventCard({
  event,
  members,
  isPast,
  currentMemberId,
  onRsvp,
  onCancel,
  rsvpPending,
  cancelPending,
}: {
  event: ClubEvent;
  members: Member[];
  isPast?: boolean;
  currentMemberId?: number;
  onRsvp?: (status: string) => void;
  onCancel?: () => void;
  rsvpPending?: boolean;
  cancelPending?: boolean;
}) {
  const { data: rsvps = [] } = useQuery<Rsvp[]>({
    queryKey: ["/api/events", event.id, "rsvps"],
  });

  const goingCount = rsvps.filter((r) => r.status === "going").length;
  const maybeCount = rsvps.filter((r) => r.status === "maybe").length;
  const waitlistCount = rsvps.filter((r) => r.status === "waitlist").length;
  const isFull = event.maxAttendees ? goingCount >= event.maxAttendees : false;
  const spotsLeft = event.maxAttendees ? Math.max(0, event.maxAttendees - goingCount) : null;

  // Current user's RSVP status
  const myRsvp = currentMemberId ? rsvps.find((r) => r.memberId === currentMemberId) : null;

  // Get names of going members
  const goingMembers = rsvps
    .filter((r) => r.status === "going")
    .map((r) => members.find((m) => m.id === r.memberId)?.name)
    .filter(Boolean);

  return (
    <Card className="bg-card border-card-border" data-testid={`card-event-${event.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="text-center min-w-[52px] pt-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {format(parseISO(event.date), "MMM")}
              </p>
              <p className="text-xl font-semibold text-primary leading-none mt-0.5">
                {format(parseISO(event.date), "d")}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {format(parseISO(event.date), "EEE")}
              </p>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">{event.title}</h3>
                {isFull && !isPast && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/15 text-amber-400 border-0" data-testid={`badge-full-${event.id}`}>
                    Full
                  </Badge>
                )}
              </div>
              {event.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" /> {event.time}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" /> {event.location}
                </span>
                {event.featuredBourbon && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Wine className="w-3 h-3" /> {event.featuredBourbon}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2">
                {goingCount > 0 && (
                  <span className="flex items-center gap-1 text-xs">
                    <Check className="w-3 h-3 text-green-500" />
                    <span className="text-muted-foreground">
                      {goingCount} going{event.maxAttendees ? `/${event.maxAttendees}` : ""}
                    </span>
                  </span>
                )}
                {maybeCount > 0 && (
                  <span className="flex items-center gap-1 text-xs">
                    <HelpCircle className="w-3 h-3 text-yellow-500" />
                    <span className="text-muted-foreground">{maybeCount} maybe</span>
                  </span>
                )}
                {waitlistCount > 0 && (
                  <span className="flex items-center gap-1 text-xs" data-testid={`text-waitlist-${event.id}`}>
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-400">{waitlistCount} waitlisted</span>
                  </span>
                )}
                {spotsLeft !== null && spotsLeft > 0 && !isPast && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" /> {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
                  </span>
                )}
              </div>
              {/* Show who's going */}
              {goingMembers.length > 0 && (
                <p className="text-[11px] text-muted-foreground/70 mt-1.5">
                  {goingMembers.slice(0, 5).join(", ")}
                  {goingMembers.length > 5 ? ` +${goingMembers.length - 5} more` : ""}
                </p>
              )}
            </div>
          </div>
          {/* RSVP buttons */}
          {!isPast && onRsvp && (
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              {myRsvp ? (
                <>
                  <Badge
                    variant={myRsvp.status === "going" ? "default" : myRsvp.status === "waitlist" ? "secondary" : "outline"}
                    className={`text-[10px] justify-center ${myRsvp.status === "waitlist" ? "bg-amber-500/15 text-amber-400 border-0" : ""}`}
                  >
                    {myRsvp.status === "going" ? "Going" : myRsvp.status === "maybe" ? "Maybe" : myRsvp.status === "waitlist" ? "Waitlisted" : myRsvp.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px] text-muted-foreground"
                    onClick={onCancel}
                    disabled={cancelPending}
                    data-testid={`button-cancel-rsvp-${event.id}`}
                  >
                    {cancelPending ? "..." : "Cancel"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8"
                    onClick={() => onRsvp("going")}
                    disabled={rsvpPending}
                    data-testid={`button-rsvp-going-${event.id}`}
                  >
                    {isFull ? "Waitlist" : "Going"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px] text-muted-foreground"
                    onClick={() => onRsvp("maybe")}
                    disabled={rsvpPending}
                    data-testid={`button-rsvp-maybe-${event.id}`}
                  >
                    Maybe
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
