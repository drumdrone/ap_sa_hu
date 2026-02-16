import { v } from "convex/values"
import { mutation, query, action, internalMutation, internalQuery } from "./_generated/server"
import { internal } from "./_generated/api"

// Type for product data from XML feed (LuigisBox format)
interface FeedProduct {
  externalId: string // product_code_2 (SKU)
  name: string
  description?: string
  image?: string
  price: number
  productUrl?: string
  availability?: string
  brand?: string
  gtin?: string // ean
  productType?: string
  feedCategory?: string // Main category from primary category
  feedSubcategory?: string // Subcategory from primary category
}

// Parse category from "<category primary="true">Čaje | Sypané čaje</category>"
function parsePrimaryCategory(categoryText?: string): { feedCategory?: string; feedSubcategory?: string } {
  if (!categoryText) return {};
  
  const parts = categoryText.split("|").map(p => p.trim());
  return {
    feedCategory: parts[0] || undefined,
    feedSubcategory: parts[1] || undefined,
  };
}

// Mutation to upsert a single product from feed
export const upsertFromFeed = mutation({
  args: {
    externalId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    price: v.number(),
    productUrl: v.optional(v.string()),
    availability: v.optional(v.string()),
    brand: v.optional(v.string()),
    gtin: v.optional(v.string()),
    productType: v.optional(v.string()),
    feedCategory: v.optional(v.string()),
    feedSubcategory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find existing product by externalId
    const existing = await ctx.db
      .query("products")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first()

    const feedData = {
      externalId: args.externalId,
      name: args.name,
      description: args.description,
      image: args.image,
      price: args.price,
      productUrl: args.productUrl,
      availability: args.availability,
      brand: args.brand,
      gtin: args.gtin,
      productType: args.productType,
      feedCategory: args.feedCategory,
      feedSubcategory: args.feedSubcategory,
      lastSyncedAt: Date.now(),
    }

    if (existing) {
      // Update only feed data, preserve marketing data
      await ctx.db.patch(existing._id, feedData)
      console.log(`Updated product: ${args.name}`)
      return { action: "updated", id: existing._id }
    } else {
      // Create new product with feed data only
      const id = await ctx.db.insert("products", feedData)
      console.log(`Created product: ${args.name}`)
      return { action: "created", id }
    }
  },
})

