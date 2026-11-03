import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const slides = await ctx.db
      .query("featuredSlides")
      .withIndex("by_date")
      .order("desc")
      .take(limit);

    return Promise.all(
      slides.map(async (slide) => {
        const product = await ctx.db.get(slide.productId);
        const resolvedImage = slide.imageStorageId
          ? await ctx.storage.getUrl(slide.imageStorageId)
          : slide.imageUrl ?? product?.image ?? null;
        return {
          ...slide,
          imageResolvedUrl: resolvedImage,
          productName: product?.name ?? null,
          productExternalId: product?.externalId ?? null,
        };
      })
    );
  },
});

export const listByProduct = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const slides = await ctx.db
      .query("featuredSlides")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    return Promise.all(
      slides
        .sort((a, b) => b.date - a.date)
        .map(async (slide) => ({
          ...slide,
          imageResolvedUrl: slide.imageStorageId
            ? await ctx.storage.getUrl(slide.imageStorageId)
            : slide.imageUrl ?? null,
        }))
    );
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    productId: v.id("products"),
    title: v.string(),
    date: v.number(),
    imageStorageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("featuredSlides", {
      productId: args.productId,
      title: args.title,
      date: args.date,
      imageStorageId: args.imageStorageId,
      imageUrl: args.imageUrl,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("featuredSlides"),
    title: v.optional(v.string()),
    date: v.optional(v.number()),
    imageStorageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    removeImage: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, removeImage, ...rest } = args;
    if (removeImage) {
      const existing = await ctx.db.get(id);
      if (existing?.imageStorageId) {
        await ctx.storage.delete(existing.imageStorageId);
      }
      await ctx.db.patch(id, { imageStorageId: undefined, imageUrl: undefined });
      return;
    }
    const clean = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: {
    id: v.id("featuredSlides"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing?.imageStorageId) {
      await ctx.storage.delete(existing.imageStorageId);
    }
    await ctx.db.delete(args.id);
  },
});
