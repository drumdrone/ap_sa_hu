import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    const logs = await ctx.db
      .query("uploadLogs")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);

    const withProduct = await Promise.all(
      logs.map(async (log) => {
        const product = log.productId ? await ctx.db.get(log.productId) : null;
        return {
          ...log,
          productName: product?.name ?? null,
        };
      }),
    );

    return withProduct;
  },
});

export const log = mutation({
  args: {
    kind: v.union(v.literal("gallery_image"), v.literal("product_pdf")),
    productId: v.optional(v.id("products")),
    storageId: v.optional(v.id("_storage")),
    filename: v.optional(v.string()),
    contentType: v.optional(v.string()),
    size: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("uploadLogs", {
      kind: args.kind,
      productId: args.productId,
      storageId: args.storageId,
      filename: args.filename,
      contentType: args.contentType,
      size: args.size,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("uploadLogs"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

