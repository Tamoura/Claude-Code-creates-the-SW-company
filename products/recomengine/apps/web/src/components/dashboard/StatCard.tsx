interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
}

export default function StatCard({ title, value, change, changeType = 'neutral', icon }: StatCardProps) {
  const changeColors = {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-500 dark:text-gray-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</span>
        {icon && (
          <span className="text-lg">{icon}</span>
        )}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {change && (
        <div className={`text-sm mt-1 ${changeColors[changeType]}`}>
          {change}
        </div>
      )}
    </div>
  );
}
