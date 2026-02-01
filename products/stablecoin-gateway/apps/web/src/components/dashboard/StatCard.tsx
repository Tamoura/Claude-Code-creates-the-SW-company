interface StatCardProps {
  title: string;
  value: string;
  trend?: string;
  subtitle?: string;
}

export default function StatCard({ title, value, trend, subtitle }: StatCardProps) {
  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-6">
      <div className="text-sm text-text-secondary mb-2">{title}</div>
      <div className="text-3xl font-bold text-text-primary mb-2">{value}</div>
      {trend && (
        <div className="flex items-center gap-1.5 text-sm text-accent-green">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
          </svg>
          {trend}
        </div>
      )}
      {subtitle && (
        <div className="text-sm text-text-secondary">{subtitle}</div>
      )}
    </div>
  );
}
