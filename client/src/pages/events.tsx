import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Event as ClubEvent, Member, Rsvp } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/App";
import { MapPin, Clock, Users, Wine, CalendarDays, Check, HelpCircle, AlertCircle } from "lucide-react";
import { format, parseISO, isAfter, isBefore } from "date-fns";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

export default function Events() {
  const { toast } = useToast();
  const auth = useAuthContext();

  const { data: events = [], isLoading: eventsLoading } = useQuery<ClubEvent[]>({
    queryKey: ["/api/events"],
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
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
      <div>
        <h1 className="font-serif text-xl tracking-tight" data-testid="text-page-title">Events</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tastings, gatherings, and bottle shares
        </p>
      </div>

      {!auth.member && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Sign in or create an account to RSVP to events
            </p>
          </CardContent>
        </Card>
      )}

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
                onRsvp={auth.member ? (status) => rsvpMutation.mutate({ eventId: event.id, status }) : undefined}
                onCancel={auth.member ? () => cancelRsvpMutation.mutate(event.id) : undefined}
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
          {/* RSVP buttons — only shown if logged in */}
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