// Internal mutation to batch upsert products (called from action)
export const batchUpsertFromFeed = internalMutation({
  args: {
    products: v.array(v.object({
      externalId: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      price: v.number(),
      productUrl: v.optional(v.string()),
      availability: v.optional(v.string()),
      brand: v.optional(v.string()),
      gtin: v.optional(v.string()),
      productType: v.optional(v.string()),
      feedCategory: v.optional(v.string()),
      feedSubcategory: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    let created = 0
    let updated = 0

    // Collect taxonomy updates for this chunk (so we don't patch taxonomy per-product)
    const taxonomyUpdates = new Map<string, Set<string>>()

    for (const product of args.products) {
      if (product.feedCategory) {
        if (!taxonomyUpdates.has(product.feedCategory)) {
          taxonomyUpdates.set(product.feedCategory, new Set<string>())
        }
        if (product.feedSubcategory) {
          taxonomyUpdates.get(product.feedCategory)!.add(product.feedSubcategory)
        }
      }

      const existing = await ctx.db
        .query("products")
        .withIndex("by_externalId", (q) => q.eq("externalId", product.externalId))
        .first()

      const feedData = {
        externalId: product.externalId,
        name: product.name,
        description: product.description,
        image: product.image,
        price: product.price,
        productUrl: product.productUrl,
        availability: product.availability,
        brand: product.brand,
        gtin: product.gtin,
        productType: product.productType,
        feedCategory: product.feedCategory,
        feedSubcategory: product.feedSubcategory,
        lastSyncedAt: Date.now(),
      }

      if (existing) {
        // Update only feed data, preserve marketing data
        await ctx.db.patch(existing._id, feedData)
        updated++
      } else {
        // Create new product
        const newProductId = await ctx.db.insert("products", feedData)
        created++

        // Check for backup data to restore
        const backup = await ctx.db
          .query("marketingBackup")
          .withIndex("by_sku", (q) => q.eq("sku", product.externalId))
          .first()

        if (backup) {
          // Restore marketing data from backup
          await ctx.db.patch(newProductId, {
            category: backup.category,
            salesClaim: backup.salesClaim,
            salesClaimSubtitle: backup.salesClaimSubtitle,
            whyBuy: backup.whyBuy,
            targetAudience: backup.targetAudience,
            pdfUrl: backup.pdfUrl,
            bannerUrls: backup.bannerUrls,
            socialFacebook: backup.socialFacebook,
            socialInstagram: backup.socialInstagram,
            socialFacebookImage: backup.socialFacebookImage,
            socialInstagramImage: backup.socialInstagramImage,
            hashtags: backup.hashtags,
            brandPillar: backup.brandPillar,
            tier: backup.tier,
            quickReferenceCard: backup.quickReferenceCard,
            faq: backup.faq,
            faqText: backup.faqText,
            salesForecast: backup.salesForecast,
            sensoryProfile: backup.sensoryProfile,
            seasonalOpportunities: backup.seasonalOpportunities,
            mainBenefits: backup.mainBenefits,
            herbComposition: backup.herbComposition,
            competitionComparison: backup.competitionComparison,
            articleUrls: backup.articleUrls,
            isTop: backup.isTop,
            topOrder: backup.topOrder,
            marketingLastUpdated: backup.backedUpAt,
            lastUpdatedField: "restored_from_backup",
          })
          console.log(`Restored marketing data from backup for SKU: ${product.externalId}`)

          // Restore gallery images from backup
          const galleryBackups = await ctx.db
            .query("galleryBackup")
            .withIndex("by_sku", (q) => q.eq("sku", product.externalId))
            .collect()

          for (const imgBackup of galleryBackups) {
            await ctx.db.insert("gallery", {
              productId: newProductId,
              storageId: imgBackup.storageId,
              filename: imgBackup.filename,
              contentType: imgBackup.contentType,
              size: imgBackup.size,
              tags: imgBackup.tags,
              uploadedAt: imgBackup.backedUpAt,
            })
            await ctx.db.delete(imgBackup._id)
          }
          if (galleryBackups.length > 0) {
            console.log(`Restored ${galleryBackups.length} gallery images for SKU: ${product.externalId}`)
          }
        }
      }
    }

    // Upsert taxonomy rows for the categories we touched in this chunk
    for (const [category, subsSet] of Array.from(taxonomyUpdates.entries())) {
      const existingTax = await ctx.db
        .query("feedTaxonomy")
        .withIndex("by_category", (q) => q.eq("category", category))
        .first()

      const incomingSubs = Array.from(subsSet) as string[]

      if (existingTax) {
        const merged = Array.from(
          new Set([...(existingTax.subcategories || []), ...incomingSubs])
        ).sort()
        await ctx.db.patch(existingTax._id, {
          subcategories: merged,
          updatedAt: Date.now(),
        })
      } else {
        await ctx.db.insert("feedTaxonomy", {
          category,
          subcategories: incomingSubs.sort(),
          updatedAt: Date.now(),
        })
      }
    }

    console.log(`Feed sync complete: ${created} created, ${updated} updated`)
    return { created, updated, total: args.products.length }
  },
})

// Query to get sync status
export const getSyncStatus = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect()
    const totalProducts = products.length
    const withMarketingData = products.filter(p => p.salesClaim || p.tier).length
    const lastSync = products.reduce((max, p) => 
      Math.max(max, p.lastSyncedAt || 0), 0
    )

    return {
      totalProducts,
      withMarketingData,
      lastSync: lastSync > 0 ? new Date(lastSync).toISOString() : null,
    }
  },
})

