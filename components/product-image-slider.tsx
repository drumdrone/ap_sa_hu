"use client";

import { useState, useCallback } from "react";
import Image from "next/image";

interface ProductImageSliderProps {
  /** Main product image URL (shown first) */
  productImage?: string;
  /** Gallery image URLs */
  galleryImageUrls: string[];
  /** Product name for alt text */
  productName: string;
  /** Max visible thumbnails before showing +N */
  maxThumbnails?: number;
  /** Called when clicking main image, passes the index of the current image in the full list */
  onImageClick?: (index: number) => void;
  /** Optional className for the container */
  className?: string;
}

export function ProductImageSlider({
  productImage,
  galleryImageUrls,
  productName,
  maxThumbnails = 4,
  onImageClick,
  className,
}: ProductImageSliderProps) {
  // Build full image list: product image first, then gallery images
  const allImages: string[] = [];
  if (productImage) {
    allImages.push(productImage);
  }
  // Add gallery images, avoiding duplicates with the product image
  for (const url of galleryImageUrls) {
    if (url && url !== productImage) {
      allImages.push(url);
    }
  }

  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
  }, [allImages.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
  }, [allImages.length]);

  // If no images at all, show placeholder
  if (allImages.length === 0) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className ?? ""}`}>
        <span className="text-8xl">🍵</span>
      </div>
    );
  }

  // If only one image, show it without slider controls
  if (allImages.length === 1) {
    return (
      <div
        className={`relative bg-muted cursor-pointer group ${className ?? ""}`}
        onClick={() => onImageClick?.(0)}
      >
        <Image
          src={allImages[0]}
          alt={productName}
          width={400}
          height={400}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
    );
  }

  // Multiple images - show slider with thumbnails
  const visibleThumbnails = allImages.slice(0, maxThumbnails);
  const remainingCount = allImages.length - maxThumbnails;

  // When clicking the main image, map current index to lightbox index
  // The lightbox uses galleryImages only (no product.image), so offset accordingly
  const handleMainImageClick = () => {
    if (onImageClick) {
      // Find index in gallery images for lightbox
      const currentUrl = allImages[currentIndex];
      const galleryIndex = galleryImageUrls.indexOf(currentUrl);
      if (galleryIndex >= 0) {
        onImageClick(galleryIndex);
      } else {
        // If it's the product image (not in gallery), open first gallery image or index 0
        onImageClick(0);
      }
    }
  };

  return (
    <div className={`flex flex-row ${className ?? ""}`}>
      {/* Left: Vertical Thumbnails */}
      <div className="flex flex-col gap-1.5 p-2 justify-center flex-shrink-0">
        {visibleThumbnails.map((img, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
              idx === currentIndex
                ? "border-primary ring-1 ring-primary/30 scale-105"
                : "border-border opacity-70 hover:opacity-100 hover:border-muted-foreground"
            }`}
          >
            <img
              src={img}
              alt={`${productName} ${idx + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
        {/* +N indicator for remaining images */}
        {remainingCount > 0 && (
          <button
            onClick={() => setCurrentIndex(maxThumbnails)}
            className="w-12 h-12 md:w-14 md:h-14 rounded-lg border-2 border-border bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground hover:border-muted-foreground hover:text-foreground transition-all flex-shrink-0"
          >
            +{remainingCount}
          </button>
        )}
      </div>

      {/* Right: Main Image with Navigation Arrows */}
      <div className="relative flex-1 bg-muted overflow-hidden group">
        {/* Main Image */}
        <div
          className="w-full h-full cursor-pointer"
          onClick={handleMainImageClick}
        >
          <Image
            src={allImages[currentIndex]}
            alt={`${productName} - ${currentIndex + 1}/${allImages.length}`}
            width={400}
            height={400}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        </div>

        {/* Left Arrow */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Previous image"
        >
          <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right Arrow */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Next image"
        >
          <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Image Counter (bottom right) */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded-md text-white text-xs font-medium">
          {currentIndex + 1} / {allImages.length}
        </div>
      </div>
    </div>
  );
}
