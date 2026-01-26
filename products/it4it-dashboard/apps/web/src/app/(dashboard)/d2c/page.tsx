import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dataService } from "@/lib/mock-data/data-service";
import { AlertCircle, Activity, GitCommit, AlertTriangle } from "lucide-react";

export default function D2CPage() {
  const incidents = dataService.getIncidents();
  const events = dataService.getEvents();
  const changes = dataService.getChanges();

  // Calculate metrics
  const openIncidents = incidents.filter(
    (inc) => inc.status !== "resolved" && inc.status !== "closed"
  );
  const criticalIncidents = openIncidents.filter((inc) => inc.severity === 1);
  const newIncidents = incidents.filter((inc) => inc.status === "new");

  const incidentsByStatus = {
    new: incidents.filter((inc) => inc.status === "new").length,
    assigned: incidents.filter((inc) => inc.status === "assigned").length,
    in_progress: incidents.filter((inc) => inc.status === "in_progress").length,
    pending: incidents.filter((inc) => inc.status === "pending").length,
    resolved: incidents.filter((inc) => inc.status === "resolved").length,
    closed: incidents.filter((inc) => inc.status === "closed").length,
  };

  const incidentsBySeverity = {
    critical: incidents.filter((inc) => inc.severity === 1).length,
    high: incidents.filter((inc) => inc.severity === 2).length,
    medium: incidents.filter((inc) => inc.severity === 3).length,
    low: incidents.filter((inc) => inc.severity === 4).length,
  };

  const recentEvents = events.slice(0, 5);
  const upcomingChanges = changes
    .filter((chg) => chg.status === "scheduled" || chg.status === "approved")
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Detect to Correct"
        description="Monitor and manage incidents, events, problems, and changes"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "D2C" },
        ]}
      />

      {/* Top KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Open Incidents"
          value={openIncidents.length}
          change={-8}
          trend="down"
          description="vs last week"
        />
        <KPICard
          title="Critical Incidents"
          value={criticalIncidents.length}
          change={-15}
          trend="down"
          description="vs last week"
        />
        <KPICard
          title="New Incidents"
          value={newIncidents.length}
          trend="neutral"
          description="today"
        />
        <KPICard
          title="Upcoming Changes"
          value={upcomingChanges.length}
          trend="neutral"
          description="next 7 days"
        />
      </div>

      {/* Charts and Lists */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Incidents by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Incidents by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(incidentsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{status.replace("_", " ")}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-600"
                        style={{ width: `${(count / incidents.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Incidents by Severity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Incidents by Severity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(incidentsBySeverity).map(([severity, count]) => {
                const colors = {
                  critical: "bg-red-600",
                  high: "bg-orange-500",
                  medium: "bg-yellow-500",
                  low: "bg-blue-500",
                };
                return (
                  <div key={severity} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{severity}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[severity as keyof typeof colors]}`}
                          style={{ width: `${(count / incidents.length) * 100}%` }}
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

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-600" />
              Recent Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div
                    className={`mt-1 h-2 w-2 rounded-full ${
                      event.severity === "critical"
                        ? "bg-red-600"
                        : event.severity === "error"
                        ? "bg-orange-500"
                        : event.severity === "warning"
                        ? "bg-yellow-500"
                        : "bg-blue-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.source}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Changes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCommit className="h-5 w-5 text-orange-600" />
              Upcoming Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingChanges.map((change) => (
                <div key={change.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div
                    className={`mt-1 h-2 w-2 rounded-full ${
                      change.risk === "critical"
                        ? "bg-red-600"
                        : change.risk === "high"
                        ? "bg-orange-500"
                        : change.risk === "medium"
                        ? "bg-yellow-500"
                        : "bg-blue-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{change.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{change.type} change</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(change.scheduledStart).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
