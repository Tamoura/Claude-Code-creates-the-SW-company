/** Grid-based slide layouts: feature-grid */

interface FeatureGridSlideData {
  layout: 'feature-grid';
  heading: string;
  features: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

const ICON_MAP: Record<string, string> = {
  globe: '🌐', brain: '🧠', edit: '✏️', briefcase: '💼', shield: '🛡️',
  zap: '⚡', clipboard: '📋', target: '🎯', book: '📖', users: '👥',
  'bar-chart': '📊', layers: '📚', github: '🐙', 'credit-card': '💳',
  'dollar-sign': '💰', code: '💻', bell: '🔔', 'message-square': '💬',
  download: '📥', 'check-circle': '✅', fingerprint: '🔒', lock: '🔐',
  link: '🔗', 'file-check': '📄', database: '🗄️', hexagon: '⬡',
  'pie-chart': '📈', 'trending-up': '📈', image: '🖼️', cpu: '🔧',
  shuffle: '🔀', layout: '📐', package: '📦', 'git-branch': '🌿',
  terminal: '🖥️', 'book-open': '📖', box: '📦', columns: '⬜',
  award: '🏆', activity: '📡', grid: '🔲', key: '🔑',
};

export function GridSlide({ slide, accentColor }: { slide: FeatureGridSlideData; accentColor: string }) {
  const cols = slide.features.length <= 4 ? 2 : 3;

  return (
    <div className="flex flex-col justify-center h-full px-16 max-w-6xl mx-auto">
      <div className="w-16 h-1 rounded mb-6" style={{ backgroundColor: accentColor }} />
      <h2 className="text-5xl font-bold text-white mb-10 tracking-tight">{slide.heading}</h2>

      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {slide.features.map((f, i) => (
          <div
            key={i}
            className="rounded-xl p-5 border transition-colors"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderColor: `${accentColor}15`,
            }}
          >
            <div className="text-2xl mb-3" role="img" aria-label={f.icon}>
              {ICON_MAP[f.icon] ?? '•'}
            </div>
            <div className="text-lg font-semibold text-white mb-1">{f.title}</div>
            <div className="text-sm text-slate-400 leading-relaxed">{f.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function isGridSlide(layout: string): boolean {
  return layout === 'feature-grid';
}
