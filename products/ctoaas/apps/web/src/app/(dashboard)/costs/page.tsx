import { DollarSign, TrendingDown, ArrowRight, Server, Cloud, Cpu } from 'lucide-react';
import Link from 'next/link';

const spendBreakdown = [
  { service: 'EC2 (Compute)', amount: 9832, percent: 40, icon: Cpu },
  { service: 'RDS (Database)', amount: 5892, percent: 24, icon: Server },
  { service: 'S3 (Storage)', amount: 3687, percent: 15, icon: Cloud },
  { service: 'Other Services', amount: 5169, percent: 21, icon: Cloud },
];

const savingsOpportunities = [
  {
    title: 'Reserved Instances (Moderate Plan)',
    savings: '$6,128/month',
    effort: 'Low',
    description: '75% RI coverage on steady-state services + Savings Plan for variable workloads.',
  },
  {
    title: 'Right-size over-provisioned instances',
    savings: '$2,340/month',
    effort: 'Medium',
    description: '4 services running at <30% CPU utilization. Downsize from m5.xlarge to m5.large.',
  },
  {
    title: 'S3 Intelligent-Tiering',
    savings: '$920/month',
    effort: 'Low',
    description: '2.1TB in S3 Standard that has <1 access/month. Move to Intelligent-Tiering.',
  },
];

export default function CostsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-h1 text-slate-900">Cost Analysis</h1>
          <p className="text-body-sm mt-1 text-slate-500">
            Cloud spend optimization and TCO comparison tools
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/costs/tco"
            className="rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-ring hover:bg-slate-50"
          >
            TCO Calculator
          </Link>
          <Link
            href="/costs/cloud-spend"
            className="rounded-[8px] bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            Detailed Analysis
          </Link>
        </div>
      </div>

      {/* Spend overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-ring">
          <p className="text-overline text-slate-500">MONTHLY CLOUD SPEND</p>
          <p className="font-tabular mt-2 text-[48px] font-light leading-[1.08] tracking-[-0.031em] text-slate-950">
            $24,580
          </p>
          <span className="mt-1 inline-flex items-center gap-0.5 text-caption text-success">
            <TrendingDown className="h-3.5 w-3.5" />
            -8% from last month
          </span>
        </div>
        <div className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-ring">
          <p className="text-overline text-slate-500">POTENTIAL SAVINGS</p>
          <p className="font-tabular mt-2 text-[48px] font-light leading-[1.08] tracking-[-0.031em] text-success">
            $9,388
          </p>
          <span className="mt-1 text-caption text-slate-500">38% of current spend</span>
        </div>
        <div className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-ring">
          <p className="text-overline text-slate-500">COST PER ENGINEER</p>
          <p className="font-tabular mt-2 text-[48px] font-light leading-[1.08] tracking-[-0.031em] text-slate-950">
            $492
          </p>
          <span className="mt-1 text-caption text-slate-500">Industry avg: $580</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Spend breakdown */}
        <div className="rounded-[12px] border border-slate-200 bg-white shadow-ring">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-h3 text-slate-900">Spend Breakdown</h2>
          </div>
          <div className="p-6 space-y-4">
            {spendBreakdown.map((item) => (
              <div key={item.service} className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-brand-light">
                  <item.icon className="h-5 w-5 text-brand" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-body-sm font-medium text-slate-900">{item.service}</p>
                    <p className="font-tabular text-body-sm font-semibold text-slate-900">
                      ${item.amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-brand"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    <span className="font-tabular text-caption text-slate-400">{item.percent}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Savings opportunities */}
        <div className="rounded-[12px] border border-slate-200 bg-white shadow-ring">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-h3 text-slate-900">Savings Opportunities</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {savingsOpportunities.map((opp) => (
              <div key={opp.title} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-body-sm font-medium text-slate-900">{opp.title}</p>
                    <p className="text-caption mt-1 text-slate-500">{opp.description}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-tabular text-body-sm font-semibold text-success">
                      {opp.savings}
                    </p>
                    <span className={`text-micro ${opp.effort === 'Low' ? 'text-success' : 'text-warning'}`}>
                      {opp.effort} effort
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
