"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface CatalogFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  feedCategory: string;
  onFeedCategoryChange: (value: string) => void;
  feedSubcategory: string;
  onFeedSubcategoryChange: (value: string) => void;
  brand: string;
  onBrandChange: (value: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export function CatalogFilters({
  search,
  onSearchChange,
  feedCategory,
  onFeedCategoryChange,
  feedSubcategory,
  onFeedSubcategoryChange,
  brand,
  onBrandChange,
  viewMode,
  onViewModeChange,
}: CatalogFiltersProps) {
  // Get dynamic categories from feed
  const feedCategories = useQuery(api.products.getFeedCategories);
  const feedBrands = useQuery(api.products.getFeedBrands);
  
  // Get subcategories for selected category (find from array instead of object key)
  const subcategories = feedCategory 
    ? (feedCategories?.subcategoryData?.find((d) => d.category === feedCategory)?.subcategories || [])
    : [];

  // Reset subcategory when category changes
  const handleFeedCategoryChange = (value: string) => {
    onFeedCategoryChange(value);
    onFeedSubcategoryChange(""); // Reset subcategory when main category changes
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 mb-6">
      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Hledat produkty..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-3">
          {/* Feed Category */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Kategorie</label>
            <select
              value={feedCategory}
              onChange={(e) => handleFeedCategoryChange(e.target.value)}
              className="px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-[160px]"
            >
              <option value="">Všechny kategorie</option>
              {feedCategories?.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory (shown only when category selected) */}
          {feedCategory && subcategories.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Podkategorie</label>
              <select
                value={feedSubcategory}
                onChange={(e) => onFeedSubcategoryChange(e.target.value)}
                className="px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-[200px]"
              >
                <option value="">Všechny podkategorie</option>
                {subcategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Brand Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Značka</label>
            <select
              value={brand}
              onChange={(e) => onBrandChange(e.target.value)}
              className="px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-[140px]"
            >
              <option value="">Všechny značky</option>
              {feedBrands?.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex flex-col gap-1 ml-auto">
            <label className="text-xs font-medium text-muted-foreground">Zobrazení</label>
            <div className="flex border border-input rounded-lg overflow-hidden">
              <button
                onClick={() => onViewModeChange("grid")}
                className={`px-3 py-2.5 ${
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                } transition-colors`}
                title="Grid zobrazení"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => onViewModeChange("list")}
                className={`px-3 py-2.5 ${
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                } transition-colors`}
                title="List zobrazení"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
