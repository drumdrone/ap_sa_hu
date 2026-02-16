/**
 * Seed Import Script for Convex
 * 
 * This script imports the exported data back into a new Convex deployment.
 * 
 * Usage:
 * 1. Set up a new Convex project: npx convex init
 * 2. Copy the schema.ts to your new project
 * 3. Run: npx convex import convex/seed/
 * 
 * Or use the Convex dashboard to import the data.
 * 
 * Note: The exported data is in JSONL format (JSON Lines).
 * Each table has its own folder with documents.jsonl file.
 * 
 * Tables included:
 * - products (992 records) - Main product catalog with marketing data
 * - feedTaxonomy (7 records) - Feed categories for filtering
 * - opportunities (6 records) - Business opportunities (holidays, events)
 * - news (4 records) - News/log entries
 * - gallery (5 records) - Product gallery images (requires storage files)
 * - marketingBackup (27 records) - Backup of marketing data by SKU
 * - posmItems (1 record) - POSM materials catalog
 * 
 * Auth tables (users, sessions, etc.) are NOT included for security reasons.
 * Gallery images reference Convex storage - the storage files themselves
 * are not included in this export.
 */

// To import using CLI:
// npx convex import --table products convex/seed/products/documents.jsonl
// npx convex import --table feedTaxonomy convex/seed/feedTaxonomy/documents.jsonl
// etc.

export {};
