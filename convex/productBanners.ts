import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByProduct = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("productBanners")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .order("desc")
      .collect();

    return Promise.all(
      rows.map(async (banner) => {
        const url = await ctx.storage.getUrl(banner.storageId);
        return { ...banner, url };
      }),
    );
  },
});

export const save = mutation({
  args: {
    productId: v.id("products"),
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    width: v.number(),
    height: v.number(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("productBanners", {
      productId: args.productId,
      storageId: args.storageId,
      filename: args.filename,
      contentType: args.contentType,
      size: args.size,
      width: args.width,
      height: args.height,
      tags: args.tags,
      uploadedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("productBanners"),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return;
    await ctx.storage.delete(row.storageId);
    await ctx.db.delete(args.id);
  },
});

