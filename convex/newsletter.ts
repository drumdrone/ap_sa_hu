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

type ContentBlock = { key: string; label: string; content: string };
type ContentItem = {
  id: string;
  title: string;
  url?: string;
  imageUrl?: string;
  blocks?: ContentBlock[];
};
type ContentSection = { key: string; label: string; items: ContentItem[] };

// Marketing content blocks of a product that can be attached to a newsletter
// item. Mirrors the "Rychlé akce" and "Pro prodejce" sections of the product
// detail page; only blocks with content are offered.
function productBlocks(p: Doc<"products">): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const add = (key: string, label: string, content?: string | null) => {
    if (content && content.trim()) blocks.push({ key, label, content: content.trim() });
  };

  // Rychlé akce
  add(
    "salesClaim",
    "Prodejní claim",
    p.salesClaim && p.salesClaimSubtitle
      ? `${p.salesClaim}\n${p.salesClaimSubtitle}`
      : p.salesClaim
  );
  if (p.whyBuy?.length) {
    add("whyBuy", "Proč koupit", p.whyBuy.map((w) => `${w.icon} ${w.text}`).join("\n"));
  }
  add("targetAudience", "Cílová skupina", p.targetAudience);
  add("socialFacebook", "Facebook post", p.socialFacebook);
  add("socialInstagram", "Instagram post", p.socialInstagram);

  // Pro prodejce
  add("mainBenefits", "3 hlavní benefity", p.mainBenefits);
  add("quickReferenceCard", "Quick Reference Card", p.quickReferenceCard);
  add("faqText", "FAQ", p.faqText);
  add("salesForecast", "Prodejní prognóza", p.salesForecast);
  add("sensoryProfile", "Senzorický profil", p.sensoryProfile);
  add("seasonalOpportunities", "Sezónní příležitosti", p.seasonalOpportunities);
  add("herbComposition", "Bylinné složení", p.herbComposition);
  add("competitionComparison", "Srovnání s konkurencí", p.competitionComparison);

  return blocks;
}

export const getContent = query({
  args: {},
  handler: async (ctx): Promise<ContentSection[]> => {
    // Base URL of the app, used as a link fallback for items without an
    // external URL. Override with the SITE_URL env var if the domain changes.
    const siteUrl = (process.env.SITE_URL || "https://apsahu.netlify.app").replace(/\/+$/, "");

    const news = await ctx.db.query("news").withIndex("by_createdAt").order("desc").take(100);

    // Resolve uploaded news images so the composer/email can show previews
    const newsItems = await Promise.all(
      news.map(async (n) => ({
        type: n.type,
        item: {
          id: n._id as string,
          title: n.title,
          url: n.url || undefined,
          imageUrl: n.imageStorageId
            ? (await ctx.storage.getUrl(n.imageStorageId)) ?? undefined
            : undefined,
        } satisfies ContentItem,
      }))
    );

    const byType = (type: Doc<"news">["type"]): ContentItem[] =>
      newsItems.filter((n) => n.type === type).map((n) => n.item);

    // TOP products (curated list) - link to public e-shop URL when available,
    // otherwise to the product detail page in the app
    const topProducts = await ctx.db
      .query("products")
      .withIndex("by_isTop", (q) => q.eq("isTop", true))
      .collect();

    const topItems: ContentItem[] = topProducts
      .sort((a, b) => (a.topOrder ?? 99) - (b.topOrder ?? 99))
      .slice(0, 20)
      .map((p) => ({
        id: p._id,
        title: p.name,
        url: p.productUrl || `${siteUrl}/product/${p._id}`,
        imageUrl: p.image || undefined,
        blocks: productBlocks(p),
      }));

    // POSM materials (articles, flyers, stands...). Link priority: external
    // download URL > uploaded file > image > POSM page in the app.
    const posmItems = await ctx.db
      .query("posmItems")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const posmContent: ContentItem[] = await Promise.all(
      posmItems
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (item) => {
          let storageUrl: string | undefined;
          if (item.storageId) {
            storageUrl = (await ctx.storage.getUrl(item.storageId)) ?? undefined;
          }
          const isImageFile = item.fileType?.startsWith("image/") ?? false;
          return {
            id: item._id,
            title: item.name,
            url: item.downloadUrl || storageUrl || item.imageUrl || `${siteUrl}/posm`,
            // Preview only when we actually have an image (not e.g. a PDF)
            imageUrl: item.imageUrl || (isImageFile ? storageUrl : undefined),
          };
        })
    );

    return [
      { key: "product", label: "Nové produkty", items: byType("product") },
      { key: "company", label: "Novinky z firmy", items: byType("company") },
      { key: "materials", label: "Nové materiály", items: byType("materials") },
      { key: "posm", label: "POSM materiály", items: posmContent },
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
    imageUrl: v.optional(v.string()),
    blocks: v.optional(v.array(v.object({
      label: v.string(),
      content: v.string(),
    }))),
  })),
});