// Action to fetch and parse XML feed (runs on server)
export const syncFromFeed = action({
  args: {
    feedUrl: v.string(),
    limit: v.optional(v.number()), // Limit number of products to import
  },
  handler: async (ctx, args) => {
    console.log(`Fetching feed from: ${args.feedUrl}`)
    
    const response = await fetch(args.feedUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.status}`)
    }
    
    const xmlText = await response.text()
    console.log(`Received ${xmlText.length} bytes of XML`)
    
    // Parse XML manually (LuigisBox format)
    const products: FeedProduct[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match
    
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1]
      
      // LuigisBox format parsers
      const getTitle = (xml: string) => {
        const m = xml.match(/<title>([^<]*)<\/title>/)
        return m ? m[1].trim() : null
      }
      const getDescription = (xml: string) => {
        const m = xml.match(/<description>([\s\S]*?)<\/description>/)
        return m ? m[1].trim().replace(/&#13;\n/g, '\n').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : undefined
      }
      const getImageLink = (xml: string) => {
        // Use large image (image_link_l) for better quality
        const m = xml.match(/<image_link_l>([^<]*)<\/image_link_l>/)
        return m ? m[1].trim() : undefined
      }
      const getUrl = (xml: string) => {
        const m = xml.match(/<url>([^<]*)<\/url>/)
        return m ? m[1].trim() : undefined
      }
      const getPrice = (xml: string) => {
        // Use price_level_1 (retail price)
        const m = xml.match(/<price_level_1>([^<]*)<\/price_level_1>/)
        if (m) {
          const priceStr = m[1].replace(/[^\d.,]/g, '').replace(',', '.')
          return parseFloat(priceStr) || 0
        }
        return 0
      }
      const getAvailability = (xml: string) => {
        const m = xml.match(/<availability_rank_text>([\s\S]*?)<\/availability_rank_text>/)
        if (m) {
          // Extract text from HTML like '<span class="skladem">skladem > 10 ks</span>'
          const text = m[1].replace(/&lt;[^&]*&gt;/g, '').replace(/<[^>]*>/g, '').trim()
          return text || undefined
        }
        return undefined
      }
      const getBrand = (xml: string) => {
        const m = xml.match(/<brand>([^<]*)<\/brand>/)
        return m ? m[1].trim() : undefined
      }
      const getEan = (xml: string) => {
        const m = xml.match(/<ean>([^<]*)<\/ean>/)
        return m ? m[1].trim() : undefined
      }
      const getProductCode2 = (xml: string) => {
        // This is the SKU we use as externalId
        const m = xml.match(/<product_code_2>([^<]*)<\/product_code_2>/)
        return m ? m[1].trim() : null
      }
      const getPrimaryCategory = (xml: string) => {
        // Get category with primary="true"
        const m = xml.match(/<category primary="true">([^<]*)<\/category>/)
        return m ? m[1].trim() : undefined
      }
      
      const externalId = getProductCode2(itemXml)
      const name = getTitle(itemXml)
      
      if (externalId && name) {
        const categoryParts = parsePrimaryCategory(getPrimaryCategory(itemXml))
        
        products.push({
          externalId,
          name,
          description: getDescription(itemXml),
          image: getImageLink(itemXml),
          price: getPrice(itemXml),
          productUrl: getUrl(itemXml),
          availability: getAvailability(itemXml),
          brand: getBrand(itemXml),
          gtin: getEan(itemXml),
          productType: getPrimaryCategory(itemXml),
          feedCategory: categoryParts.feedCategory,
          feedSubcategory: categoryParts.feedSubcategory,
        })
      }
      
      // Apply limit if specified
      if (args.limit && products.length >= args.limit) {
        break
      }
    }
    
    console.log(`Parsed ${products.length} products from feed`)
    
    // Batch upsert in chunks of 50
    const chunkSize = 50
    let totalCreated = 0
    let totalUpdated = 0
    
    for (let i = 0; i < products.length; i += chunkSize) {
      const chunk = products.slice(i, i + chunkSize)
      const result = await ctx.runMutation(internal.feedImport.batchUpsertFromFeed, {
        products: chunk,
      })
      totalCreated += result.created
      totalUpdated += result.updated
    }
    
    return {
      success: true,
      totalProducts: products.length,
      created: totalCreated,
      updated: totalUpdated,
    }
  },
})

// Type for orphaned product result
type OrphanedProduct = { _id: string; externalId: string; name: string; hasMarketingData: boolean }

// Internal query to find orphaned products (called from action)
export const findOrphanedProducts = internalQuery({
  args: {
    feedSkus: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<OrphanedProduct[]> => {
    const feedSkuSet = new Set(args.feedSkus)
    const orphaned: OrphanedProduct[] = []

    // Get all products
    const products = await ctx.db.query("products").collect()
    
    for (const product of products) {
      // Product is orphaned if it has an externalId AND that ID is not in the feed
      if (product.externalId && !feedSkuSet.has(product.externalId)) {
        orphaned.push({
          _id: product._id,
          externalId: product.externalId,
          name: product.name,
          hasMarketingData: !!(product.salesClaim || product.tier || product.brandPillar),
        })
      }
    }

    return orphaned
  },
})

// Action to find orphaned products - fetches feed directly on Convex server
export const checkOrphanedProducts = action({
  args: {
    feedUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ orphanedProducts: OrphanedProduct[]; feedSkusCount: number }> => {
    console.log(`Fetching feed for orphan check: ${args.feedUrl}`)
    
    // Fetch feed on Convex server
    const response = await fetch(args.feedUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.status}`)
    }
    const xmlText = await response.text()
    
    // Extract all SKUs from feed
    const skuRegex = /<product_code_2>([^<]*)<\/product_code_2>/g
    const feedSkus: string[] = []
    let match
    while ((match = skuRegex.exec(xmlText)) !== null) {
      if (match[1]) feedSkus.push(match[1].trim())
    }
    console.log(`Found ${feedSkus.length} SKUs in feed`)
    
    // Get orphaned products using internal query
    const orphaned = await ctx.runQuery(internal.feedImport.findOrphanedProducts, {
      feedSkus,
    })
    
    return { orphanedProducts: orphaned, feedSkusCount: feedSkus.length }
  },
})

