"use client";

import { cn } from "@/lib/utils";

type BrandPillar = "Věda" | "BIO" | "Funkce" | "Tradice" | "Rodina";

const pillarConfig: Record<BrandPillar, { icon: string; color: string }> = {
  "Věda": { icon: "🔬", color: "bg-purple-100 text-purple-800 border-purple-200" },
  "BIO": { icon: "🌿", color: "bg-green-100 text-green-800 border-green-200" },
  "Funkce": { icon: "⚡", color: "bg-blue-100 text-blue-800 border-blue-200" },
  "Tradice": { icon: "🏛️", color: "bg-amber-100 text-amber-800 border-amber-200" },
  "Rodina": { icon: "👨‍👩‍👧‍👦", color: "bg-pink-100 text-pink-800 border-pink-200" },
};

interface BrandPillarBadgeProps {
  pillar: BrandPillar;
  className?: string;
  showLabel?: boolean;
}

export function BrandPillarBadge({ pillar, className, showLabel = true }: BrandPillarBadgeProps) {
  const config = pillarConfig[pillar];
  
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border",
        config.color,
        className
      )}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{pillar}</span>}
    </span>
  );
}
