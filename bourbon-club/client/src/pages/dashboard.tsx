import { useQuery } from "@tanstack/react-query";
import type { Member, Event } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CalendarDays, Wine, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { format, parseISO, isAfter } from "date-fns";

export default function Dashboard() {
  const { data: members = [], isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const now = new Date();
  const upcomingEvents = events
    .filter((e) => isAfter(parseISO(e.date), now) || e.date === format(now, "yyyy-MM-dd"))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const adminCount = members.filter((m) => m.role === "admin").length;

  if (membersLoading || eventsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-6xl">
      <div>
        <h1 className="font-serif text-xl tracking-tight" data-testid="text-page-title">
          CHPS Bourbon Room
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back. Here is what is happening with your club.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-card-border" data-testid="card-stat-members">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Members</p>
                <p className="text-2xl font-semibold mt-1">{members.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border" data-testid="card-stat-events">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Events</p>
                <p className="text-2xl font-semibold mt-1">{events.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border" data-testid="card-stat-upcoming">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Upcoming</p>
                <p className="text-2xl font-semibold mt-1">{upcomingEvents.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border" data-testid="card-stat-admins">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Admins</p>
                <p className="text-2xl font-semibold mt-1">{adminCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wine className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Upcoming Events
          </h2>
          <Link href="/events" className="text-xs text-primary hover:underline" data-testid="link-all-events">
            View all
          </Link>
        </div>

        {upcomingEvents.length === 0 ? (
          <Card className="bg-card border-card-border">
            <CardContent className="p-8 text-center">
              <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No upcoming events scheduled</p>
              <Link href="/events" className="text-xs text-primary hover:underline mt-2 inline-block" data-testid="link-create-event">
                Schedule one
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <Card key={event.id} className="bg-card border-card-border" data-testid={`card-event-${event.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[48px]">
                      <p className="text-xs text-muted-foreground uppercase">
                        {format(parseISO(event.date), "MMM")}
                      </p>
                      <p className="text-lg font-semibold text-primary">
                        {format(parseISO(event.date), "d")}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.time} at {event.location}
                      </p>
                    </div>
                  </div>
                  {event.featuredBourbon && (
                    <Badge variant="secondary" className="text-xs">
                      {event.featuredBourbon}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Members */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Members
          </h2>
          <Link href="/members" className="text-xs text-primary hover:underline" data-testid="link-all-members">
            View all
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {members.slice(0, 8).map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-card-border"
              data-testid={`badge-member-${member.id}`}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold"
                style={{ backgroundColor: member.avatarColor + "22", color: member.avatarColor }}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium">{member.name}</span>
              {member.role === "admin" && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary">
                  Admin
                </Badge>
              )}
            </div>
          ))}
          {members.length > 8 && (
            <div className="flex items-center px-3 py-2 text-xs text-muted-foreground">
              +{members.length - 8} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
