import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const members = sqliteTable("members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  bio: text("bio"),
  favoriteBourbons: text("favorite_bourbons"), // JSON array stored as text
  role: text("role").notNull().default("member"), // "admin" | "member"
  joinedAt: text("joined_at").notNull(),
  avatarColor: text("avatar_color").notNull().default("#C8A951"),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  time: text("time").notNull(),
  location: text("location").notNull(),
  featuredBourbon: text("featured_bourbon"),
  maxAttendees: integer("max_attendees"),
  createdBy: integer("created_by").notNull(),
  createdAt: text("created_at").notNull(),
});

export const rsvps = sqliteTable("rsvps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: integer("event_id").notNull(),
  memberId: integer("member_id").notNull(),
  status: text("status").notNull().default("going"), // "going" | "maybe" | "not_going"
});

export const insertMemberSchema = createInsertSchema(members).omit({ id: true }).extend({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
});

export const insertEventSchema = createInsertSchema(events).omit({ id: true }).extend({
  title: z.string().min(1, "Title is required"),
  location: z.string().min(1, "Location is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
});

export const insertRsvpSchema = createInsertSchema(rsvps).omit({ id: true });

export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertRsvp = z.infer<typeof insertRsvpSchema>;
export type Rsvp = typeof rsvps.$inferSelect;
