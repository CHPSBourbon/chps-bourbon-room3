import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, verifyPassword, hashPassword } from "./storage";
import { insertMemberSchema, insertEventSchema, insertRsvpSchema } from "@shared/schema";

const AVATAR_COLORS = ["#C8A951", "#8B6914", "#D4A76A", "#B8860B", "#A0522D", "#CD853F", "#DAA520", "#BC8F8F"];

// Middleware to require admin authentication
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminUserId) {
    return res.status(401).json({ message: "Admin login required" });
  }
  next();
}

// Middleware to require member authentication
function requireMember(req: Request, res: Response, next: NextFunction) {
  if (!req.session.memberId) {
    return res.status(401).json({ message: "Login required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── MEMBER AUTH ──────────────────────────────────────────────

  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password, phone, bio, favoriteBourbons } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await storage.getMemberByEmail(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const pwHash = await hashPassword(password);
    const member = await storage.createMember({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || null,
      bio: bio || null,
      favoriteBourbons: favoriteBourbons || null,
      role: "member",
      joinedAt: new Date().toISOString().split("T")[0],
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      passwordHash: pwHash,
    });

    req.session.memberId = member.id;
    res.status(201).json({ id: member.id, name: member.name, email: member.email, role: member.role });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const member = await storage.getMemberByEmail(email.toLowerCase().trim());
    if (!member || !member.passwordHash) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const valid = await verifyPassword(member.passwordHash, password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    req.session.memberId = member.id;
    res.json({ id: member.id, name: member.name, email: member.email, role: member.role });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.memberId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const member = await storage.getMember(req.session.memberId);
    if (!member) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ id: member.id, name: member.name, email: member.email, role: member.role });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.memberId = undefined;
    res.json({ message: "Logged out" });
  });

  app.post("/api/auth/change-password", requireMember, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const member = await storage.getMember(req.session.memberId!);
    if (!member || !member.passwordHash) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const valid = await verifyPassword(member.passwordHash, currentPassword);
    if (!valid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const newHash = await hashPassword(newPassword);
    await storage.updateMember(member.id, { passwordHash: newHash });
    res.json({ message: "Password updated" });
  });

  // ── ADMIN AUTH (unchanged) ──────────────────────────────────

  app.post("/api/admin/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const adminUser = await storage.getAdminUserByEmail(email.toLowerCase().trim());
    if (!adminUser) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const valid = await verifyPassword(adminUser.passwordHash, password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    req.session.adminUserId = adminUser.id;
    res.json({ id: adminUser.id, email: adminUser.email, name: adminUser.name });
  });

  app.get("/api/admin/me", async (req, res) => {
    if (!req.session.adminUserId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const adminUser = await storage.getAdminUser(req.session.adminUserId);
    if (!adminUser) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ id: adminUser.id, email: adminUser.email, name: adminUser.name });
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.adminUserId = undefined;
    res.json({ message: "Logged out" });
  });

  app.post("/api/admin/change-password", requireAdmin, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const adminUser = await storage.getAdminUser(req.session.adminUserId!);
    if (!adminUser) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const valid = await verifyPassword(adminUser.passwordHash, currentPassword);
    if (!valid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const newHash = await hashPassword(newPassword);
    await storage.updateAdminPassword(adminUser.id, newHash);
    res.json({ message: "Password updated" });
  });

  // ── MEMBERS ─────────────────────────────────────────────────

  app.get("/api/members", async (_req, res) => {
    const allMembers = await storage.getAllMembers();
    // Strip passwordHash from responses
    res.json(allMembers.map(({ passwordHash, ...m }) => m));
  });

  app.get("/api/members/:id", async (req, res) => {
    const member = await storage.getMember(Number(req.params.id));
    if (!member) return res.status(404).json({ message: "Member not found" });
    const { passwordHash, ...safe } = member;
    res.json(safe);
  });

  // Protected: only admins can update members (role changes, edits)
  app.patch("/api/members/:id", requireAdmin, async (req, res) => {
    const member = await storage.updateMember(Number(req.params.id), req.body);
    if (!member) return res.status(404).json({ message: "Member not found" });
    const { passwordHash, ...safe } = member;
    res.json(safe);
  });

  // Protected: only admins can delete members
  app.delete("/api/members/:id", requireAdmin, async (req, res) => {
    await storage.deleteMember(Number(req.params.id));
    res.status(204).send();
  });

  // ── EVENTS ──────────────────────────────────────────────────

  app.get("/api/events", async (_req, res) => {
    const allEvents = await storage.getAllEvents();
    res.json(allEvents);
  });

  app.get("/api/events/:id", async (req, res) => {
    const event = await storage.getEvent(Number(req.params.id));
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  });

  app.post("/api/events", async (req, res) => {
    const parsed = insertEventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const event = await storage.createEvent(parsed.data);
    res.status(201).json(event);
  });

  // Protected: only admins can update events
  app.patch("/api/events/:id", requireAdmin, async (req, res) => {
    const event = await storage.updateEvent(Number(req.params.id), req.body);
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  });

  // Protected: only admins can delete events
  app.delete("/api/events/:id", requireAdmin, async (req, res) => {
    await storage.deleteEvent(Number(req.params.id));
    res.status(204).send();
  });

  // ── RSVPs — member must be logged in, can only RSVP themselves ──

  app.get("/api/events/:eventId/rsvps", async (req, res) => {
    const rsvpList = await storage.getRsvpsForEvent(Number(req.params.eventId));
    res.json(rsvpList);
  });

  // RSVP — uses logged-in member's ID automatically
  app.post("/api/events/:eventId/rsvps", requireMember, async (req, res) => {
    const eventId = Number(req.params.eventId);
    const memberId = req.session.memberId!;
    const { status } = req.body;

    if (!status) return res.status(400).json({ message: "Status required" });

    const rsvpData = { eventId, memberId, status };

    // Check capacity if member is trying to RSVP as "going"
    if (status === "going") {
      const event = await storage.getEvent(eventId);
      if (event && event.maxAttendees) {
        const allRsvps = await storage.getRsvpsForEvent(eventId);
        const existing = allRsvps.find(r => r.memberId === memberId);
        const goingCount = allRsvps.filter(r => r.status === "going").length;

        if ((!existing || existing.status !== "going") && goingCount >= event.maxAttendees) {
          const rsvp = await storage.createOrUpdateRsvp({
            ...rsvpData,
            status: "waitlist",
          });
          return res.json({ ...rsvp, _waitlisted: true });
        }
      }
    }

    const rsvp = await storage.createOrUpdateRsvp(rsvpData);
    res.json(rsvp);
  });

  // Cancel own RSVP — member can only cancel their own
  app.delete("/api/events/:eventId/rsvps", requireMember, async (req, res) => {
    const eventId = Number(req.params.eventId);
    const memberId = req.session.memberId!;

    const existing = await storage.getRsvpForMember(eventId, memberId);
    const wasGoing = existing?.status === "going";

    await storage.deleteRsvp(eventId, memberId);

    // Auto-promote from waitlist
    if (wasGoing) {
      const event = await storage.getEvent(eventId);
      if (event && event.maxAttendees) {
        const allRsvps = await storage.getRsvpsForEvent(eventId);
        const goingCount = allRsvps.filter(r => r.status === "going").length;

        if (goingCount < event.maxAttendees) {
          const waitlisted = allRsvps
            .filter(r => r.status === "waitlist")
            .sort((a, b) => a.id - b.id);

          if (waitlisted.length > 0) {
            await storage.createOrUpdateRsvp({
              eventId,
              memberId: waitlisted[0].memberId,
              status: "going",
            });
          }
        }
      }
    }

    res.status(204).send();
  });

  return httpServer;
}