type ComposedSection = {
  title: string;
  items: Array<{
    title: string;
    url?: string;
    imageUrl?: string;
    blocks?: Array<{ label: string; content: string }>;
  }>;
};

// Build a clean, readable plain-text newsletter body from the composed sections.
function buildBody(intro: string | undefined, sections: ComposedSection[]): string {
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
      for (const block of item.blocks ?? []) {
        parts.push("");
        parts.push(`  ── ${block.label} ──`);
        parts.push(block.content.split("\n").map((l) => `  ${l}`).join("\n"));
      }
    }
    parts.push("");
  }

  return parts.join("\n").trimEnd();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Build an HTML newsletter body with section headings, linked titles and
// image previews. Inline styles only - email clients ignore stylesheets.
function buildHtml(intro: string | undefined, sections: ComposedSection[]): string {
  const blocks: string[] = [];

  if (intro && intro.trim()) {
    blocks.push(
      `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;white-space:pre-line;">${escapeHtml(intro.trim())}</p>`
    );
  }

  for (const section of sections) {
    if (section.items.length === 0) continue;
    blocks.push(
      `<h2 style="margin:28px 0 12px;font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#166534;border-bottom:2px solid #166534;padding-bottom:6px;">${escapeHtml(section.title)}</h2>`
    );
    for (const item of section.items) {
      const title = escapeHtml(item.title);
      const titleHtml = item.url
        ? `<a href="${escapeHtml(item.url)}" style="color:#2563eb;text-decoration:none;font-weight:600;">${title}</a>`
        : `<span style="font-weight:600;color:#111827;">${title}</span>`;
      const imageHtml = item.imageUrl
        ? `<td style="width:72px;padding-right:12px;vertical-align:top;"><img src="${escapeHtml(item.imageUrl)}" alt="" width="64" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;display:block;" /></td>`
        : "";
      const urlNote = item.url
        ? `<div style="font-size:12px;color:#9ca3af;word-break:break-all;margin-top:2px;">${escapeHtml(item.url)}</div>`
        : "";
      const blocksHtml = (item.blocks ?? [])
        .map(
          (b) =>
            `<div style="margin-top:10px;"><div style="font-size:11px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;color:#166534;margin-bottom:4px;">${escapeHtml(b.label)}</div><pre style="margin:0;padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-word;font-family:'Courier New',monospace;color:#374151;">${escapeHtml(b.content)}</pre></div>`
        )
        .join("");
      blocks.push(
        `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 12px;"><tr>${imageHtml}<td style="vertical-align:top;font-size:14px;line-height:1.5;">${titleHtml}${urlNote}${blocksHtml}</td></tr></table>`
      );
    }
  }

  return `<!DOCTYPE html>
<html lang="cs">
<body style="margin:0;padding:0;background:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e5e7eb;">
      ${blocks.join("\n")}
    </div>
    <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">Apotheke Sales Hub</p>
  </div>
</body>
</html>`;
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
    const html = buildHtml(args.intro, nonEmptySections);

    // Schedule one email per recipient, staggered ~2/s to respect
    // the email provider's rate limit (Resend allows 2 req/s).
    for (let i = 0; i < emails.length; i++) {
      await ctx.scheduler.runAfter(i * 600, internal.emails.deliverEmail, {
        email: emails[i],
        subject,
        content: body,
        html,
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
