"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Feature {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

interface FeatureCarouselProps {
  features: Feature[];
}

export function FeatureCarousel({ features }: FeatureCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToSlide = (index: number) => {
    if (index < 0) index = features.length - 1;
    if (index >= features.length) index = 0;
    setCurrentIndex(index);
  };

  const goToPrevious = () => goToSlide(currentIndex - 1);
  const goToNext = () => goToSlide(currentIndex + 1);

  // Auto-advance every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      goToSlide(currentIndex + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  // Get visible cards (previous, current, next)
  const getVisibleIndex = (offset: number) => {
    let index = currentIndex + offset;
    if (index < 0) index = features.length - 1;
    if (index >= features.length) index = 0;
    return index;
  };

  const prevIndex = getVisibleIndex(-1);
  const nextIndex = getVisibleIndex(1);

  return (
    <div className="relative">
      {/* Carousel Container - shows peeking cards */}
      <div className="flex items-stretch gap-4 overflow-hidden">
        {/* Previous card (peeking) */}
        <div className="w-16 flex-shrink-0 opacity-30">
          <div className="bg-[#1a1a1a] rounded-3xl p-5 border border-white/10 h-[320px] flex flex-col justify-between">
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-[#252525]">
              {features[prevIndex].icon}
            </div>
            <div>
              <h3 className="text-base font-medium text-white truncate">{features[prevIndex].title}</h3>
              <p className="text-white/50 text-xs truncate">{features[prevIndex].subtitle}</p>
            </div>
          </div>
        </div>

        {/* Current card (main) */}
        <div className="flex-1 transition-all duration-500 ease-out">
          <div className="bg-[#1a1a1a] rounded-3xl p-6 border border-white/10 h-[320px] flex flex-col justify-between hover:border-white/20 transition-colors">
            {/* Top: Icon */}
            <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center bg-[#252525]">
              {features[currentIndex].icon}
            </div>

            {/* Bottom: Title + Expand button */}
            <div>
              <h3 className="text-xl font-medium mb-1 text-white">{features[currentIndex].title}</h3>
              <p className="text-white/50 text-sm mb-4 line-clamp-2">{features[currentIndex].subtitle}</p>
              <button className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors bg-[#252525]">
                <span className="text-lg text-white/70">+</span>
              </button>
            </div>
          </div>
        </div>

        {/* Next card (peeking) */}
        <div className="w-16 flex-shrink-0 opacity-30">
          <div className="bg-[#1a1a1a] rounded-3xl p-5 border border-white/10 h-[320px] flex flex-col justify-between">
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-[#252525]">
              {features[nextIndex].icon}
            </div>
            <div>
              <h3 className="text-base font-medium text-white truncate">{features[nextIndex].title}</h3>
              <p className="text-white/50 text-xs truncate">{features[nextIndex].subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation - Titan style: arrows on sides, dots in center */}
      <div className="flex items-center justify-center gap-3 mt-8">
        {/* Left Arrow */}
        <button
          onClick={goToPrevious}
          className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5 text-white/70" />
        </button>

        {/* Dots */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5">
          {features.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-white w-8"
                  : "bg-white/30 w-2 hover:bg-white/50"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={goToNext}
          className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5 text-white/70" />
        </button>
      </div>
    </div>
  );
}
