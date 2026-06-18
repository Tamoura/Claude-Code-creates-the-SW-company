import { Radar as RadarIcon } from 'lucide-react';

const radarItems = [
  { name: 'React Server Components', quadrant: 'Languages & Frameworks', ring: 'Adopt', color: 'bg-radar-languages' },
  { name: 'Bun Runtime', quadrant: 'Platforms', ring: 'Trial', color: 'bg-radar-platforms' },
  { name: 'Cursor AI', quadrant: 'Tools', ring: 'Adopt', color: 'bg-radar-tools' },
  { name: 'AI Code Review', quadrant: 'Techniques', ring: 'Trial', color: 'bg-radar-techniques' },
  { name: 'Deno 2', quadrant: 'Platforms', ring: 'Assess', color: 'bg-radar-platforms' },
  { name: 'Effect-TS', quadrant: 'Languages & Frameworks', ring: 'Assess', color: 'bg-radar-languages' },
  { name: 'Biome (linter)', quadrant: 'Tools', ring: 'Trial', color: 'bg-radar-tools' },
  { name: 'Platform Engineering', quadrant: 'Techniques', ring: 'Adopt', color: 'bg-radar-techniques' },
  { name: 'WASM Components', quadrant: 'Languages & Frameworks', ring: 'Hold', color: 'bg-radar-languages' },
  { name: 'Terraform CDK', quadrant: 'Tools', ring: 'Assess', color: 'bg-radar-tools' },
  { name: 'Feature Flags as Code', quadrant: 'Techniques', ring: 'Adopt', color: 'bg-radar-techniques' },
  { name: 'Edge Functions', quadrant: 'Platforms', ring: 'Adopt', color: 'bg-radar-platforms' },
];

const rings = ['Adopt', 'Trial', 'Assess', 'Hold'];
const quadrants = [
  { name: 'Languages & Frameworks', color: 'bg-radar-languages', text: 'text-radar-languages' },
  { name: 'Platforms', color: 'bg-radar-platforms', text: 'text-radar-platforms' },
  { name: 'Tools', color: 'bg-radar-tools', text: 'text-radar-tools' },
  { name: 'Techniques', color: 'bg-radar-techniques', text: 'text-radar-techniques' },
];

function RingBadge({ ring }: { ring: string }) {
  const styles: Record<string, string> = {
    Adopt: 'bg-success-light text-success',
    Trial: 'bg-info-light text-info',
    Assess: 'bg-warning-light text-warning',
    Hold: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-micro ${styles[ring]}`}>
      {ring}
    </span>
  );
}

export default function RadarPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1 text-slate-900">Technology Radar</h1>
        <p className="text-body-sm mt-1 text-slate-500">
          Track industry trends relevant to your technology stack
        </p>
      </div>

      {/* Radar visualization placeholder */}
      <div className="rounded-[12px] border border-slate-200 bg-white p-8 shadow-ring">
        <div className="mx-auto flex aspect-square max-w-lg items-center justify-center">
          {/* Concentric rings */}
          <div className="relative h-full w-full">
            {rings.map((ring, i) => (
              <div
                key={ring}
                className="absolute rounded-full border border-slate-200"
                style={{
                  top: `${i * 12.5}%`,
                  left: `${i * 12.5}%`,
                  right: `${i * 12.5}%`,
                  bottom: `${i * 12.5}%`,
                  backgroundColor: i === 0 ? '#f8fafc' : 'transparent',
                }}
              >
                <span className="absolute left-1/2 top-1 -translate-x-1/2 text-caption text-slate-400">
                  {ring}
                </span>
              </div>
            ))}
            {/* Center dot */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <RadarIcon className="h-8 w-8 text-slate-300" />
            </div>
            {/* Quadrant lines */}
            <div className="absolute left-1/2 top-0 h-full w-px bg-slate-200" />
            <div className="absolute left-0 top-1/2 h-px w-full bg-slate-200" />
          </div>
        </div>

        {/* Quadrant legend */}
        <div className="mt-6 flex items-center justify-center gap-6">
          {quadrants.map((q) => (
            <div key={q.name} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${q.color}`} />
              <span className="text-caption text-slate-600">{q.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* List view */}
      <div className="rounded-[12px] border border-slate-200 bg-white shadow-ring">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-h3 text-slate-900">All Technologies</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-3 text-left text-overline text-slate-500">Technology</th>
                <th className="px-4 py-3 text-left text-overline text-slate-500">Quadrant</th>
                <th className="px-4 py-3 text-left text-overline text-slate-500">Ring</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {radarItems.map((item) => (
                <tr key={item.name} className="transition-colors hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${item.color}`} />
                      <span className="text-body-sm font-medium text-slate-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-body-sm text-slate-600">{item.quadrant}</td>
                  <td className="px-4 py-3"><RingBadge ring={item.ring} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
