'use client';

interface StatCardsProps {
  total: number;
  completed: number;
  pending: number;
}

interface StatCardData {
  label: string;
  value: number;
  colorClasses: {
    bg: string;
    text: string;
    icon: string;
  };
  icon: React.ReactNode;
}

export function StatCards({ total, completed, pending }: StatCardsProps) {
  const cards: StatCardData[] = [
    {
      label: 'Total Tasks',
      value: total,
      colorClasses: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        icon: 'text-blue-500',
      },
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      ),
    },
    {
      label: 'Completed',
      value: completed,
      colorClasses: {
        bg: 'bg-green-50',
        text: 'text-green-700',
        icon: 'text-green-500',
      },
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Pending',
      value: pending,
      colorClasses: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        icon: 'text-amber-500',
      },
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6" role="region" aria-label="Task statistics">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl ${card.colorClasses.bg} p-5 shadow-sm ring-1 ring-gray-900/5`}
        >
          <div className="flex items-center gap-3">
            <div className={card.colorClasses.icon}>{card.icon}</div>
            <p className={`text-sm font-medium ${card.colorClasses.text}`}>
              {card.label}
            </p>
          </div>
          <p className={`mt-3 text-3xl font-bold ${card.colorClasses.text}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
