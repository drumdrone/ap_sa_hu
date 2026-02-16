"use client";

import { cn } from "@/lib/utils";

type Tier = "A" | "B" | "C";

const tierStyles: Record<Tier, string> = {
  "A": "bg-green-600 text-white",
  "B": "bg-amber-500 text-white",
  "C": "bg-gray-400 text-white",
};

interface TierBadgeProps {
  tier: Tier;
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold",
        tierStyles[tier],
        className
      )}
    >
      {tier}
    </span>
  );
}
