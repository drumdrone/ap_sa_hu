import { NextResponse } from "next/server"
import { fetchAction, fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import { readFileSync } from "fs"
import { join } from "path"

// Default feed URL (LuigisBox format)
const DEFAULT_FEED_URL = "https://www.apotheke.cz/xml-feeds/apotheke-luigisbox-products.xml"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    
    // Handle checkOrphans action - runs entirely on Convex server
    if (body.action === "checkOrphans") {
      const feedUrl = body.feedUrl || DEFAULT_FEED_URL
      
      // Run action on Convex server (fetches feed and compares)
      const result = await fetchAction(api.feedImport.checkOrphanedProducts, {
        feedUrl,
      })
      return NextResponse.json(result)
    }
    
    // Handle searchProducts action - search products by name
    if (body.action === "searchProducts") {
      const query = body.query || ""
      const products = await fetchQuery(api.feedImport.findProductByName, {
        name: query,
      })
      return NextResponse.json({ products })
    }
    
    // Handle restoreFromSeed action - restore marketing data from seed export
    if (body.action === "restoreFromSeed") {
      // Read seed products file
      const seedPath = join(process.cwd(), "convex/seed/products/documents.jsonl")
      const seedContent = readFileSync(seedPath, "utf-8")
      const seedProducts = seedContent
        .split("\n")
        .filter((line: string) => line.trim())
        .map((line: string) => JSON.parse(line))

      // Marketing fields to extract
      const marketingFields = [
        "category", "salesClaim", "salesClaimSubtitle", "whyBuy", "targetAudience",
        "pdfUrl", "bannerUrls", "socialFacebook", "socialInstagram", "socialFacebookImage",
        "socialInstagramImage", "hashtags", "brandPillar", "tier", "quickReferenceCard",
        "faq", "faqText", "salesForecast", "sensoryProfile", "seasonalOpportunities",
        "mainBenefits", "herbComposition", "competitionComparison", "articleUrls",
        "isTop", "topOrder"
      ]

      // Filter products that have marketing data AND a valid externalId
      const productsWithMarketing = seedProducts
        .filter((p: Record<string, unknown>) => {
          if (!p.externalId) return false
          return marketingFields.some((f) => p[f] !== undefined && p[f] !== null)
        })
        .map((p: Record<string, unknown>) => {
          const result: Record<string, unknown> = { externalId: p.externalId }
          for (const f of marketingFields) {
            if (p[f] !== undefined && p[f] !== null) {
              result[f] = p[f]
            }
          }
          return result
        })

      // Also restore from marketingBackup seed
      const backupPath = join(process.cwd(), "convex/seed/marketingBackup/documents.jsonl")
      const backupContent = readFileSync(backupPath, "utf-8")
      const backups = backupContent
        .split("\n")
        .filter((line: string) => line.trim())
        .map((line: string) => JSON.parse(line))

      // Add backup products that aren't already in the list
      const existingSkus = new Set(productsWithMarketing.map((p: Record<string, unknown>) => p.externalId))
      for (const backup of backups) {
        if (backup.sku && !existingSkus.has(backup.sku)) {
          const result: Record<string, unknown> = { externalId: backup.sku }
          for (const f of marketingFields) {
            if (backup[f] !== undefined && backup[f] !== null) {
              result[f] = backup[f]
            }
          }
          if (Object.keys(result).length > 1) {
            productsWithMarketing.push(result)
          }
        }
      }

      if (productsWithMarketing.length === 0) {
        return NextResponse.json({ restored: 0, notFound: 0, message: "No marketing data found in seed" })
      }

      // Call mutation to restore
      const restoreResult = await fetchMutation(api.products.restoreMarketingFromSeed, {
        products: productsWithMarketing,
      })

      return NextResponse.json({
        ...restoreResult,
        seedProductsFound: productsWithMarketing.length,
        backupsFound: backups.length,
      })
    }

    // Default: sync feed
    const limit = body.limit // No default limit - load all products
    const feedUrl = body.feedUrl || DEFAULT_FEED_URL
    
    const result = await fetchAction(api.feedImport.syncFromFeed, {
      feedUrl,
      ...(limit ? { limit } : {}), // Only pass limit if specified
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("Feed sync error:", error)
    return NextResponse.json(
      { error: "Failed to sync feed", details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: "Use POST to trigger feed sync",
    example: { limit: 100 }
  })
}
