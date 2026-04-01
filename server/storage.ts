import {
  type Member, type InsertMember, members,
  type Event, type InsertEvent, events,
  type Rsvp, type InsertRsvp, rsvps,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and } from "drizzle-orm";

const dbPath = process.env.DATABASE_PATH || "data.db";
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

// Auto-create tables on startup
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    bio TEXT,
    favorite_bourbons TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TEXT NOT NULL,
    avatar_color TEXT NOT NULL DEFAULT '#C8A951'
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    featured_bourbon TEXT,
    max_attendees INTEGER,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'going'
  );
`);

export const db = drizzle(sqlite);

export interface IStorage {
  // Members
  getAllMembers(): Promise<Member[]>;
  getMember(id: number): Promise<Member | undefined>;
  getMemberByEmail(email: string): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: number, data: Partial<InsertMember>): Promise<Member | undefined>;
  deleteMember(id: number): Promise<void>;

  // Events
  getAllEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, data: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<void>;

  // RSVPs
  getRsvpsForEvent(eventId: number): Promise<Rsvp[]>;
  getRsvpForMember(eventId: number, memberId: number): Promise<Rsvp | undefined>;
  createOrUpdateRsvp(rsvp: InsertRsvp): Promise<Rsvp>;
  deleteRsvp(eventId: number, memberId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Members
  async getAllMembers(): Promise<Member[]> {
    return db.select().from(members).all();
  }

  async getMember(id: number): Promise<Member | undefined> {
    return db.select().from(members).where(eq(members.id, id)).get();
  }

  async getMemberByEmail(email: string): Promise<Member | undefined> {
    return db.select().from(members).where(eq(members.email, email)).get();
  }

  async createMember(member: InsertMember): Promise<Member> {
    return db.insert(members).values(member).returning().get();
  }

  async updateMember(id: number, data: Partial<InsertMember>): Promise<Member | undefined> {
    return db.update(members).set(data).where(eq(members.id, id)).returning().get();
  }

  async deleteMember(id: number): Promise<void> {
    db.delete(members).where(eq(members.id, id)).run();
    db.delete(rsvps).where(eq(rsvps.memberId, id)).run();
  }

  // Events
  async getAllEvents(): Promise<Event[]> {
    return db.select().from(events).all();
  }

  async getEvent(id: number): Promise<Event | undefined> {
    return db.select().from(events).where(eq(events.id, id)).get();
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    return db.insert(events).values(event).returning().get();
  }

  async updateEvent(id: number, data: Partial<InsertEvent>): Promise<Event | undefined> {
    return db.update(events).set(data).where(eq(events.id, id)).returning().get();
  }

  async deleteEvent(id: number): Promise<void> {
    db.delete(events).where(eq(events.id, id)).run();
    db.delete(rsvps).where(eq(rsvps.eventId, id)).run();
  }

  // RSVPs
  async getRsvpsForEvent(eventId: number): Promise<Rsvp[]> {
    return db.select().from(rsvps).where(eq(rsvps.eventId, eventId)).all();
  }

  async getRsvpForMember(eventId: number, memberId: number): Promise<Rsvp | undefined> {
    return db.select().from(rsvps)
      .where(and(eq(rsvps.eventId, eventId), eq(rsvps.memberId, memberId)))
      .get();
  }

  async createOrUpdateRsvp(rsvp: InsertRsvp): Promise<Rsvp> {
    const existing = await this.getRsvpForMember(rsvp.eventId, rsvp.memberId);
    if (existing) {
      return db.update(rsvps).set({ status: rsvp.status }).where(eq(rsvps.id, existing.id)).returning().get()!;
    }
    return db.insert(rsvps).values(rsvp).returning().get();
  }

  async deleteRsvp(eventId: number, memberId: number): Promise<void> {
    db.delete(rsvps).where(and(eq(rsvps.eventId, eventId), eq(rsvps.memberId, memberId))).run();
  }
}

export const storage = new DatabaseStorage();
