import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dataService } from "@/lib/mock-data/data-service";
import { GitBranch, TrendingUp, Package, Rocket } from "lucide-react";
import { BuildStatusBadge, DeploymentStatusBadge } from "@/components/r2d/status-badge";

export default function R2DPage() {
  const builds = dataService.getBuilds();
  const deployments = dataService.getDeployments();
  const releases = dataService.getReleases();
  const pipelines = dataService.getPipelines();
  const metrics = dataService.getDashboardMetrics();

  const recentBuilds = builds
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .slice(0, 5);

  const buildsByStatus = {
    pending: builds.filter((b) => b.status === "pending").length,
    running: builds.filter((b) => b.status === "running").length,
    success: builds.filter((b) => b.status === "success").length,
    failed: builds.filter((b) => b.status === "failed").length,
    cancelled: builds.filter((b) => b.status === "cancelled").length,
  };

  const deploymentsByEnv = {
    development: deployments.filter((d) => d.environment === "development").length,
    staging: deployments.filter((d) => d.environment === "staging").length,
    production: deployments.filter((d) => d.environment === "production").length,
  };

  const recentDeployments = deployments
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .slice(0, 5);

  const upcomingReleases = releases
    .filter((r) => r.status === "scheduled" || r.status === "in_progress")
    .sort((a, b) => (a.scheduledDate?.getTime() || 0) - (b.scheduledDate?.getTime() || 0))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Requirement to Deploy"
        description="Manage builds, deployments, releases, and CI/CD pipelines"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "R2D" },
        ]}
      />

      {/* Top KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Active Pipelines"
          value={metrics.r2d.activePipelines}
          change={2}
          trend="up"
          description="vs last week"
        />
        <KPICard
          title="Failed Builds"
          value={metrics.r2d.failedBuilds}
          change={-25}
          trend="down"
          description="vs last week"
        />
        <KPICard
          title="Pending Releases"
          value={metrics.r2d.pendingReleases}
          trend="neutral"
          description="scheduled"
        />
        <KPICard
          title="Success Rate"
          value={`${Math.round((buildsByStatus.success / builds.length) * 100)}%`}
          change={5}
          trend="up"
          description="build success"
        />
      </div>

      {/* Charts and Lists */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Builds by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-green-600" />
              Builds by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(buildsByStatus).map(([status, count]) => {
                const colors = {
                  pending: "bg-gray-400",
                  running: "bg-blue-500",
                  success: "bg-green-600",
                  failed: "bg-red-500",
                  cancelled: "bg-gray-500",
                };
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{status}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[status as keyof typeof colors]}`}
                          style={{ width: `${(count / builds.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Deployments by Environment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Deployments by Environment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(deploymentsByEnv).map(([env, count]) => {
                const colors = {
                  development: "bg-blue-500",
                  staging: "bg-yellow-500",
                  production: "bg-green-600",
                };
                return (
                  <div key={env} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{env}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[env as keyof typeof colors]}`}
                          style={{ width: `${(count / deployments.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Builds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Recent Builds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentBuilds.map((build) => (
                <div key={build.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{build.pipelineName}</p>
                    <p className="text-xs text-muted-foreground truncate">{build.repository} / {build.branch}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <BuildStatusBadge status={build.status} />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(build.startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Deployments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-green-600" />
              Recent Deployments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDeployments.map((deployment) => (
                <div key={deployment.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{deployment.releaseName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{deployment.environment}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <DeploymentStatusBadge status={deployment.status} />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      v{deployment.version}
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
