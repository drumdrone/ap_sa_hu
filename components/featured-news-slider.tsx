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

  // Simple autoplay: advance every 5s, pause on user interaction.
  useEffect(() => {
    if (!emblaApi || !slides || slides.length < 2) return;
    let paused = false;
    const handlePointer = () => {
      paused = true;
    };
    emblaApi.on("pointerDown", handlePointer);
    const id = window.setInterval(() => {
      if (!paused) emblaApi.scrollNext();
    }, 5000);
    return () => {
      window.clearInterval(id);
      emblaApi.off("pointerDown", handlePointer);
    };
  }, [emblaApi, slides]);

  if (!slides || slides.length === 0) return null;

  return (
    <div className="mb-6">
      <Carousel
        opts={{ align: "start", loop: slides.length > 1 }}
        setApi={setEmblaApi}
        className="w-full"
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
                <div className="relative aspect-[16/9] bg-muted overflow-hidden">
                  {slide.imageResolvedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slide.imageResolvedUrl}
                      alt={slide.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">
                      📰
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-bold shadow-sm uppercase tracking-wide">
                      Novinka
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4">
                    <h3 className="text-white font-semibold text-base sm:text-lg leading-tight line-clamp-2 drop-shadow">
                      {slide.title}
                    </h3>
                    <p className="text-white/80 text-xs mt-1">
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
            <CarouselPrevious className="left-2 bg-white/90 border-border" />
            <CarouselNext className="right-2 bg-white/90 border-border" />
          </>
        )}
      </Carousel>
    </div>
  );
}
