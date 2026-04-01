import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, verifyPassword, hashPassword } from "./storage";
import { insertMemberSchema, insertEventSchema, insertRsvpSchema } from "@shared/schema";

// Middleware to require admin authentication
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminUserId) {
    return res.status(401).json({ message: "Admin login required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ADMIN AUTH
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
    req.session.destroy(() => {});
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

  // MEMBERS
  app.get("/api/members", async (_req, res) => {
    const allMembers = await storage.getAllMembers();
    res.json(allMembers);
  });

  app.get("/api/members/:id", async (req, res) => {
    const member = await storage.getMember(Number(req.params.id));
    if (!member) return res.status(404).json({ message: "Member not found" });
    res.json(member);
  });

  app.post("/api/members", async (req, res) => {
    const parsed = insertMemberSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const existing = await storage.getMemberByEmail(parsed.data.email);
    if (existing) return res.status(409).json({ message: "Email already registered" });

    // Force role to "member" — only admins can promote via PATCH
    const member = await storage.createMember({ ...parsed.data, role: "member" });
    res.status(201).json(member);
  });

  // Protected: only admins can update members (role changes, edits)
  app.patch("/api/members/:id", requireAdmin, async (req, res) => {
    const member = await storage.updateMember(Number(req.params.id), req.body);
    if (!member) return res.status(404).json({ message: "Member not found" });
    res.json(member);
  });

  // Protected: only admins can delete members
  app.delete("/api/members/:id", requireAdmin, async (req, res) => {
    await storage.deleteMember(Number(req.params.id));
    res.status(204).send();
  });

  // EVENTS
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

  // RSVPs — with capacity enforcement and waitlist
  app.get("/api/events/:eventId/rsvps", async (req, res) => {
    const rsvpList = await storage.getRsvpsForEvent(Number(req.params.eventId));
    res.json(rsvpList);
  });

  app.post("/api/events/:eventId/rsvps", async (req, res) => {
    const eventId = Number(req.params.eventId);
    const data = {
      ...req.body,
      eventId,
    };
    const parsed = insertRsvpSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    // Check capacity if member is trying to RSVP as "going"
    if (parsed.data.status === "going") {
      const event = await storage.getEvent(eventId);
      if (event && event.maxAttendees) {
        const allRsvps = await storage.getRsvpsForEvent(eventId);
        // Check if this member already has a "going" RSVP (updating existing)
        const existing = allRsvps.find(r => r.memberId === parsed.data.memberId);
        const goingCount = allRsvps.filter(r => r.status === "going").length;

        // If they're not already going and the event is full, put them on waitlist
        if ((!existing || existing.status !== "going") && goingCount >= event.maxAttendees) {
          const rsvp = await storage.createOrUpdateRsvp({
            ...parsed.data,
            status: "waitlist",
          });
          return res.json({ ...rsvp, _waitlisted: true });
        }
      }
    }

    const rsvp = await storage.createOrUpdateRsvp(parsed.data);
    res.json(rsvp);
  });

  // Cancel RSVP — also promotes next person from waitlist
  app.delete("/api/events/:eventId/rsvps/:memberId", async (req, res) => {
    const eventId = Number(req.params.eventId);
    const memberId = Number(req.params.memberId);

    // Check if the person being removed was "going"
    const existing = await storage.getRsvpForMember(eventId, memberId);
    const wasGoing = existing?.status === "going";

    await storage.deleteRsvp(eventId, memberId);

    // If they were going and the event has a cap, promote next waitlisted person
    if (wasGoing) {
      const event = await storage.getEvent(eventId);
      if (event && event.maxAttendees) {
        const allRsvps = await storage.getRsvpsForEvent(eventId);
        const goingCount = allRsvps.filter(r => r.status === "going").length;

        if (goingCount < event.maxAttendees) {
          // Find the earliest waitlisted person (lowest ID = first to sign up)
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
