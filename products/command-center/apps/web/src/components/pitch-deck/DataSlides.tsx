/** Data visualization slide layouts: market, traction, business-model, competitive, metrics */

interface MarketSlideData {
  layout: 'market';
  heading: string;
  tam: { value: string; label: string };
  sam: { value: string; label: string };
  som: { value: string; label: string };
}

interface TractionSlideData {
  layout: 'traction';
  heading: string;
  timeline: Array<{ date: string; milestone: string }>;
}

interface BusinessModelSlideData {
  layout: 'business-model';
  heading: string;
  model: string;
  tiers: Array<{ name: string; price: string; features: string[] }>;
}

interface CompetitiveSlideData {
  layout: 'competitive';
  heading: string;
  axes: { x: string; y: string };
  competitors: Array<{ name: string; position: string; note: string }>;
}

interface MetricsSlideData {
  layout: 'metrics';
  heading: string;
  metrics: Array<{ value: string; label: string; trend: 'up' | 'down' | 'stable' }>;
}

type DataSlideData = MarketSlideData | TractionSlideData | BusinessModelSlideData | CompetitiveSlideData | MetricsSlideData;

export function DataSlide({ slide, accentColor }: { slide: DataSlideData; accentColor: string }) {
  switch (slide.layout) {
    case 'market': return <MarketSlide slide={slide} accentColor={accentColor} />;
    case 'traction': return <TractionSlide slide={slide} accentColor={accentColor} />;
    case 'business-model': return <BusinessModelSlide slide={slide} accentColor={accentColor} />;
    case 'competitive': return <CompetitiveSlide slide={slide} accentColor={accentColor} />;
    case 'metrics': return <MetricsSlide slide={slide} accentColor={accentColor} />;
  }
}