// Backup marketing data and gallery for a product before deletion
export const backupProductData = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId)
    if (!product || !product.externalId) {
      return { backed: false, reason: "No product or externalId" }
    }

    const sku = product.externalId
    const hasMarketingData = !!(
      product.salesClaim || product.tier || product.brandPillar ||
      product.socialFacebook || product.socialInstagram || product.whyBuy ||
      product.quickReferenceCard || product.faq || product.isTop
    )

    // Only backup if there's marketing data worth saving
    if (hasMarketingData) {
      // Check if backup already exists for this SKU
      const existingBackup = await ctx.db
        .query("marketingBackup")
        .withIndex("by_sku", (q) => q.eq("sku", sku))
        .first()

      if (existingBackup) {
        // Update existing backup
        await ctx.db.patch(existingBackup._id, {
          category: product.category,
          salesClaim: product.salesClaim,
          salesClaimSubtitle: product.salesClaimSubtitle,
          whyBuy: product.whyBuy,
          targetAudience: product.targetAudience,
          pdfUrl: product.pdfUrl,
          bannerUrls: product.bannerUrls,
          socialFacebook: product.socialFacebook,
          socialInstagram: product.socialInstagram,
          socialFacebookImage: product.socialFacebookImage,
          socialInstagramImage: product.socialInstagramImage,
          hashtags: product.hashtags,
          brandPillar: product.brandPillar,
          tier: product.tier,
          quickReferenceCard: product.quickReferenceCard,
          faq: product.faq,
          faqText: product.faqText,
          salesForecast: product.salesForecast,
          sensoryProfile: product.sensoryProfile,
          seasonalOpportunities: product.seasonalOpportunities,
          mainBenefits: product.mainBenefits,
          herbComposition: product.herbComposition,
          competitionComparison: product.competitionComparison,
          articleUrls: product.articleUrls,
          isTop: product.isTop,
          topOrder: product.topOrder,
          backedUpAt: Date.now(),
          originalProductName: product.name,
        })
        console.log(`Updated marketing backup for SKU: ${sku}`)
      } else {
        // Create new backup
        await ctx.db.insert("marketingBackup", {
          sku,
          category: product.category,
          salesClaim: product.salesClaim,
          salesClaimSubtitle: product.salesClaimSubtitle,
          whyBuy: product.whyBuy,
          targetAudience: product.targetAudience,
          pdfUrl: product.pdfUrl,
          bannerUrls: product.bannerUrls,
          socialFacebook: product.socialFacebook,
          socialInstagram: product.socialInstagram,
          socialFacebookImage: product.socialFacebookImage,
          socialInstagramImage: product.socialInstagramImage,
          hashtags: product.hashtags,
          brandPillar: product.brandPillar,
          tier: product.tier,
          quickReferenceCard: product.quickReferenceCard,
          faq: product.faq,
          faqText: product.faqText,
          salesForecast: product.salesForecast,
          sensoryProfile: product.sensoryProfile,
          seasonalOpportunities: product.seasonalOpportunities,
          mainBenefits: product.mainBenefits,
          herbComposition: product.herbComposition,
          competitionComparison: product.competitionComparison,
          articleUrls: product.articleUrls,
          isTop: product.isTop,
          topOrder: product.topOrder,
          backedUpAt: Date.now(),
          originalProductName: product.name,
        })
        console.log(`Created marketing backup for SKU: ${sku}`)
      }
    }

    // Backup gallery images
    const galleryImages = await ctx.db
      .query("gallery")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect()

    for (const img of galleryImages) {
      // Check if this image is already backed up
      const existingImgBackup = await ctx.db
        .query("galleryBackup")
        .withIndex("by_sku", (q) => q.eq("sku", sku))
        .filter((q) => q.eq(q.field("storageId"), img.storageId))
        .first()

      if (!existingImgBackup) {
        await ctx.db.insert("galleryBackup", {
          sku,
          storageId: img.storageId,
          filename: img.filename,
          contentType: img.contentType,
          size: img.size,
          tags: img.tags,
          backedUpAt: Date.now(),
        })
      }
      // Delete original gallery entry (storage file remains)
      await ctx.db.delete(img._id)
    }

    console.log(`Backed up ${galleryImages.length} gallery images for SKU: ${sku}`)
    return { 
      backed: true, 
      marketingData: hasMarketingData,
      galleryImages: galleryImages.length 
    }
  },
})

