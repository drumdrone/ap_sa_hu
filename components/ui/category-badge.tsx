"use client";

import { cn } from "@/lib/utils";

type Category = "Bylinný" | "Funkční" | "Dětský" | "BIO";

const categoryStyles: Record<Category, string> = {
  "Bylinný": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Funkční": "bg-blue-100 text-blue-800 border-blue-200",
  "Dětský": "bg-pink-100 text-pink-800 border-pink-200",
  "BIO": "bg-yellow-100 text-yellow-800 border-yellow-200",
};

interface CategoryBadgeProps {
  category: Category;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        categoryStyles[category],
        className
      )}
    >
      {category}
    </span>
  );
}
