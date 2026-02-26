interface TrendProps {
  direction: 'up' | 'down' | 'neutral';
  value: string;
}

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  trend?: TrendProps;
}

const colorMap = {
  blue: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  red: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

function TrendIndicator({ trend }: { trend: TrendProps }) {
  if (trend.direction === 'up') {
    return (
      <div className="flex items-center gap-1 mt-1.5">
        <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
        </svg>
        <span className="text-xs text-emerald-400 font-medium">{trend.value}</span>
      </div>
    );
  }
  if (trend.direction === 'down') {
    return (
      <div className="flex items-center gap-1 mt-1.5">
        <svg className="w-3 h-3 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
        </svg>
        <span className="text-xs text-rose-400 font-medium">{trend.value}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 mt-1.5">
      <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      </svg>
      <span className="text-xs text-slate-400 font-medium">{trend.value}</span>
    </div>
  );
}

export default function StatCard({ label, value, sublabel, color = 'blue', trend }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-5 bg-slate-900 border-slate-700 ${colorMap[color]}`}>
      <p className="text-sm opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sublabel && <p className="text-xs opacity-50 mt-1">{sublabel}</p>}
      {trend && <TrendIndicator trend={trend} />}
    </div>
  );
}
