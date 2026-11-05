"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useMemo, useState } from "react";

const formatSlideDate = (ts: number) =>
  new Date(ts).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

type Badge = "novinka" | "redesign";

const BADGE_LABEL: Record<Badge, string> = {
  novinka: "Novinka",
  redesign: "Redesign",
};

const BADGE_ACTIVE_CLASS: Record<Badge, string> = {
  novinka: "bg-primary text-white border-primary",
  redesign: "bg-orange-500 text-white border-orange-500",
};

export function FeaturedNewsSlider() {
  const slides = useQuery(api.featuredSlides.list, { limit: 20 });
  // IMPORTANT: do NOT name this `api` – it would shadow the imported
  // Convex `api` above and the useQuery call would throw a TDZ ReferenceError
  // (silently swallowed by the surrounding ClientErrorBoundary).

  const [activeBadge, setActiveBadge] = useState<Badge | null>(null);

  // Tags that actually appear in the current slide set — the filter row
  // hides chips for tags nobody is using.
  const availableBadges = useMemo<Badge[]>(() => {
    if (!slides) return [];
    const present = new Set<Badge>();
    for (const s of slides) {
      const b = (s.badge ?? "novinka") as Badge;
      present.add(b);
    }
    // Keep a stable order: novinka first, then redesign
    return (["novinka", "redesign"] as Badge[]).filter((b) => present.has(b));
  }, [slides]);

  const filteredSlides = useMemo(() => {
    if (!slides) return slides;
    if (!activeBadge) return slides;
    return slides.filter((s) => (s.badge ?? "novinka") === activeBadge);
  }, [slides, activeBadge]);

  if (!slides || slides.length === 0) return null;

  return (
    <div className="mb-6">
      <Carousel
        opts={{ align: "start", loop: false, skipSnaps: false }}
        className="w-full pt-12 relative"
      >
        {/* Filter chips — top-left, on the same row as the carousel arrows */}
        {availableBadges.length > 1 && (
          <div className="absolute top-0 left-0 right-28 flex flex-wrap items-center gap-2 h-10">
            <button
              type="button"
              onClick={() => setActiveBadge(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-colors ${
                activeBadge === null
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground"
              }`}
            >
              Vše
            </button>
            {availableBadges.map((badge) => {
              const isActive = activeBadge === badge;
              return (
                <button
                  key={badge}
                  type="button"
                  onClick={() => setActiveBadge(isActive ? null : badge)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-colors ${
                    isActive
                      ? BADGE_ACTIVE_CLASS[badge]
                      : "bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {BADGE_LABEL[badge]}
                </button>
              );
            })}
          </div>
        )}
        <CarouselContent className="-ml-3">
          {(filteredSlides ?? []).map((slide) => (
            <CarouselItem
              key={slide._id}
              className="pl-3 basis-full sm:basis-1/2 lg:basis-1/3"
            >
              <Link
                href={`/product/${slide.productId}`}
                className="group block relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-[16/9] flex">
                  <div className="relative w-1/2 bg-white overflow-hidden flex items-center justify-center p-3">
                    {slide.imageResolvedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={slide.imageResolvedUrl}
                        alt={slide.title}
                        className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">
                        📰
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      {(() => {
                        const badge = slide.badge ?? "novinka";
                        const isRedesign = badge === "redesign";
                        return (
                          <span
                            className={`px-3 py-1 rounded-full text-white text-xs font-bold shadow-sm uppercase tracking-wide ${
                              isRedesign ? "bg-orange-500" : "bg-primary"
                            }`}
                          >
                            {isRedesign ? "Redesign" : "Novinka"}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="w-1/2 bg-card p-3 sm:p-4 flex flex-col justify-center">
                    <h3 className="text-foreground font-bold text-sm sm:text-base leading-snug">
                      {slide.title.replace(/^\s*(Novinka|Redesign)\s*:\s*/i, "")}
                    </h3>
                    <p className="text-muted-foreground text-xs mt-2">
                      {formatSlideDate(slide.date)}
                    </p>
                  </div>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        {(filteredSlides?.length ?? 0) > 1 && (
          <>
            <CarouselPrevious
              className="left-auto right-12 top-0 translate-y-0 h-10 w-10 bg-primary text-white border-primary shadow-lg hover:bg-primary/90 hover:text-white focus-visible:ring-2 focus-visible:ring-primary/50"
            />
            <CarouselNext
              className="right-0 top-0 translate-y-0 h-10 w-10 bg-primary text-white border-primary shadow-lg hover:bg-primary/90 hover:text-white focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </>
        )}
      </Carousel>
    </div>
  );
}
