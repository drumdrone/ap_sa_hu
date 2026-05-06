import { v } from "convex/values"
import { query, mutation } from "./_generated/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const editors = await ctx.db
      .query("editors")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    return editors.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const editors = await ctx.db.query("editors").collect();
    return editors.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    shortcut: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const shortcut = args.shortcut.trim().toUpperCase();
    if (!name || !shortcut) {
      throw new Error("Jméno i zkratka jsou povinné");
    }

    const existing = await ctx.db
      .query("editors")
      .withIndex("by_shortcut", (q) => q.eq("shortcut", shortcut))
      .first();
    if (existing) {
      throw new Error(`Editor se zkratkou "${shortcut}" již existuje`);
    }

    const id = await ctx.db.insert("editors", {
      name,
      shortcut,
      isActive: true,
      createdAt: Date.now(),
    });
    return { success: true, id };
  },
});

export const toggleActive = mutation({
  args: { id: v.id("editors") },
  handler: async (ctx, args) => {
    const editor = await ctx.db.get(args.id);
    if (!editor) throw new Error("Editor nenalezen");
    await ctx.db.patch(args.id, { isActive: !editor.isActive });
    return { success: true, isActive: !editor.isActive };
  },
});

export const remove = mutation({
  args: { id: v.id("editors") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