// Delete orphaned products (those not in feed) WITH backup
export const deleteOrphanedProducts = mutation({
  args: {
    productIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    let deleted = 0
    let backedUp = 0

    for (const id of args.productIds) {
      const product = await ctx.db.get(id)
      if (!product) continue

      // Backup marketing data if exists
      if (product.externalId) {
        const sku = product.externalId
        const hasMarketingData = !!(
          product.salesClaim || product.tier || product.brandPillar ||
          product.socialFacebook || product.socialInstagram || product.whyBuy ||
          product.quickReferenceCard || product.faq || product.isTop
        )

        if (hasMarketingData) {
          const existingBackup = await ctx.db
            .query("marketingBackup")
            .withIndex("by_sku", (q) => q.eq("sku", sku))
            .first()

          const backupData = {
            sku,
            category: product.category,
            salesClaim: product.salesClaim,
            salesClaimSubtitle: product.salesClaimSubtitle,
            whyBuy: product.whyBuy,
            targetAudience: product.targetAudience,
            pdfUrl: product.pdfUrl,
            bannerUrls: product.bannerUrls,
            socialFacebook: product.socialFacebook,
            socialInstagram: product.socialInstagram,
            socialFacebookImage: product.socialFacebookImage,
            socialInstagramImage: product.socialInstagramImage,
            hashtags: product.hashtags,
            brandPillar: product.brandPillar,
            tier: product.tier,
            quickReferenceCard: product.quickReferenceCard,
            faq: product.faq,
            faqText: product.faqText,
            salesForecast: product.salesForecast,
            sensoryProfile: product.sensoryProfile,
            seasonalOpportunities: product.seasonalOpportunities,
            mainBenefits: product.mainBenefits,
            herbComposition: product.herbComposition,
            articleUrls: product.articleUrls,
            isTop: product.isTop,
            topOrder: product.topOrder,
            backedUpAt: Date.now(),
            originalProductName: product.name,
          }

          if (existingBackup) {
            await ctx.db.patch(existingBackup._id, backupData)
          } else {
            await ctx.db.insert("marketingBackup", backupData)
          }
          backedUp++
        }

        // Backup gallery images (sku defined above)
        const galleryImages = await ctx.db
          .query("gallery")
          .withIndex("by_product", (q) => q.eq("productId", id))
          .collect()

        for (const img of galleryImages) {
          const existingImgBackup = await ctx.db
            .query("galleryBackup")
            .withIndex("by_sku", (q) => q.eq("sku", sku))
            .filter((q) => q.eq(q.field("storageId"), img.storageId))
            .first()

          if (!existingImgBackup) {
            await ctx.db.insert("galleryBackup", {
              sku,
              storageId: img.storageId,
              filename: img.filename,
              contentType: img.contentType,
              size: img.size,
              tags: img.tags,
              backedUpAt: Date.now(),
            })
          }
          await ctx.db.delete(img._id)
        }
      }

      await ctx.db.delete(id)
      deleted++
    }
    console.log(`Deleted ${deleted} orphaned products, backed up ${backedUp} with marketing data`)
    return { deleted, backedUp }
  },
})

