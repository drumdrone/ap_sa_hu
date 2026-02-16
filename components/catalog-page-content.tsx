"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/header";
import { CatalogFilters } from "@/components/catalog-filters";
import { ProductCard } from "@/components/product-card";
import { ProductListItem } from "@/components/product-list-item";

export function CatalogPageContent() {
  const [search, setSearch] = useState("");
  const [feedCategory, setFeedCategory] = useState("");
  const [feedSubcategory, setFeedSubcategory] = useState("");
  const [brand, setBrand] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Keep reference to last loaded products to prevent flickering
  const lastProducts = useRef<typeof products>(undefined);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const products = useQuery(api.products.list, {
    search: debouncedSearch || undefined,
    feedCategory: feedCategory || undefined,
    feedSubcategory: feedSubcategory || undefined,
    brand: brand || undefined,
  });

  // Update last products when we get new data
  if (products !== undefined) {
    lastProducts.current = products;
  }
  
  // Use last products during loading to prevent flickering
  const displayProducts = products ?? lastProducts.current;

  const seedProducts = useMutation(api.products.seed);

  // Seed products on first load if empty
  useEffect(() => {
    if (products !== undefined && products.length === 0) {
      console.log("No products found, seeding...");
      seedProducts();
    }
  }, [products, seedProducts]);

  // Only show loading on initial load, not during searches
  const isLoading = displayProducts === undefined;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">Katalog produktů</h2>
          <p className="text-muted-foreground">
            Přehled všech produktů s marketingovými materiály
          </p>
        </div>

        <CatalogFilters
          search={search}
          onSearchChange={setSearch}
          feedCategory={feedCategory}
          onFeedCategoryChange={setFeedCategory}
          feedSubcategory={feedSubcategory}
          onFeedSubcategoryChange={setFeedSubcategory}
          brand={brand}
          onBrandChange={setBrand}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Načítám produkty...</p>
            </div>
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Žádné produkty nenalezeny</h3>
            <p className="text-muted-foreground">Zkuste upravit filtry nebo vyhledávání</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayProducts.map((product) => (
              <ProductCard
                key={product._id}
                id={product._id}
                name={product.name}
                image={product.image}
                category={product.category}
                price={product.price}
                tier={product.tier}
                availability={product.availability}
                brand={product.brand}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {displayProducts.map((product) => (
              <ProductListItem
                key={product._id}
                id={product._id}
                name={product.name}
                image={product.image}
                category={product.category}
                price={product.price}
                tier={product.tier}
                brandPillar={product.brandPillar}
                salesClaim={product.salesClaim}
                availability={product.availability}
                brand={product.brand}
              />
            ))}
          </div>
        )}

        {displayProducts && displayProducts.length > 0 && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Zobrazeno {displayProducts.length} produktů
            {products === undefined && <span className="ml-2 text-xs">(načítám...)</span>}
          </div>
        )}
      </main>
    </div>
  );
}
