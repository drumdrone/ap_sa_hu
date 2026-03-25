import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const latest = await ctx.db
      .query("newsTicker")
      .withIndex("by_updatedAt")
      .order("desc")
      .first();
    return latest ?? null;
  },
});

export const setText = mutation({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.text.trim();
    const existing = await ctx.db.query("newsTicker").first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { text: trimmed, updatedAt: now });
      return { ok: true, id: existing._id };
    }
    const id = await ctx.db.insert("newsTicker", { text: trimmed, updatedAt: now });
    return { ok: true, id };
  },
});

