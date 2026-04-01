import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Member } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Search, Wine } from "lucide-react";

export default function Members() {
  const [search, setSearch] = useState("");

  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="font-serif text-xl tracking-tight" data-testid="text-page-title">Members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {members.length} member{members.length !== 1 ? "s" : ""} in the club
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="pl-9"
          data-testid="input-search-members"
        />
      </div>

      {/* Members Grid */}
      {filtered.length === 0 ? (
        <Card className="bg-card border-card-border">
          <CardContent className="p-8 text-center">
            <Wine className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "No members match your search" : "No members yet. Create an account to join the club."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <Card key={member.id} className="bg-card border-card-border" data-testid={`card-member-${member.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                    style={{ backgroundColor: member.avatarColor + "22", color: member.avatarColor }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{member.name}</p>
                      {member.role === "admin" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary flex-shrink-0">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{member.phone}</span>
                      </div>
                    )}
                    {member.bio && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{member.bio}</p>
                    )}
                    {member.favoriteBourbons && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {member.favoriteBourbons.split(",").slice(0, 3).map((b, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {b.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
