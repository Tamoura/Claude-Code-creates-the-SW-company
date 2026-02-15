'use client';

import { useState } from 'react';

interface CarouselSlide {
  slideNumber: number;
  title: string;
  content: string;
  speakerNotes?: string;
}

interface CarouselPreviewProps {
  slides: CarouselSlide[];
  title?: string;
}

export function CarouselPreview({ slides, title }: CarouselPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!slides || slides.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500">No carousel slides available</p>
      </div>
    );
  }

  const slide = slides[currentSlide];

  return (
    <div className="card">
      {title && (
        <h3 className="text-sm font-medium text-gray-400 mb-4">{title}</h3>
      )}

      {/* Slide preview */}
      <div className="bg-gray-950 border border-gray-700 rounded-xl p-8 mb-4 min-h-[280px] flex flex-col justify-center">
        <div className="text-center">
          <div className="text-xs text-gray-600 mb-4">
            Slide {slide.slideNumber} of {slides.length}
          </div>
          <h4 className="text-xl font-bold text-gray-100 mb-4">
            {slide.title}
          </h4>
          <p className="text-gray-300 leading-relaxed max-w-md mx-auto">
            {slide.content}
          </p>
        </div>
      </div>

      {/* Speaker notes */}
      {slide.speakerNotes && (
        <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Speaker Notes</p>
          <p className="text-sm text-gray-400">{slide.speakerNotes}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className="btn-secondary text-sm disabled:opacity-30"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Slide indicators */}
        <div className="flex items-center gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentSlide ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
          disabled={currentSlide === slides.length - 1}
          className="btn-secondary text-sm disabled:opacity-30"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
