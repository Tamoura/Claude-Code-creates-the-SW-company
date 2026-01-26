import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/dashboard/kpi-card";
import { ValueStreamCard } from "@/components/dashboard/value-stream-card";
import { Target, Rocket, ShoppingCart, AlertCircle } from "lucide-react";
import { dataService } from "@/lib/mock-data/data-service";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const metrics = dataService.getDashboardMetrics();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Executive Dashboard"
        description="Comprehensive overview across all IT4IT value streams"
      />

      {/* Top KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total IT Investment"
          value={formatCurrency(metrics.s2p.totalInvestment)}
          change={8.2}
          trend="up"
          description="vs last quarter"
        />
        <KPICard
          title="Open Incidents"
          value={metrics.d2c.openIncidents}
          change={-12}
          trend="down"
          description="vs last week"
        />
        <KPICard
          title="Pending Requests"
          value={metrics.r2f.pendingRequests}
          change={5}
          trend="up"
          description="vs yesterday"
        />
        <KPICard
          title="Active Pipelines"
          value={metrics.r2d.activePipelines}
          trend="neutral"
          description="production ready"
        />
      </div>

      {/* Value Stream Cards */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Value Streams</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ValueStreamCard
            title="Strategy to Portfolio"
            description="Manage IT portfolio from demand intake to investment execution"
            href="/s2p"
            icon={Target}
            color="bg-blue-600"
            metrics={[
              { label: "Active Demands", value: metrics.s2p.activeDemands },
              { label: "Portfolio Items", value: metrics.s2p.portfolioItems },
              { label: "Total Investment", value: formatCurrency(metrics.s2p.totalInvestment) },
            ]}
          />

          <ValueStreamCard
            title="Requirement to Deploy"
            description="Manage IT services from requirements through deployment"
            href="/r2d"
            icon={Rocket}
            color="bg-green-600"
            metrics={[
              { label: "Active Pipelines", value: metrics.r2d.activePipelines },
              { label: "Failed Builds", value: metrics.r2d.failedBuilds },
              { label: "Pending Releases", value: metrics.r2d.pendingReleases },
            ]}
          />

          <ValueStreamCard
            title="Request to Fulfill"
            description="Enable users to request and receive IT services efficiently"
            href="/r2f"
            icon={ShoppingCart}
            color="bg-purple-600"
            metrics={[
              { label: "Pending Requests", value: metrics.r2f.pendingRequests },
              { label: "Avg Fulfillment Time", value: `${metrics.r2f.avgFulfillmentTime}d` },
              { label: "Active Subscriptions", value: metrics.r2f.activeSubscriptions },
            ]}
          />

          <ValueStreamCard
            title="Detect to Correct"
            description="Detect, diagnose, and resolve IT issues while managing changes"
            href="/d2c"
            icon={AlertCircle}
            color="bg-orange-600"
            metrics={[
              { label: "Open Incidents", value: metrics.d2c.openIncidents },
              { label: "Critical Incidents", value: metrics.d2c.criticalIncidents },
              { label: "Open Changes", value: metrics.d2c.openChanges },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
