/** Content-heavy slide layouts: title, problem, solution, vision */

interface TitleSlideData {
  layout: 'title';
  title: string;
  subtitle: string;
  tagline: string;
}

interface TextSlideData {
  layout: 'problem' | 'solution' | 'vision';
  heading: string;
  statement: string;
  points?: string[];
  milestones?: string[];
}

type ContentSlideData = TitleSlideData | TextSlideData;

export function ContentSlide({ slide, accentColor }: { slide: ContentSlideData; accentColor: string }) {
  if (slide.layout === 'title') return <TitleSlide slide={slide} accentColor={accentColor} />;
  return <TextSlide slide={slide} accentColor={accentColor} />;
}

function TitleSlide({ slide, accentColor }: { slide: TitleSlideData; accentColor: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      {/* Decorative gradient orb */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-15"
        style={{ backgroundColor: accentColor }}
      />
      <div className="relative z-10 max-w-4xl">
        <h1 className="text-7xl font-bold text-white mb-6 tracking-tight">
          {slide.title}
        </h1>
        <p className="text-2xl text-gray-300 mb-8 leading-relaxed">
          {slide.subtitle}
        </p>
        <div
          className="inline-block px-6 py-2 rounded-full text-lg font-medium"
          style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
        >
          {slide.tagline}
        </div>
      </div>
    </div>
  );
}

function TextSlide({ slide, accentColor }: { slide: TextSlideData; accentColor: string }) {
  const items = slide.points ?? slide.milestones ?? [];
  const isVision = slide.layout === 'vision';

  return (
    <div className="flex flex-col justify-center h-full px-16 max-w-5xl mx-auto">
      <div className="relative">
        {/* Accent line */}
        <div className="w-16 h-1 rounded mb-6" style={{ backgroundColor: accentColor }} />

        <h2 className="text-5xl font-bold text-white mb-6 tracking-tight">
          {slide.heading}
        </h2>
        <p className="text-2xl text-gray-300 mb-10 leading-relaxed max-w-3xl">
          {slide.statement}
        </p>

        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-4">
              {isVision ? (
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-0.5"
                  style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                >
                  {i + 1}
                </div>
              ) : (
                <div
                  className="flex-shrink-0 w-2 h-2 rounded-full mt-3"
                  style={{ backgroundColor: accentColor }}
                />
              )}
              <p className="text-lg text-gray-300 leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function isContentSlide(layout: string): boolean {
  return ['title', 'problem', 'solution', 'vision'].includes(layout);
}