// Restore marketing data from backup for a product
export const restoreFromBackup = mutation({
  args: {
    productId: v.id("products"),
    sku: v.string(),
  },
  handler: async (ctx, args) => {
    // Find backup by SKU
    const backup = await ctx.db
      .query("marketingBackup")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .first()

    if (!backup) {
      return { restored: false, reason: "No backup found" }
    }

    // Restore marketing data
    await ctx.db.patch(args.productId, {
      category: backup.category,
      salesClaim: backup.salesClaim,
      salesClaimSubtitle: backup.salesClaimSubtitle,
      whyBuy: backup.whyBuy,
      targetAudience: backup.targetAudience,
      pdfUrl: backup.pdfUrl,
      bannerUrls: backup.bannerUrls,
      socialFacebook: backup.socialFacebook,
      socialInstagram: backup.socialInstagram,
      socialFacebookImage: backup.socialFacebookImage,
      socialInstagramImage: backup.socialInstagramImage,
      hashtags: backup.hashtags,
      brandPillar: backup.brandPillar,
      tier: backup.tier,
      quickReferenceCard: backup.quickReferenceCard,
      faq: backup.faq,
      faqText: backup.faqText,
      salesForecast: backup.salesForecast,
      sensoryProfile: backup.sensoryProfile,
      seasonalOpportunities: backup.seasonalOpportunities,
      mainBenefits: backup.mainBenefits,
      herbComposition: backup.herbComposition,
      articleUrls: backup.articleUrls,
      isTop: backup.isTop,
      topOrder: backup.topOrder,
      marketingLastUpdated: backup.backedUpAt,
      lastUpdatedField: "restored_from_backup",
    })

    // Restore gallery images
    const galleryBackups = await ctx.db
      .query("galleryBackup")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .collect()

    for (const imgBackup of galleryBackups) {
      // Create gallery entry for this product
      await ctx.db.insert("gallery", {
        productId: args.productId,
        storageId: imgBackup.storageId,
        filename: imgBackup.filename,
        contentType: imgBackup.contentType,
        size: imgBackup.size,
        tags: imgBackup.tags,
        uploadedAt: imgBackup.backedUpAt,
      })
      // Delete backup entry
      await ctx.db.delete(imgBackup._id)
    }

    console.log(`Restored marketing data and ${galleryBackups.length} images for SKU: ${args.sku}`)
    return { 
      restored: true, 
      galleryImagesRestored: galleryBackups.length 
    }
  },
})

