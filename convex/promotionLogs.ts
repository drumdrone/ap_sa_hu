import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all promotion logs for a product (newest first)
export const getByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("promotionLogs")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .order("desc")
      .collect();
    
    // Get screenshot URLs
    const logsWithUrls = await Promise.all(
      logs.map(async (log) => {
        let screenshotUrl: string | null = null;
        if (log.screenshotStorageId) {
          screenshotUrl = await ctx.storage.getUrl(log.screenshotStorageId);
        }
        return { ...log, screenshotUrl };
      })
    );
    
    return logsWithUrls;
  },
});

// Add new promotion log
export const add = mutation({
  args: {
    productId: v.id("products"),
    title: v.string(),
    date: v.number(),
    url: v.optional(v.string()),
    screenshotStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("promotionLogs", {
      productId: args.productId,
      title: args.title,
      date: args.date,
      url: args.url,
      screenshotStorageId: args.screenshotStorageId,
      createdAt: Date.now(),
    });
  },
});

// Delete promotion log
export const remove = mutation({
  args: { id: v.id("promotionLogs") },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.id);
    if (log?.screenshotStorageId) {
      await ctx.storage.delete(log.screenshotStorageId);
    }
    await ctx.db.delete(args.id);
  },
});

// Generate upload URL for screenshot
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
