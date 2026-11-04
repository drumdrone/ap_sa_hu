"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useEffect, useState } from "react";

const formatSlideDate = (ts: number) =>
  new Date(ts).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export function FeaturedNewsSlider() {
  const slides = useQuery(api.featuredSlides.list, { limit: 20 });
  // IMPORTANT: do NOT name this `api` – it would shadow the imported
  // Convex `api` above and the useQuery call would throw a TDZ ReferenceError
  // (silently swallowed by the surrounding ClientErrorBoundary).
  const [emblaApi, setEmblaApi] = useState<CarouselApi | null>(null);

  // Autoplay: advance every 5s, pause briefly on interaction then resume
  // so the carousel keeps rotating indefinitely.
  useEffect(() => {
    if (!emblaApi || !slides || slides.length < 2) return;
    let pausedUntil = 0;
    const bump = () => {
      pausedUntil = Date.now() + 3000;
    };
    emblaApi.on("pointerDown", bump);
    const id = window.setInterval(() => {
      if (Date.now() >= pausedUntil) emblaApi.scrollNext();
    }, 5000);
    return () => {
      window.clearInterval(id);
      emblaApi.off("pointerDown", bump);
    };
  }, [emblaApi, slides]);

  if (!slides || slides.length === 0) return null;

  return (
    <div className="mb-6">
      <Carousel
        opts={{ align: "start", loop: true, skipSnaps: false }}
        setApi={setEmblaApi}
        className="w-full pt-12"
      >
        <CarouselContent className="-ml-3">
          {slides.map((slide) => (
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
        {slides.length > 1 && (
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
