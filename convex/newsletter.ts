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

// Recipient groups. A subscriber row belongs to exactly one group; the same
// e-mail may appear in several groups (one row each). Rows created before
// groups existed have no `group` and are treated as "mediate".
type SubscriberGroup = "mediate" | "sales";
const DEFAULT_GROUP: SubscriberGroup = "mediate";

function normalizeGroup(group?: string | null): SubscriberGroup {
  return group === "sales" ? "sales" : DEFAULT_GROUP;
}

// Derive a recipient's first name: prefer their stored name, otherwise take the
// first segment of the email's local part (e.g. "honza.hrodek@…" -> "Honza").
function firstNameFor(email: string, name?: string): string {
  if (name && name.trim()) return name.trim().split(/\s+/)[0];
  const seg = (email.split("@")[0] || "").split(/[._\-+]/)[0];
  return seg ? seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase() : "";
}

// Replace the {jmeno} token in the intro with the recipient's first name and
// tidy up the spacing left behind when the name is empty.
function personalizeIntro(intro: string | undefined, name: string): string | undefined {
  if (!intro) return intro;
  return intro
    .split("{jmeno}")
    .join(name)
    .replace(/ {2,}/g, " ")
    .replace(/\s+([,.])/g, "$1");
}

// List all subscribers (newest first)
export const listSubscribers = query({
  args: {},
  handler: async (ctx) => {
    const subs = await ctx.db.query("newsletterSubscribers").collect();
    return subs.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Add a single subscriber to a group. The same e-mail may exist in several
// groups; duplicates are only rejected within the same group.
export const addSubscriber = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    group: v.optional(v.union(v.literal("mediate"), v.literal("sales"))),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!isValidEmail(email)) {
      throw new Error("Neplatná e-mailová adresa: " + args.email);
    }
    const group = normalizeGroup(args.group);

    const existing = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    if (existing.some((e) => normalizeGroup(e.group) === group)) {
      throw new Error("Tato adresa už je v této skupině: " + email);
    }

    return await ctx.db.insert("newsletterSubscribers", {
      email,
      name: args.name?.trim() || undefined,
      group,
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
    group: v.optional(v.union(v.literal("mediate"), v.literal("sales"))),
  },
  handler: async (ctx, args) => {
    const group = normalizeGroup(args.group);
    const candidates = args.raw
      .split(/[\s,;]+/)
      .map((e) => normalizeEmail(e))
      .filter((e) => e.length > 0);

    // Duplicates are scoped to the target group only.
    const existing = await ctx.db.query("newsletterSubscribers").collect();
    const existingEmails = new Set(
      existing.filter((s) => normalizeGroup(s.group) === group).map((s) => s.email)
    );

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
        group,
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

// Update a subscriber's name and/or move them to another group.
export const updateSubscriber = mutation({
  args: {
    id: v.id("newsletterSubscribers"),
    name: v.optional(v.string()),
    group: v.optional(v.union(v.literal("mediate"), v.literal("sales"))),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.id);
    if (!sub) throw new Error("Odběratel nenalezen");

    const patch: { name?: string; group?: SubscriberGroup } = {
      name: args.name?.trim() || undefined,
    };

    if (args.group !== undefined) {
      const targetGroup = normalizeGroup(args.group);
      if (targetGroup !== normalizeGroup(sub.group)) {
        // Don't allow moving into a group where this e-mail already exists.
        const existing = await ctx.db
          .query("newsletterSubscribers")
          .withIndex("by_email", (q) => q.eq("email", sub.email))
          .collect();
        if (existing.some((e) => e._id !== sub._id && normalizeGroup(e.group) === targetGroup)) {
          throw new Error("Tato adresa už je v cílové skupině: " + sub.email);
        }
      }
      patch.group = targetGroup;
    }

    await ctx.db.patch(args.id, patch);
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

    // TOP products (curated list) - always link to the product detail page in
    // the Apotheke Sales Hub (not the public e-shop)
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
        url: `${siteUrl}/product/${p._id}`,
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
        // Drop **bold** markers - they only make sense in the HTML version.
        const plain = block.content.replace(/\*\*(.+?)\*\*/g, "$1");
        parts.push(plain.split("\n").map((l) => `  ${l}`).join("\n"));
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

// Turn a plain-text content block (with simple **bold** markers and bullet /
// numbered lines) into email-safe HTML. Outlook renders <pre>/monospace
// poorly, so we use a normal proportional font with <br> line breaks.
function formatBlockContent(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\r?\n/g, "<br>");
}

// Build an HTML newsletter body with section headings, linked titles and
// image previews. Inline styles only - email clients ignore stylesheets.
// Uses a centered, fixed-width table layout for reliable Outlook rendering.
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
      `<h2 style="margin:28px 0 14px;font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#ffffff;background:#166534;padding:10px 14px;border-radius:6px;">${escapeHtml(section.title)}</h2>`
    );
    for (const item of section.items) {
      const title = escapeHtml(item.title);
      const titleHtml = item.url
        ? `<a href="${escapeHtml(item.url)}" style="color:#2563eb;text-decoration:none;font-weight:600;">${title}</a>`
        : `<span style="font-weight:600;color:#111827;">${title}</span>`;
      const imageHtml = item.imageUrl
        ? `<td style="width:76px;padding-right:14px;vertical-align:top;"><img src="${escapeHtml(item.imageUrl)}" alt="" width="64" height="64" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;display:block;" /></td>`
        : "";
      const urlNote = item.url
        ? `<div style="font-size:12px;color:#9ca3af;word-break:break-all;margin-top:3px;">${escapeHtml(item.url)}</div>`
        : "";
      const blocksHtml = (item.blocks ?? [])
        .map(
          (b) =>
            `<div style="margin-top:12px;"><div style="font-size:11px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;color:#166534;margin-bottom:6px;">${escapeHtml(b.label)}</div><div style="padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;line-height:1.6;color:#374151;">${formatBlockContent(b.content)}</div></div>`
        )
        .join("");
      blocks.push(
        `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:0 0 18px;"><tr>${imageHtml}<td style="vertical-align:top;font-size:14px;line-height:1.5;">${titleHtml}${urlNote}${blocksHtml}</td></tr></table>`
      );
    }
  }

  return `<!DOCTYPE html>
<html lang="cs" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
</head>
<body style="margin:0;padding:0;background:#f3f4f6;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
          <tr>
            <td style="padding:28px;font-family:Arial,Helvetica,sans-serif;color:#374151;">
              ${blocks.join("\n")}
            </td>
          </tr>
        </table>
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9ca3af;">Apotheke Sales Hub</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
    group: v.optional(v.union(v.literal("mediate"), v.literal("sales"))),
    recipients: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const subject = args.subject.trim();
    if (!subject) throw new Error("Vyplňte předmět e-mailu.");

    const group = normalizeGroup(args.group);

    const nonEmptySections = args.sections.filter((s) => s.items.length > 0);
    if (nonEmptySections.length === 0) {
      throw new Error("Vyberte alespoň jednu položku k odeslání.");
    }

    // Resolve recipients: explicit list wins, otherwise all active subscribers
    // in the selected group.
    let emails: string[];
    if (args.recipients && args.recipients.length > 0) {
      emails = args.recipients.map((e) => normalizeEmail(e));
    } else {
      const subs = await ctx.db
        .query("newsletterSubscribers")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
      emails = subs
        .filter((s) => normalizeGroup(s.group) === group)
        .map((s) => s.email);
    }

    if (emails.length === 0) {
      throw new Error("Žádní aktivní odběratelé v této skupině k odeslání.");
    }

    // Look up subscriber names so the {jmeno} token can be personalized.
    const allSubs = await ctx.db.query("newsletterSubscribers").collect();
    const nameByEmail = new Map<string, string | undefined>(
      allSubs.map((s) => [normalizeEmail(s.email), s.name])
    );

    // Schedule one email per recipient, staggered ~2/s to respect
    // the email provider's rate limit (Resend allows 2 req/s).
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const intro = personalizeIntro(
        args.intro,
        firstNameFor(email, nameByEmail.get(normalizeEmail(email)))
      );
      await ctx.scheduler.runAfter(i * 600, internal.emails.deliverEmail, {
        email,
        subject,
        content: buildBody(intro, nonEmptySections),
        html: buildHtml(intro, nonEmptySections),
      });
    }

    await ctx.db.insert("newsletterLogs", {
      subject,
      intro: args.intro?.trim() || undefined,
      sections: nonEmptySections,
      recipientCount: emails.length,
      recipients: emails,
      group,
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
