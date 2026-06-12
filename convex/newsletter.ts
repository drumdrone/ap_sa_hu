import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Subscribers
// ---------------------------------------------------------------------------

// Basic email validation - good enough to catch typos / empty values
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// List all subscribers (newest first)
export const listSubscribers = query({
  args: {},
  handler: async (ctx) => {
    const subs = await ctx.db.query("newsletterSubscribers").collect();
    return subs.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Add a single subscriber
export const addSubscriber = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!isValidEmail(email)) {
      throw new Error("Neplatná e-mailová adresa: " + args.email);
    }

    const existing = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) {
      throw new Error("Tato adresa už je v seznamu: " + email);
    }

    return await ctx.db.insert("newsletterSubscribers", {
      email,
      name: args.name?.trim() || undefined,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// Bulk add subscribers from a pasted blob of emails (newline / comma / semicolon
// separated). Returns counts so the UI can report results.
export const addSubscribersBulk = mutation({
  args: {
    raw: v.string(),
  },
  handler: async (ctx, args) => {
    const candidates = args.raw
      .split(/[\s,;]+/)
      .map((e) => normalizeEmail(e))
      .filter((e) => e.length > 0);

    const existing = await ctx.db.query("newsletterSubscribers").collect();
    const existingEmails = new Set(existing.map((s) => s.email));

    let added = 0;
    let skipped = 0;
    let invalid = 0;
    const seen = new Set<string>();

    for (const email of candidates) {
      if (!isValidEmail(email)) {
        invalid++;
        continue;
      }
      if (existingEmails.has(email) || seen.has(email)) {
        skipped++;
        continue;
      }
      seen.add(email);
      await ctx.db.insert("newsletterSubscribers", {
        email,
        isActive: true,
        createdAt: Date.now(),
      });
      added++;
    }

    return { added, skipped, invalid };
  },
});

// Toggle active state (pause/resume) of a subscriber
export const toggleSubscriber = mutation({
  args: {
    id: v.id("newsletterSubscribers"),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.id);
    if (!sub) throw new Error("Odběratel nenalezen");
    await ctx.db.patch(args.id, { isActive: !sub.isActive });
  },
});

// Update a subscriber's name
export const updateSubscriber = mutation({
  args: {
    id: v.id("newsletterSubscribers"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { name: args.name?.trim() || undefined });
  },
});

// Remove a subscriber
export const removeSubscriber = mutation({
  args: {
    id: v.id("newsletterSubscribers"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ---------------------------------------------------------------------------
// Newsletter content - the pool of items the editor can pick from.
// Sections are built from existing data: the news log (3 types) and TOP products.
// Each item carries a default title (pre-filled, editable in the UI) and a link.
// ---------------------------------------------------------------------------

type ContentItem = { id: string; title: string; url?: string };
type ContentSection = { key: string; label: string; items: ContentItem[] };

export const getContent = query({
  args: {},
  handler: async (ctx): Promise<ContentSection[]> => {
    // Base URL of the app, used as a link fallback for items without an
    // external URL. Override with the SITE_URL env var if the domain changes.
    const siteUrl = (process.env.SITE_URL || "https://apsahu.netlify.app").replace(/\/+$/, "");

    const news = await ctx.db.query("news").withIndex("by_createdAt").order("desc").take(100);

    const byType = (type: Doc<"news">["type"]): ContentItem[] =>
      news
        .filter((n) => n.type === type)
        .map((n) => ({ id: n._id, title: n.title, url: n.url || undefined }));

    // TOP products (curated list) - link to public e-shop URL when available,
    // otherwise to the product detail page in the app
    const topProducts = await ctx.db
      .query("products")
      .withIndex("by_isTop", (q) => q.eq("isTop", true))
      .collect();

    const topItems: ContentItem[] = topProducts
      .sort((a, b) => (a.topOrder ?? 99) - (b.topOrder ?? 99))
      .slice(0, 20)
      .map((p) => ({ id: p._id, title: p.name, url: p.productUrl || `${siteUrl}/product/${p._id}` }));

    return [
      { key: "product", label: "Nové produkty", items: byType("product") },
      { key: "company", label: "Novinky z firmy", items: byType("company") },
      { key: "materials", label: "Nové materiály", items: byType("materials") },
      { key: "top", label: "TOP produkty", items: topItems },
    ];
  },
});

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

const sectionValidator = v.object({
  title: v.string(),
  items: v.array(v.object({
    title: v.string(),
    url: v.optional(v.string()),
  })),
});

// Build a clean, readable plain-text newsletter body from the composed sections.
function buildBody(
  intro: string | undefined,
  sections: Array<{ title: string; items: Array<{ title: string; url?: string }> }>
): string {
  const parts: string[] = [];
  if (intro && intro.trim()) {
    parts.push(intro.trim());
    parts.push("");
  }

  for (const section of sections) {
    if (section.items.length === 0) continue;
    parts.push(`━━━ ${section.title.toUpperCase()} ━━━`);
    parts.push("");
    for (const item of section.items) {
      parts.push(`• ${item.title}`);
      if (item.url) parts.push(`  ${item.url}`);
    }
    parts.push("");
  }

  return parts.join("\n").trimEnd();
}

// Send the composed newsletter. If `recipients` is omitted, sends to all active
// subscribers. Schedules one delivery per recipient via the shared email action
// and records the campaign in newsletterLogs.
export const sendNewsletter = mutation({
  args: {
    subject: v.string(),
    intro: v.optional(v.string()),
    sections: v.array(sectionValidator),
    recipients: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const subject = args.subject.trim();
    if (!subject) throw new Error("Vyplňte předmět e-mailu.");

    const nonEmptySections = args.sections.filter((s) => s.items.length > 0);
    if (nonEmptySections.length === 0) {
      throw new Error("Vyberte alespoň jednu položku k odeslání.");
    }

    // Resolve recipients
    let emails: string[];
    if (args.recipients && args.recipients.length > 0) {
      emails = args.recipients.map((e) => normalizeEmail(e));
    } else {
      const subs = await ctx.db
        .query("newsletterSubscribers")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
      emails = subs.map((s) => s.email);
    }

    if (emails.length === 0) {
      throw new Error("Žádní aktivní odběratelé k odeslání.");
    }

    const body = buildBody(args.intro, nonEmptySections);

    // Schedule one email per recipient, staggered ~2/s to respect
    // the email provider's rate limit (Resend allows 2 req/s).
    for (let i = 0; i < emails.length; i++) {
      await ctx.scheduler.runAfter(i * 600, internal.emails.deliverEmail, {
        email: emails[i],
        subject,
        content: body,
      });
    }

    await ctx.db.insert("newsletterLogs", {
      subject,
      intro: args.intro?.trim() || undefined,
      sections: nonEmptySections,
      recipientCount: emails.length,
      recipients: emails,
      createdAt: Date.now(),
    });

    return { sent: emails.length };
  },
});

// History of sent campaigns (newest first)
export const listLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("newsletterLogs")
      .withIndex("by_createdAt")
      .order("desc")
      .take(args.limit ?? 20);
  },
});
