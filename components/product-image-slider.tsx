"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

interface ProductImageSliderProps {
  /** Main product image URL (shown first) */
  productImage?: string;
  /** Gallery image URLs */
  galleryImageUrls: string[];
  /** Optional product video URL (YouTube) */
  videoUrl?: string;
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
  videoUrl,
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

  // Helper: derive YouTube embed and thumbnail URLs
  const getYoutubeIds = (url: string | undefined) => {
    if (!url) return { embedUrl: "", thumbUrl: "" };
    try {
      // Already embed url
      if (url.includes("/embed/")) {
        const id = url.split("/embed/")[1]?.split(/[?&]/)[0] ?? "";
        return {
          embedUrl: url,
          thumbUrl: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "",
        };
      }
      // Shorts url: https://www.youtube.com/shorts/VIDEO_ID
      const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/);
      const videoIdFromShorts = shortsMatch?.[1];
      if (videoIdFromShorts) {
        return {
          embedUrl: `https://www.youtube.com/embed/${videoIdFromShorts}`,
          thumbUrl: `https://img.youtube.com/vi/${videoIdFromShorts}/hqdefault.jpg`,
        };
      }
      // Short youtu.be
      const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
      const videoIdFromShort = shortMatch?.[1];
      if (videoIdFromShort) {
        return {
          embedUrl: `https://www.youtube.com/embed/${videoIdFromShort}`,
          thumbUrl: `https://img.youtube.com/vi/${videoIdFromShort}/hqdefault.jpg`,
        };
      }
      // Standard watch URL
      const urlObj = new URL(url);
      const v = urlObj.searchParams.get("v");
      if (v) {
        return {
          embedUrl: `https://www.youtube.com/embed/${v}`,
          thumbUrl: `https://img.youtube.com/vi/${v}/hqdefault.jpg`,
        };
      }
    } catch {
      // ignore parsing errors
    }
    return { embedUrl: url ?? "", thumbUrl: "" };
  };

  const { embedUrl: videoEmbedUrl, thumbUrl: videoThumbUrl } = getYoutubeIds(videoUrl);

  const hasVideo = !!videoEmbedUrl;
  const videoIndex = hasVideo ? allImages.length : -1;
  const imageCount = allImages.length;
  const totalItems = hasVideo ? imageCount + 1 : imageCount;

  const [currentIndex, setCurrentIndex] = useState(0);

  // Keep index in bounds when images/video change (e.g. video removed)
  useEffect(() => {
    setCurrentIndex((prev) => {
      if (totalItems <= 0) return 0;
      return Math.min(prev, totalItems - 1);
    });
  }, [totalItems]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
  }, [totalItems]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
  }, [totalItems]);

  // If no images at all, show placeholder
  if (allImages.length === 0 && !hasVideo) {
    return (
      <div className={`bg-background flex items-center justify-center ${className ?? ""}`}>
        <span className="text-8xl">🍵</span>
      </div>
    );
  }

  // If only one item (single image and no video), show it without slider controls
  if (totalItems === 1 && allImages.length === 1 && !hasVideo) {
    return (
      <div
        className={`relative bg-background cursor-pointer group ${className ?? ""}`}
        onClick={() => onImageClick?.(0)}
      >
        <Image
          src={allImages[0]}
          alt={productName}
          width={400}
          height={400}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
        />
      </div>
    );
  }

  // Multiple items (images and optionally video) - show slider with thumbnails.
  // Thumbnails (+N) count ONLY images; video is not part of the thumbnail strip.
  const itemIndexes = Array.from({ length: imageCount }, (_, i) => i);
  const visibleIndexes = itemIndexes.slice(0, maxThumbnails);
  const remainingCount = imageCount - maxThumbnails;

  // Helper to open image in parent lightbox.
  // Pass slider index directly (same ordering as lightbox).
  const openAtIndex = (index: number) => {
    setCurrentIndex(index);
    if (!onImageClick) return;
    // If current is video, do nothing (lightbox currently works only with images)
    if (hasVideo && index === videoIndex) return;
    onImageClick(index);
  };

  // When clicking the main image, open lightbox at the mapped index
  const handleMainImageClick = () => {
    openAtIndex(currentIndex);
  };

  return (
    <div className={`flex flex-row gap-3 px-2 ${className ?? ""}`}>
      {/* Left: Vertical Thumbnails */}
      <div className="flex flex-col gap-2 py-4 justify-center flex-shrink-0">
        {visibleIndexes.map((idx) => {
          const isVideoThumb = hasVideo && idx === videoIndex;
          const isActive = idx === currentIndex;
          return (
            <button
              key={idx}
              onMouseEnter={() => setCurrentIndex(idx)}
              onClick={() => openAtIndex(idx)}
              className={`w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                isActive
                  ? "border-primary ring-1 ring-primary/30 scale-105"
                  : "border-border opacity-70 hover:opacity-100 hover:border-muted-foreground"
              }`}
            >
              {isVideoThumb ? (
                <div className="w-full h-full relative bg-black flex items-center justify-center">
                  {videoThumbUrl ? (
                    <img
                      src={videoThumbUrl}
                      alt={`${productName} video`}
                      className="w-full h-full object-cover opacity-70"
                    />
                  ) : null}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/90 flex items-center justify-center shadow">
                      <svg className="w-3 h-3 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={allImages[idx]}
                  alt={`${productName} ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
            </button>
          );
        })}
        {/* +N indicator for remaining images */}
        {remainingCount > 0 && (
          <button
            onMouseEnter={() => setCurrentIndex(maxThumbnails)}
            onClick={() => openAtIndex(maxThumbnails)}
            className="w-12 h-12 md:w-14 md:h-14 rounded-lg border-2 border-border bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground hover:border-muted-foreground hover:text-foreground transition-all flex-shrink-0"
          >
            +{remainingCount}
          </button>
        )}
      </div>

      {/* Right: Main Image with Navigation Arrows */}
      <div className="relative flex-1 min-w-0 bg-background overflow-hidden group">
        {/* Main Image / Video */}
        <div
          className="w-full h-full cursor-pointer"
          onClick={handleMainImageClick}
        >
          {hasVideo && currentIndex === videoIndex ? (
            <div className="w-full h-full">
              <iframe
                src={videoEmbedUrl}
                title={productName}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <Image
              src={allImages[currentIndex]}
              alt={`${productName} - ${currentIndex + 1}/${allImages.length}`}
              width={400}
              height={400}
              className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
            />
          )}
        </div>

        {/* Video indicator under main image */}
        {hasVideo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(videoIndex);
            }}
            className="absolute left-3 bottom-3 inline-flex items-center justify-center w-9 h-9 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition-colors"
            title="Přehrát produktové video"
            aria-label="Přehrát produktové video"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}

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
          {hasVideo && currentIndex === videoIndex ? "Video" : `${currentIndex + 1} / ${imageCount}`}
        </div>
      </div>
    </div>
  );
}
