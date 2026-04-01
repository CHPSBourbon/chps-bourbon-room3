import nodemailer from "nodemailer";
import type { Event, Member, Rsvp } from "@shared/schema";
import { storage } from "./storage";

// Configure transporter from environment variables
// Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM on Railway
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.log("[email] SMTP not configured — skipping email send. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars.");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const FROM_ADDRESS = process.env.SMTP_FROM || "CHPS Bourbon Room <noreply@chpsbourbonroom.com>";

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${m} ${ampm} EST`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
}

// Send email to a list of recipients
async function sendEmail(to: string[], subject: string, html: string) {
  const transporter = getTransporter();
  if (!transporter) return;

  try {
    // Send individually to protect privacy
    for (const recipient of to) {
      await transporter.sendMail({
        from: FROM_ADDRESS,
        to: recipient,
        subject,
        html,
      });
    }
    console.log(`[email] Sent "${subject}" to ${to.length} recipient(s)`);
  } catch (err) {
    console.error("[email] Failed to send:", err);
  }
}

// ── Notification: New Event Created ──────────────────────────
export async function notifyNewEvent(event: Event) {
  const members = await storage.getAllMembers();
  const emails = members.map((m) => m.email).filter(Boolean);
  if (emails.length === 0) return;

  const subject = `New Event: ${event.title}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #1a1918; color: #cdccca; border-radius: 12px;">
      <h2 style="color: #c8a951; margin: 0 0 8px 0; font-size: 20px;">🥃 New Event</h2>
      <h3 style="color: #fff; margin: 0 0 16px 0; font-size: 18px;">${event.title}</h3>
      ${event.description ? `<p style="color: #a0a0a0; margin: 0 0 16px 0;">${event.description}</p>` : ""}
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #7a7974;">Date</td><td style="padding: 6px 0; color: #cdccca;">${formatDate(event.date)}</td></tr>
        <tr><td style="padding: 6px 0; color: #7a7974;">Time</td><td style="padding: 6px 0; color: #cdccca;">${formatTime12h(event.time)}</td></tr>
        <tr><td style="padding: 6px 0; color: #7a7974;">Location</td><td style="padding: 6px 0; color: #cdccca;">${event.location}</td></tr>
        ${event.featuredBourbon ? `<tr><td style="padding: 6px 0; color: #7a7974;">Bourbon</td><td style="padding: 6px 0; color: #cdccca;">${event.featuredBourbon}</td></tr>` : ""}
        ${event.maxAttendees ? `<tr><td style="padding: 6px 0; color: #7a7974;">Capacity</td><td style="padding: 6px 0; color: #cdccca;">${event.maxAttendees} spots</td></tr>` : ""}
      </table>
      <p style="color: #7a7974; margin: 20px 0 0 0; font-size: 13px;">Log in to RSVP — CHPS Bourbon Room</p>
    </div>
  `;

  await sendEmail(emails, subject, html);
}

// ── Notification: Event Cancelled ────────────────────────────
export async function notifyEventCancelled(event: Event) {
  const members = await storage.getAllMembers();
  const emails = members.map((m) => m.email).filter(Boolean);
  if (emails.length === 0) return;

  const subject = `Event Cancelled: ${event.title}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #1a1918; color: #cdccca; border-radius: 12px;">
      <h2 style="color: #c8a951; margin: 0 0 8px 0; font-size: 20px;">Event Cancelled</h2>
      <h3 style="color: #fff; margin: 0 0 16px 0; font-size: 18px;">${event.title}</h3>
      <p style="color: #a0a0a0;">The event scheduled for ${formatDate(event.date)} at ${formatTime12h(event.time)} has been cancelled.</p>
      <p style="color: #7a7974; margin: 20px 0 0 0; font-size: 13px;">CHPS Bourbon Room</p>
    </div>
  `;

  await sendEmail(emails, subject, html);
}

// ── Notification: 24-Hour Reminder ───────────────────────────
export async function sendEventReminders() {
  // Find events happening tomorrow (within 24-28 hours)
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowEnd = new Date(now.getTime() + 28 * 60 * 60 * 1000);

  const allEvents = await storage.getAllEvents();

  for (const event of allEvents) {
    const eventDate = new Date(`${event.date}T${event.time}:00`);

    if (eventDate >= tomorrow && eventDate <= tomorrowEnd) {
      // Get RSVPs for this event
      const eventRsvps = await storage.getRsvpsForEvent(event.id);
      const goingOrWaitlist = eventRsvps.filter(
        (r) => r.status === "going" || r.status === "maybe" || r.status === "waitlist"
      );

      if (goingOrWaitlist.length === 0) continue;

      // Get member emails
      const allMembers = await storage.getAllMembers();
      const memberMap = new Map(allMembers.map((m) => [m.id, m]));

      const emails = goingOrWaitlist
        .map((r) => memberMap.get(r.memberId)?.email)
        .filter(Boolean) as string[];

      if (emails.length === 0) continue;

      const subject = `Reminder: ${event.title} is tomorrow`;
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #1a1918; color: #cdccca; border-radius: 12px;">
          <h2 style="color: #c8a951; margin: 0 0 8px 0; font-size: 20px;">🥃 Event Tomorrow</h2>
          <h3 style="color: #fff; margin: 0 0 16px 0; font-size: 18px;">${event.title}</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #7a7974;">Date</td><td style="padding: 6px 0; color: #cdccca;">${formatDate(event.date)}</td></tr>
            <tr><td style="padding: 6px 0; color: #7a7974;">Time</td><td style="padding: 6px 0; color: #cdccca;">${formatTime12h(event.time)}</td></tr>
            <tr><td style="padding: 6px 0; color: #7a7974;">Location</td><td style="padding: 6px 0; color: #cdccca;">${event.location}</td></tr>
            ${event.featuredBourbon ? `<tr><td style="padding: 6px 0; color: #7a7974;">Bourbon</td><td style="padding: 6px 0; color: #cdccca;">${event.featuredBourbon}</td></tr>` : ""}
          </table>
          <p style="color: #7a7974; margin: 20px 0 0 0; font-size: 13px;">See you there — CHPS Bourbon Room</p>
        </div>
      `;

      await sendEmail(emails, subject, html);
      console.log(`[email] Sent 24h reminder for "${event.title}" to ${emails.length} member(s)`);
    }
  }
}

// Run reminder check every hour
setInterval(() => {
  sendEventReminders().catch(console.error);
}, 60 * 60 * 1000);

// Also run once on startup (after a brief delay to let DB seed)
setTimeout(() => {
  sendEventReminders().catch(console.error);
}, 10000);
