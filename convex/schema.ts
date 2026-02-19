import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { authTables } from "@convex-dev/auth/server"

// Extend auth users table with custom fields
const customAuthTables = {
  ...authTables,
  users: defineTable({
    // Standard auth fields
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.float64()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.float64()),
    // Custom fields
    createdAt: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    passwordHash: v.optional(v.string()),
    role: v.optional(v.string()),
    tenantId: v.optional(v.string()),
    region: v.optional(v.string()),
  }),
};

export default defineSchema({
  ...customAuthTables,
  
  // Gallery images linked to products
  gallery: defineTable({
    productId: v.id("products"), // Link to product
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    tags: v.array(v.string()),
    uploadedAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_uploadedAt", ["uploadedAt"]),
  
  products: defineTable({
    // Feed data (from XML feed - auto-updated)
    externalId: v.optional(v.string()), // g:id from feed - used for matching
    name: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    price: v.optional(v.float64()),
    productUrl: v.optional(v.string()),
    availability: v.optional(v.string()),
    brand: v.optional(v.string()),
    gtin: v.optional(v.string()),
    productType: v.optional(v.string()), // g:product_type from feed
    feedCategory: v.optional(v.string()), // Main category from CATEGORYTEXT (e.g. "Čaje")
    feedSubcategory: v.optional(v.string()), // Subcategory from CATEGORYTEXT (e.g. "Čaje ve spolupráci...")
    lastSyncedAt: v.optional(v.number()), // timestamp of last feed sync
    
    // Marketing data (manually added in app - preserved during sync)
    category: v.optional(v.union(
      v.literal("Bylinný"),
      v.literal("Funkční"),
      v.literal("Dětský"),
      v.literal("BIO")
    )),
    salesClaim: v.optional(v.string()),
    salesClaimSubtitle: v.optional(v.string()),
    whyBuy: v.optional(v.array(v.object({
      icon: v.string(),
      text: v.string(),
    }))),
    targetAudience: v.optional(v.string()),
    pdfUrl: v.optional(v.string()),
    bannerUrls: v.optional(v.array(v.object({
      size: v.string(),
      url: v.string(),
    }))),
    socialFacebook: v.optional(v.string()),
    socialInstagram: v.optional(v.string()),
    socialFacebookImage: v.optional(v.string()), // URL for Facebook image
    socialInstagramImage: v.optional(v.string()), // URL for Instagram image
    hashtags: v.optional(v.array(v.string())),
    brandPillar: v.optional(v.union(
      v.literal("Věda"),
      v.literal("BIO"),
      v.literal("Funkce"),
      v.literal("Tradice"),
      v.literal("Rodina")
    )),
    tier: v.optional(v.union(v.literal("A"), v.literal("B"), v.literal("C"))),
    quickReferenceCard: v.optional(v.string()), // ASCII formatted quick reference card
    faq: v.optional(v.array(v.object({
      question: v.string(),
      answer: v.string(),
    }))),
    faqText: v.optional(v.string()), // Formatted FAQ text (like quick reference card)
    salesForecast: v.optional(v.string()), // ASCII formatted sales forecast chart
    sensoryProfile: v.optional(v.string()), // ASCII formatted sensory profile
    seasonalOpportunities: v.optional(v.string()), // ASCII formatted seasonal opportunities table
    mainBenefits: v.optional(v.string()), // ASCII formatted 3 main product benefits
    herbComposition: v.optional(v.string()), // ASCII formatted herb composition chart
    competitionComparison: v.optional(v.string()), // ASCII formatted competition comparison
    articleUrls: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
    }))),
    videoUrl: v.optional(v.string()), // URL for product video (MP4)
    // Activity tracking
    marketingLastUpdated: v.optional(v.number()), // timestamp when marketing data was last changed
    lastUpdatedField: v.optional(v.string()), // which field was updated last
    dismissedAlerts: v.optional(v.array(v.string())), // IDs of dismissed alerts
    // Top products feature
    isTop: v.optional(v.boolean()), // true if product is in Top 10
    topAddedAt: v.optional(v.number()), // timestamp when added to top
    topOrder: v.optional(v.number()), // position 1-10 in Top 10
  })
    .index("by_externalId", ["externalId"])
    .index("by_isTop", ["isTop"])
    .searchIndex("search_name", {
      searchField: "name",
    }),

  // Feed taxonomy (small table for fast filtering)
  feedTaxonomy: defineTable({
    category: v.string(),
    subcategories: v.array(v.string()),
    updatedAt: v.number(),
  }).index("by_category", ["category"]),
  
  // POSM Items - catalog of available materials
  posmItems: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("letak"),
      v.literal("stojan"),
      v.literal("plakat"),
      v.literal("wobler"),
      v.literal("display"),
      v.literal("cenovka"),
      v.literal("other")
    ),
    imageUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")), // Convex storage ID for uploaded files
    downloadUrl: v.optional(v.string()), // External download URL (for download type materials)
    distributionType: v.optional(v.union(
      v.literal("download"),  // ke stažení
      v.literal("order")      // k objednání
    )),
    sizes: v.optional(v.array(v.string())), // e.g. ["A4", "A5", "A3"]
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_active", ["isActive"]),
  
  // POSM Orders
  posmOrders: defineTable({
    itemId: v.id("posmItems"),
    quantity: v.number(),
    selectedSize: v.optional(v.string()), // selected size from item.sizes
    note: v.optional(v.string()),
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    deliveryAddress: v.optional(v.string()),
    status: v.union(
      v.literal("new"),
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_item", ["itemId"])
    .index("by_createdAt", ["createdAt"]),
  
  // Business opportunities (seasonal events, holidays)
  opportunities: defineTable({
    slug: v.string(), // unique identifier (e.g. "valentyn", "vanoce")
    name: v.string(),
    date: v.string(), // e.g. "14. února"
    description: v.string(),
    icon: v.string(), // emoji
    color: v.string(), // tailwind gradient classes
    bgColor: v.string(),
    borderColor: v.string(),
    instructions: v.optional(v.string()), // quick reference - pokyny k akci
    tip: v.optional(v.string()), // quick tip for salespeople
    onlineBanners: v.optional(v.string()), // URLs or description of online banners
    printFlyers: v.optional(v.string()), // URLs or description of print flyers
    productIds: v.optional(v.array(v.id("products"))), // assigned products
    posmItemIds: v.optional(v.array(v.id("posmItems"))), // related POSM materials
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"]),
  
  // Promotion logs - history of product promotions
  promotionLogs: defineTable({
    productId: v.id("products"),
    title: v.string(), // e.g. "TV Reklama", "Facebook Ads", "Billboard"
    date: v.number(), // timestamp
    url: v.optional(v.string()), // optional link
    screenshotStorageId: v.optional(v.id("_storage")), // optional screenshot
    createdAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_date", ["date"]),
  
  // Marketing data backup (by SKU for recovery after product deletion)
  marketingBackup: defineTable({
    sku: v.string(), // externalId of the product
    // Marketing data fields
    category: v.optional(v.union(
      v.literal("Bylinný"),
      v.literal("Funkční"),
      v.literal("Dětský"),
      v.literal("BIO")
    )),
    salesClaim: v.optional(v.string()),
    salesClaimSubtitle: v.optional(v.string()),
    whyBuy: v.optional(v.array(v.object({
      icon: v.string(),
      text: v.string(),
    }))),
    targetAudience: v.optional(v.string()),
    pdfUrl: v.optional(v.string()),
    bannerUrls: v.optional(v.array(v.object({
      size: v.string(),
      url: v.string(),
    }))),
    socialFacebook: v.optional(v.string()),
    socialInstagram: v.optional(v.string()),
    socialFacebookImage: v.optional(v.string()),
    socialInstagramImage: v.optional(v.string()),
    hashtags: v.optional(v.array(v.string())),
    brandPillar: v.optional(v.union(
      v.literal("Věda"),
      v.literal("BIO"),
      v.literal("Funkce"),
      v.literal("Tradice"),
      v.literal("Rodina")
    )),
    tier: v.optional(v.union(v.literal("A"), v.literal("B"), v.literal("C"))),
    quickReferenceCard: v.optional(v.string()),
    faq: v.optional(v.array(v.object({
      question: v.string(),
      answer: v.string(),
    }))),
    faqText: v.optional(v.string()),
    salesForecast: v.optional(v.string()),
    sensoryProfile: v.optional(v.string()),
    seasonalOpportunities: v.optional(v.string()),
    mainBenefits: v.optional(v.string()),
    herbComposition: v.optional(v.string()),
    competitionComparison: v.optional(v.string()),
    articleUrls: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
    }))),
    videoUrl: v.optional(v.string()),
    isTop: v.optional(v.boolean()),
    topOrder: v.optional(v.number()),
    // Backup metadata
    backedUpAt: v.number(),
    originalProductName: v.optional(v.string()), // For reference
  }).index("by_sku", ["sku"]),

  // Gallery backup (by SKU for recovery after product deletion)
  galleryBackup: defineTable({
    sku: v.string(), // externalId of the product
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    tags: v.array(v.string()),
    backedUpAt: v.number(),
  }).index("by_sku", ["sku"]),

  // News/Log entries for dashboard
  news: defineTable({
    type: v.union(
      v.literal("product"),   // Novinky produkty
      v.literal("company"),   // Novinka firma
      v.literal("materials")  // Novinky materiály
    ),
    title: v.string(),
    content: v.optional(v.string()),
    // For product news - can reference SKUs
    skus: v.optional(v.array(v.string())), // e.g. ["004083", "ZV0254"]
    url: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")), // Custom uploaded image
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_createdAt", ["createdAt"]),
})
