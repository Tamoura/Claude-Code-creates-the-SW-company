'use client';

export type DateRange = '7d' | '30d' | '90d';

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const ranges: DateRange[] = ['7d', '30d', '90d'];

export default function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-[var(--bg-page)] border border-[var(--border-card)] rounded-lg p-1">
      {ranges.map((range) => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            value === range
              ? 'bg-indigo-600 text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)]'
          }`}
        >
          {range}
        </button>
      ))}
    </div>
  );
}
