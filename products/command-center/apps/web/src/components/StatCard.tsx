interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const colorMap = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function StatCard({ label, value, sublabel, color = 'blue' }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
      <p className="text-sm opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sublabel && <p className="text-xs opacity-50 mt-1">{sublabel}</p>}
    </div>
  );
}