function MarketSlide({ slide, accentColor }: { slide: MarketSlideData; accentColor: string }) {
  const rings = [
    { data: slide.tam, size: 320, opacity: 0.12 },
    { data: slide.sam, size: 220, opacity: 0.2 },
    { data: slide.som, size: 120, opacity: 0.35 },
  ];

  return (
    <div className="flex flex-col justify-center h-full px-16 max-w-6xl mx-auto">
      <div className="w-16 h-1 rounded mb-6" style={{ backgroundColor: accentColor }} />
      <h2 className="text-5xl font-bold text-white mb-12 tracking-tight">{slide.heading}</h2>

      <div className="flex items-center gap-16">
        {/* Concentric circles */}
        <div className="relative flex-shrink-0" style={{ width: 340, height: 340 }}>
          {rings.map(({ data, size, opacity }, i) => (
            <div
              key={i}
              className="absolute rounded-full flex items-center justify-center"
              style={{
                width: size,
                height: size,
                top: `${(340 - size) / 2}px`,
                left: `${(340 - size) / 2}px`,
                backgroundColor: `${accentColor}`,
                opacity,
              }}
            >
              {i === 2 && (
                <span className="text-white font-bold text-lg z-10">{data.value}</span>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="space-y-6 flex-1">
          {[
            { tier: 'TAM', value: slide.tam.value, description: slide.tam.label },
            { tier: 'SAM', value: slide.sam.value, description: slide.sam.label },
            { tier: 'SOM', value: slide.som.value, description: slide.som.label },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: accentColor, opacity: rings[i].opacity + 0.3 }}
              />
              <div>
                <div className="text-sm text-gray-500 uppercase tracking-wider">{item.tier}</div>
                <div className="text-3xl font-bold text-white">{item.value}</div>
                <div className="text-gray-400 text-sm">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TractionSlide({ slide, accentColor }: { slide: TractionSlideData; accentColor: string }) {
  return (
    <div className="flex flex-col justify-center h-full px-16 max-w-5xl mx-auto">
      <div className="w-16 h-1 rounded mb-6" style={{ backgroundColor: accentColor }} />
      <h2 className="text-5xl font-bold text-white mb-12 tracking-tight">{slide.heading}</h2>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-3 bottom-3 w-0.5" style={{ backgroundColor: `${accentColor}40` }} />

        <div className="space-y-8">
          {slide.timeline.map((item, i) => (
            <div key={i} className="flex items-start gap-6 relative">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0 mt-1.5 z-10"
                style={{ backgroundColor: accentColor }}
              />
              <div>
                <div
                  className="text-sm font-semibold uppercase tracking-wider mb-1"
                  style={{ color: accentColor }}
                >
                  {item.date}
                </div>
                <p className="text-lg text-gray-300 leading-relaxed">{item.milestone}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BusinessModelSlide({ slide, accentColor }: { slide: BusinessModelSlideData; accentColor: string }) {
  return (
    <div className="flex flex-col justify-center h-full px-16 max-w-6xl mx-auto">
      <div className="w-16 h-1 rounded mb-6" style={{ backgroundColor: accentColor }} />
      <h2 className="text-5xl font-bold text-white mb-3 tracking-tight">{slide.heading}</h2>
      <p className="text-xl text-gray-400 mb-10">{slide.model}</p>

      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(slide.tiers.length, 4)}, 1fr)` }}>
        {slide.tiers.map((tier, i) => {
          const isHighlighted = i === Math.min(slide.tiers.length - 1, 1);
          return (
            <div
              key={i}
              className="rounded-xl p-6 border"
              style={{
                backgroundColor: isHighlighted ? `${accentColor}15` : 'rgba(255,255,255,0.03)',
                borderColor: isHighlighted ? `${accentColor}40` : 'rgba(255,255,255,0.08)',
              }}
            >
              <div className="text-sm text-gray-500 uppercase tracking-wider mb-1">{tier.name}</div>
              <div className="text-2xl font-bold text-white mb-4">{tier.price}</div>
              <ul className="space-y-2">
                {tier.features.map((f, fi) => (
                  <li key={fi} className="flex items-start gap-2 text-sm text-gray-400">
                    <span style={{ color: accentColor }} className="mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompetitiveSlide({ slide, accentColor }: { slide: CompetitiveSlideData; accentColor: string }) {
  const posMap: Record<string, { x: number; y: number }> = {
    'low-x low-y': { x: 15, y: 80 },
    'low-x mid-y': { x: 15, y: 45 },
    'low-x high-y': { x: 15, y: 15 },
    'mid-x low-y': { x: 45, y: 80 },
    'mid-x mid-y': { x: 45, y: 45 },
    'mid-x high-y': { x: 45, y: 15 },
    'high-x low-y': { x: 80, y: 80 },
    'high-x mid-y': { x: 80, y: 45 },
    'high-x high-y': { x: 80, y: 15 },
  };

  return (
    <div className="flex flex-col justify-center h-full px-16 max-w-6xl mx-auto">
      <div className="w-16 h-1 rounded mb-6" style={{ backgroundColor: accentColor }} />
      <h2 className="text-5xl font-bold text-white mb-10 tracking-tight">{slide.heading}</h2>

      <div className="flex gap-10">
        {/* Quadrant chart */}
        <div className="relative flex-shrink-0" style={{ width: 380, height: 380 }}>
          {/* Grid background */}
          <div className="absolute inset-0 border border-gray-800 rounded-lg bg-gray-900/50">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-800" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-800" />
          </div>

          {/* Axis labels */}
          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs text-gray-500">{slide.axes.x} →</div>
          <div className="absolute -left-7 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-gray-500">{slide.axes.y} →</div>

          {/* Competitor dots */}
          {slide.competitors.map((c, i) => {
            const pos = posMap[c.position] ?? { x: 50, y: 50 };
            const isUs = i === slide.competitors.length - 1;
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <div
                  className="w-3 h-3 rounded-full mb-1"
                  style={{ backgroundColor: isUs ? accentColor : '#6B7280' }}
                />
                <span className={`text-xs font-medium whitespace-nowrap ${isUs ? 'text-white' : 'text-gray-500'}`}>
                  {c.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="space-y-4 flex-1 pt-4">
          {slide.competitors.map((c, i) => {
            const isUs = i === slide.competitors.length - 1;
            return (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                  style={{ backgroundColor: isUs ? accentColor : '#6B7280' }}
                />
                <div>
                  <div className={`text-sm font-semibold ${isUs ? 'text-white' : 'text-gray-400'}`}>
                    {c.name}
                  </div>
                  <div className="text-xs text-gray-500">{c.note}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetricsSlide({ slide, accentColor }: { slide: MetricsSlideData; accentColor: string }) {
  const trendIcon = (trend: string) => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };
  const trendColor = (trend: string) => {
    if (trend === 'up') return '#22C55E';
    if (trend === 'down') return '#EF4444';
    return '#6B7280';
  };

  return (
    <div className="flex flex-col justify-center h-full px-16 max-w-6xl mx-auto">
      <div className="w-16 h-1 rounded mb-6" style={{ backgroundColor: accentColor }} />
      <h2 className="text-5xl font-bold text-white mb-12 tracking-tight">{slide.heading}</h2>

      <div className="grid grid-cols-3 gap-5">
        {slide.metrics.map((m, i) => (
          <div
            key={i}
            className="rounded-xl p-6 border"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderColor: `${accentColor}20`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl font-bold text-white">{m.value}</span>
              <span
                className="text-lg font-bold"
                style={{ color: trendColor(m.trend) }}
              >
                {trendIcon(m.trend)}
              </span>
            </div>
            <div className="text-sm text-gray-400">{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function isDataSlide(layout: string): boolean {
  return ['market', 'traction', 'business-model', 'competitive', 'metrics'].includes(layout);
}
