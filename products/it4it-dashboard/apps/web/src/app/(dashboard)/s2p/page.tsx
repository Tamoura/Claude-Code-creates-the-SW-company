import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dataService } from "@/lib/mock-data/data-service";
import { Lightbulb, TrendingUp, FileText, Target } from "lucide-react";
import { DemandStatusBadge } from "@/components/s2p/status-badge";
import Link from "next/link";

export default function S2PPage() {
  const demands = dataService.getDemands();
  const investments = dataService.getInvestments();
  const proposals = dataService.getProposals();
  const roadmapItems = dataService.getRoadmapItems();
  const metrics = dataService.getDashboardMetrics();

  const recentDemands = demands
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  const demandsByStatus = {
    new: demands.filter((d) => d.status === "new").length,
    under_review: demands.filter((d) => d.status === "under_review").length,
    approved: demands.filter((d) => d.status === "approved").length,
    rejected: demands.filter((d) => d.status === "rejected").length,
    in_portfolio: demands.filter((d) => d.status === "in_portfolio").length,
  };

  const investmentsByType = {
    strategic: investments.filter((i) => i.type === "strategic").length,
    operational: investments.filter((i) => i.type === "operational").length,
    compliance: investments.filter((i) => i.type === "compliance").length,
    innovation: investments.filter((i) => i.type === "innovation").length,
  };

  const upcomingRoadmap = roadmapItems
    .filter((r) => r.status === "planned" || r.status === "in_progress")
    .sort((a, b) => {
      const quarterOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
      const aOrder = a.year * 10 + quarterOrder[a.quarter as keyof typeof quarterOrder];
      const bOrder = b.year * 10 + quarterOrder[b.quarter as keyof typeof quarterOrder];
      return aOrder - bOrder;
    })
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Strategy to Portfolio"
        description="Manage IT portfolio from demand intake to investment execution"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "S2P" },
        ]}
      />

      {/* Top KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Open Demands"
          value={metrics.s2p.openDemands}
          change={3}
          trend="up"
          description="vs last month"
        />
        <KPICard
          title="Active Investments"
          value={`${metrics.s2p.activeInvestments} / $${(metrics.s2p.activeInvestmentsBudget / 1000000).toFixed(1)}M`}
          change={2}
          trend="up"
          description="total budget"
        />
        <KPICard
          title="Pending Proposals"
          value={metrics.s2p.pendingProposals}
          trend="neutral"
          description="awaiting decision"
        />
        <KPICard
          title="Portfolio Health"
          value={`${metrics.s2p.portfolioHealth}%`}
          change={5}
          trend="up"
          description="on track"
        />
      </div>

      {/* Charts and Lists */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Demands by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              Demands by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(demandsByStatus).map(([status, count]) => {
                const colors = {
                  new: "bg-gray-400",
                  under_review: "bg-blue-500",
                  approved: "bg-green-600",
                  rejected: "bg-red-600",
                  in_portfolio: "bg-purple-600",
                };
                const labels = {
                  new: "New",
                  under_review: "Under Review",
                  approved: "Approved",
                  rejected: "Rejected",
                  in_portfolio: "In Portfolio",
                };

                const total = demands.length;
                const percentage = total > 0 ? (count / total) * 100 : 0;

                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{labels[status as keyof typeof labels]}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${colors[status as keyof typeof colors]}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Investments by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Investments by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(investmentsByType).map(([type, count]) => {
                const colors = {
                  strategic: "bg-blue-600",
                  operational: "bg-green-600",
                  compliance: "bg-yellow-600",
                  innovation: "bg-purple-600",
                };
                const labels = {
                  strategic: "Strategic",
                  operational: "Operational",
                  compliance: "Compliance",
                  innovation: "Innovation",
                };

                const total = investments.length;
                const percentage = total > 0 ? (count / total) * 100 : 0;

                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{labels[type as keyof typeof labels]}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${colors[type as keyof typeof colors]}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Demands */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Recent Demands
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDemands.map((demand) => (
                <Link
                  key={demand.id}
                  href={`/s2p/demands`}
                  className="block rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {demand.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {demand.department} • {new Date(demand.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <DemandStatusBadge status={demand.status} />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Roadmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Upcoming Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingRoadmap.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.quarter} {item.year} • {item.owner}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                      {item.status.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