// Get backup statistics
export const getBackupStats = query({
  args: {},
  handler: async (ctx) => {
    const marketingBackups = await ctx.db.query("marketingBackup").collect()
    const galleryBackups = await ctx.db.query("galleryBackup").collect()

    return {
      marketingBackups: marketingBackups.length,
      galleryBackups: galleryBackups.length,
      skusWithBackup: Array.from(new Set(marketingBackups.map(b => b.sku))).length,
    }
  },
})

// List all marketing backups with details
export const listMarketingBackups = query({
  args: {},
  handler: async (ctx) => {
    const backups = await ctx.db.query("marketingBackup").collect()
    return backups.map(b => ({
      _id: b._id,
      sku: b.sku,
      originalProductName: b.originalProductName,
      isTop: b.isTop,
      topOrder: b.topOrder,
      salesClaim: b.salesClaim,
      tier: b.tier,
      backedUpAt: b.backedUpAt,
    }))
  },
})

// Restore backup to a product by providing the product ID and backup SKU
export const restoreBackupToProduct = mutation({
  args: {
    productId: v.id("products"),
    backupSku: v.string(),
  },
  handler: async (ctx, args) => {
    const backup = await ctx.db
      .query("marketingBackup")
      .withIndex("by_sku", (q) => q.eq("sku", args.backupSku))
      .first()
    
    if (!backup) {
      return { restored: false, reason: `No backup found for SKU: ${args.backupSku}` }
    }
    
    // Restore marketing data
    await ctx.db.patch(args.productId, {
      category: backup.category,
      salesClaim: backup.salesClaim,
      salesClaimSubtitle: backup.salesClaimSubtitle,
      whyBuy: backup.whyBuy,
      targetAudience: backup.targetAudience,
      pdfUrl: backup.pdfUrl,
      bannerUrls: backup.bannerUrls,
      socialFacebook: backup.socialFacebook,
      socialInstagram: backup.socialInstagram,
      socialFacebookImage: backup.socialFacebookImage,
      socialInstagramImage: backup.socialInstagramImage,
      hashtags: backup.hashtags,
      brandPillar: backup.brandPillar,
      tier: backup.tier,
      quickReferenceCard: backup.quickReferenceCard,
      faq: backup.faq,
      faqText: backup.faqText,
      salesForecast: backup.salesForecast,
      sensoryProfile: backup.sensoryProfile,
      seasonalOpportunities: backup.seasonalOpportunities,
      mainBenefits: backup.mainBenefits,
      herbComposition: backup.herbComposition,
      articleUrls: backup.articleUrls,
      isTop: backup.isTop,
      topOrder: backup.topOrder,
      marketingLastUpdated: Date.now(),
      lastUpdatedField: "restored_from_backup",
    })
    
    // Restore gallery images
    const galleryBackups = await ctx.db
      .query("galleryBackup")
      .withIndex("by_sku", (q) => q.eq("sku", args.backupSku))
      .collect()
    
    for (const imgBackup of galleryBackups) {
      const existingImg = await ctx.db
        .query("gallery")
        .withIndex("by_product", (q) => q.eq("productId", args.productId))
        .filter((q) => q.eq(q.field("storageId"), imgBackup.storageId))
        .first()
      
      if (!existingImg) {
        await ctx.db.insert("gallery", {
          productId: args.productId,
          storageId: imgBackup.storageId,
          filename: imgBackup.filename,
          contentType: imgBackup.contentType,
          size: imgBackup.size,
          tags: imgBackup.tags,
          uploadedAt: Date.now(),
        })
      }
      await ctx.db.delete(imgBackup._id)
    }
    
    console.log(`Restored backup SKU ${args.backupSku} to product ${args.productId}`)
    return { restored: true, galleryImages: galleryBackups.length }
  },
})

