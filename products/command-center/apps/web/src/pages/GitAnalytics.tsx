import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';

interface GitAnalyticsResponse {
  commitsByDay: Array<{ date: string; count: number }>;
  commitsByProduct: Record<string, number>;
  commitsByAuthor: Record<string, number>;
  commitsByType: Record<string, number>;
  totalCommits: number;
  stats: { additions: number; deletions: number };
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-slate-800 rounded w-48 mb-2" />
      <div className="h-4 bg-slate-800 rounded w-72 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-800 rounded-xl" />)}
      </div>
      <div className="h-48 bg-slate-800 rounded-xl mb-8" />
      <div className="grid grid-cols-2 gap-6">
        <div className="h-64 bg-slate-800 rounded-xl" />
        <div className="h-64 bg-slate-800 rounded-xl" />
      </div>
    </div>
  );
}

function heatmapColor(count: number, max: number): string {
  if (count === 0) return 'bg-slate-800';
  const ratio = count / max;
  if (ratio < 0.25) return 'bg-indigo-900';
  if (ratio < 0.5) return 'bg-indigo-700';
  if (ratio < 0.75) return 'bg-indigo-500';
  return 'bg-indigo-400';
}

function buildHeatmapGrid(commitsByDay: Array<{ date: string; count: number }>): Array<{ date: string; count: number; dayOfWeek: number }> {
  const map = new Map(commitsByDay.map((d) => [d.date, d.count]));
  const cells: Array<{ date: string; count: number; dayOfWeek: number }> = [];

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    cells.push({
      date: dateStr,
      count: map.get(dateStr) || 0,
      dayOfWeek: d.getDay(),
    });
  }

  return cells;
}

function groupByWeek(cells: Array<{ date: string; count: number; dayOfWeek: number }>): Array<Array<{ date: string; count: number; dayOfWeek: number } | null>> {
  const weeks: Array<Array<{ date: string; count: number; dayOfWeek: number } | null>> = [];
  let currentWeek: Array<{ date: string; count: number; dayOfWeek: number } | null> = new Array(7).fill(null);

  for (const cell of cells) {
    currentWeek[cell.dayOfWeek] = cell;
    if (cell.dayOfWeek === 6) {
      weeks.push(currentWeek);
      currentWeek = new Array(7).fill(null);
    }
  }

  if (currentWeek.some((c) => c !== null)) {
    weeks.push(currentWeek);
  }

  return weeks;
}

function BarChart({ data, color }: { data: [string, number][]; color: string }) {
  const maxCount = Math.max(...data.map(([, count]) => count), 1);

  const barColorMap: Record<string, string> = {
    blue: 'bg-indigo-500',
    green: 'bg-emerald-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  return (
    <div className="space-y-2">
      {data.map(([label, count]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-32 truncate" title={label}>
            {label}
          </span>
          <div className="flex-1 bg-slate-800 rounded-full h-2">
            <div
              className={`${barColorMap[color] || 'bg-indigo-500'} rounded-full h-2 transition-all`}
              style={{ width: `${(count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
        </div>
      ))}
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function GitAnalytics() {
  const { data, loading } = useApi<GitAnalyticsResponse>('/git-analytics');

  if (loading && !data) return <LoadingSkeleton />;
  if (!data) return <p className="text-rose-400">Failed to load git analytics</p>;

  const authorCount = Object.keys(data.commitsByAuthor).length;
  const cells = buildHeatmapGrid(data.commitsByDay);
  const weeks = groupByWeek(cells);
  const maxDayCount = Math.max(...cells.map((c) => c.count), 1);

  const productEntries = Object.entries(data.commitsByProduct).sort((a, b) => b[1] - a[1]);
  const typeEntries = Object.entries(data.commitsByType ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Git Analytics</h1>
        <p className="text-slate-500">Last 30 days</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Commits" value={data.totalCommits} color="blue" />
        <StatCard label="Lines Added" value={formatNumber(data.stats.additions)} sublabel="Additions" color="green" />
        <StatCard label="Lines Deleted" value={formatNumber(data.stats.deletions)} sublabel="Deletions" color="red" />
        <StatCard label="Active Contributors" value={authorCount} color="purple" />
      </div>

      {/* Commit Heatmap */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Commit Activity</h2>
        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-1 mr-2">
            {dayLabels.map((label) => (
              <div key={label} className="h-4 w-8 text-xs text-slate-500 flex items-center">
                {label}
              </div>
            ))}
          </div>
          {/* Heatmap grid: columns are weeks, rows are days */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((cell, di) => (
                <div
                  key={di}
                  className={`w-4 h-4 rounded-sm ${cell ? heatmapColor(cell.count, maxDayCount) : 'bg-transparent'}`}
                  title={cell ? `${cell.date}: ${cell.count} commit${cell.count !== 1 ? 's' : ''}` : ''}
                />
              ))}
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-2 mt-4">
          <span className="text-xs text-slate-500">Less</span>
          <div className="w-3 h-3 rounded-sm bg-slate-800" />
          <div className="w-3 h-3 rounded-sm bg-indigo-900" />
          <div className="w-3 h-3 rounded-sm bg-indigo-700" />
          <div className="w-3 h-3 rounded-sm bg-indigo-500" />
          <div className="w-3 h-3 rounded-sm bg-indigo-400" />
          <span className="text-xs text-slate-500">More</span>
        </div>
      </div>

      {/* Two-column breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Product */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">By Product</h2>
          {productEntries.length > 0 ? (
            <BarChart data={productEntries as [string, number][]} color="green" />
          ) : (
            <p className="text-slate-500 text-sm">No product data available</p>
          )}
        </div>

        {/* By Commit Type */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">By Type</h2>
          {typeEntries.length > 0 ? (
            <BarChart data={typeEntries as [string, number][]} color="purple" />
          ) : (
            <p className="text-slate-500 text-sm">No commit type data</p>
          )}
        </div>
      </div>
    </div>
  );
}
