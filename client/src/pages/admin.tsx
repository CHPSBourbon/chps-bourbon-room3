import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Member, Event as ClubEvent, Rsvp } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldOff, Trash2, Users, CalendarDays, Settings2 } from "lucide-react";

export default function Admin() {
  const { toast } = useToast();

  const { data: members = [], isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<ClubEvent[]>({
    queryKey: ["/api/events"],
  });

  const toggleRoleMutation = useMutation({
    mutationFn: async ({ id, newRole }: { id: number; newRole: string }) => {
      const res = await apiRequest("PATCH", `/api/members/${id}`, { role: newRole });
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

  const updateCapMutation = useMutation({
    mutationFn: async ({ id, maxAttendees }: { id: number; maxAttendees: number | null }) => {
      const res = await apiRequest("PATCH", `/api/events/${id}`, { maxAttendees });
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

  const [capDialog, setCapDialog] = useState<ClubEvent | null>(null);

  if (membersLoading || eventsLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-40 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  const admins = members.filter((m) => m.role === "admin");

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <div>
        <h1 className="font-serif text-xl tracking-tight" data-testid="text-page-title">
          Admin Panel
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage members, roles, and events
        </p>
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
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Event Management
          </h2>
        </div>

        {events.length === 0 ? (
          <Card className="bg-card border-card-border">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No events to manage</p>
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
    </div>
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

  const goingCount = rsvps.filter((r) => r.status === "going").length;
  const waitlistCount = rsvps.filter((r) => r.status === "waitlist").length;

  return (
    <Card className="bg-card border-card-border" data-testid={`admin-event-${event.id}`}>
      <CardContent className="p-3 flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{event.title}</p>
            {event.maxAttendees ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {goingCount}/{event.maxAttendees} spots
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
            {event.date} at {event.time} — {event.location}
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

  const goingCount = rsvps.filter((r) => r.status === "going").length;
  const waitlistCount = rsvps.filter((r) => r.status === "waitlist").length;

  return (
    <Dialog open={!!event} onOpenChange={() => { onClose(); setLastEventId(null); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">Capacity: {event?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {(goingCount > 0 || waitlistCount > 0) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {goingCount > 0 && <span>{goingCount} going</span>}
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
              {capValue && Number(capValue) < goingCount && (
                <p className="text-xs text-amber-400 mt-1">
                  {goingCount} members are already going. Lowering the cap won't remove them but will prevent new RSVPs.
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