// Find product by name (partial match)
export const findProductByName = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withSearchIndex("search_name", (q) => q.search("name", args.name))
      .take(10)
    return products.map(p => ({
      _id: p._id,
      name: p.name,
      externalId: p.externalId,
      isTop: p.isTop,
      topOrder: p.topOrder,
    }))
  },
})

// Restore ALL backups to their matching products
export const restoreAllBackups = mutation({
  args: {},
  handler: async (ctx) => {
    const backups = await ctx.db.query("marketingBackup").collect()
    let restored = 0
    let notFound = 0
    
    for (const backup of backups) {
      // Find product by SKU (externalId)
      const product = await ctx.db
        .query("products")
        .withIndex("by_externalId", (q) => q.eq("externalId", backup.sku))
        .first()
      
      if (product) {
        await ctx.db.patch(product._id, {
          category: backup.category,
          salesClaim: backup.salesClaim,
          salesClaimSubtitle: backup.salesClaimSubtitle,
          whyBuy: backup.whyBuy,
          targetAudience: backup.targetAudience,
          pdfUrl: backup.pdfUrl,
          bannerUrls: backup.bannerUrls,
          socialFacebook: backup.socialFacebook,
          socialInstagram: backup.socialInstagram,
          socialFacebookImage: backup.socialFacebookImage,
          socialInstagramImage: backup.socialInstagramImage,
          hashtags: backup.hashtags,
          brandPillar: backup.brandPillar,
          tier: backup.tier,
          quickReferenceCard: backup.quickReferenceCard,
          faq: backup.faq,
          faqText: backup.faqText,
          salesForecast: backup.salesForecast,
          sensoryProfile: backup.sensoryProfile,
          seasonalOpportunities: backup.seasonalOpportunities,
          mainBenefits: backup.mainBenefits,
          herbComposition: backup.herbComposition,
          articleUrls: backup.articleUrls,
          isTop: backup.isTop,
          topOrder: backup.topOrder,
          marketingLastUpdated: Date.now(),
          lastUpdatedField: "restored_from_backup",
        })
        console.log(`Restored backup for SKU: ${backup.sku} (${backup.originalProductName})`)
        restored++
        
        // Restore gallery images
        const galleryBackups = await ctx.db
          .query("galleryBackup")
          .withIndex("by_sku", (q) => q.eq("sku", backup.sku))
          .collect()
        
        for (const imgBackup of galleryBackups) {
          // Check if not already restored
          const existingImg = await ctx.db
            .query("gallery")
            .withIndex("by_product", (q) => q.eq("productId", product._id))
            .filter((q) => q.eq(q.field("storageId"), imgBackup.storageId))
            .first()
          
          if (!existingImg) {
            await ctx.db.insert("gallery", {
              productId: product._id,
              storageId: imgBackup.storageId,
              filename: imgBackup.filename,
              contentType: imgBackup.contentType,
              size: imgBackup.size,
              tags: imgBackup.tags,
              uploadedAt: Date.now(),
            })
          }
          await ctx.db.delete(imgBackup._id)
        }
      } else {
        console.log(`Product not found for SKU: ${backup.sku}`)
        notFound++
      }
    }
    
    return { restored, notFound }
  },
})
