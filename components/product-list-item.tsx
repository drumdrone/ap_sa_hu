"use client";

import Link from "next/link";
import Image from "next/image";
import { CategoryBadge } from "@/components/ui/category-badge";
import { TierBadge } from "@/components/ui/tier-badge";
import { BrandPillarBadge } from "@/components/ui/brand-pillar-badge";
import { Id } from "@/convex/_generated/dataModel";

interface ProductListItemProps {
  id: Id<"products">;
  name: string;
  image?: string;
  category?: "Bylinný" | "Funkční" | "Dětský" | "BIO";
  price: number;
  tier?: "A" | "B" | "C";
  brandPillar?: "Věda" | "BIO" | "Funkce" | "Tradice" | "Rodina";
  salesClaim?: string;
  availability?: string;
  brand?: string;
}

export function ProductListItem({ 
  id, 
  name, 
  image, 
  category, 
  price, 
  tier, 
  brandPillar,
  salesClaim,
  availability,
  brand
}: ProductListItemProps) {
  const isOutOfStock = availability === "out_of_stock";
  
  return (
    <Link
      href={`/product/${id}`}
      className={`group flex gap-4 bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-all duration-200 p-4 ${isOutOfStock ? "opacity-60" : ""}`}
    >
      <div className="w-24 h-24 flex-shrink-0 relative bg-muted rounded-lg overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="96px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded">
            Vyprodáno
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {category && <CategoryBadge category={category} />}
          {tier && <TierBadge tier={tier} />}
          {brand && !category && (
            <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
              {brand}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
          {name}
        </h3>
        {salesClaim && (
          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{salesClaim}</p>
        )}
        <div className="flex items-center gap-3">
          {brandPillar && <BrandPillarBadge pillar={brandPillar} className="text-xs" />}
        </div>
      </div>
      <div className="flex flex-col items-end justify-between">
        <span className="text-lg font-bold text-primary">{price} Kč</span>
        <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors whitespace-nowrap">
          Detail →
        </span>
      </div>
    </Link>
  );
}
