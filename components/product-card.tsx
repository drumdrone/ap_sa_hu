"use client";

import Link from "next/link";
import Image from "next/image";
import { CategoryBadge } from "@/components/ui/category-badge";
import { TierBadge } from "@/components/ui/tier-badge";
import { Id } from "@/convex/_generated/dataModel";

interface ProductCardProps {
  id: Id<"products">;
  name: string;
  image?: string;
  category?: "Bylinný" | "Funkční" | "Dětský" | "BIO";
  price: number;
  tier?: "A" | "B" | "C";
  availability?: string;
  brand?: string;
}

export function ProductCard({ id, name, image, category, price, tier, availability, brand }: ProductCardProps) {
  const isOutOfStock = availability === "out_of_stock";
  
  return (
    <Link
      href={`/product/${id}`}
      className={`group bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${isOutOfStock ? "opacity-60" : ""}`}
    >
      <div className="aspect-square relative bg-muted overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          {tier && <TierBadge tier={tier} />}
        </div>
        {isOutOfStock && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-red-500 text-white text-xs rounded">
            Vyprodáno
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-center gap-2">
          {category && <CategoryBadge category={category} />}
          {brand && !category && (
            <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
              {brand}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">{price} Kč</span>
          <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
            Zobrazit detail →
          </span>
        </div>
      </div>
    </Link>
  );
}
