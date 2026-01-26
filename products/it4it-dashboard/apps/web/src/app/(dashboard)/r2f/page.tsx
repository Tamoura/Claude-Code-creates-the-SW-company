import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dataService } from "@/lib/mock-data/data-service";
import { ShoppingCart, Clock, Users, Package } from "lucide-react";
import { RequestStatusBadge } from "@/components/r2f/status-badge";

export default function R2FPage() {
  const serviceRequests = dataService.getServiceRequests();
  const subscriptions = dataService.getSubscriptions();
  const serviceCatalog = dataService.getServiceCatalog();
  const metrics = dataService.getDashboardMetrics();

  const recentRequests = serviceRequests
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  const requestsByStatus = {
    draft: serviceRequests.filter((req) => req.status === "draft").length,
    submitted: serviceRequests.filter((req) => req.status === "submitted").length,
    approved: serviceRequests.filter((req) => req.status === "approved").length,
    fulfilling: serviceRequests.filter((req) => req.status === "fulfilling").length,
    fulfilled: serviceRequests.filter((req) => req.status === "fulfilled").length,
    rejected: serviceRequests.filter((req) => req.status === "rejected").length,
    cancelled: serviceRequests.filter((req) => req.status === "cancelled").length,
  };

  const subscriptionsByStatus = {
    active: subscriptions.filter((sub) => sub.status === "active").length,
    suspended: subscriptions.filter((sub) => sub.status === "suspended").length,
    expired: subscriptions.filter((sub) => sub.status === "expired").length,
    cancelled: subscriptions.filter((sub) => sub.status === "cancelled").length,
  };

  const topServices = serviceCatalog
    .filter((svc) => svc.status === "active")
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Request to Fulfill"
        description="Manage service catalog, requests, subscriptions, and fulfillment"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "R2F" },
        ]}
      />

      {/* Top KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Pending Requests"
          value={metrics.r2f.pendingRequests}
          change={5}
          trend="up"
          description="vs last week"
        />
        <KPICard
          title="Active Subscriptions"
          value={metrics.r2f.activeSubscriptions}
          change={3}
          trend="up"
          description="vs last month"
        />
        <KPICard
          title="Avg Fulfillment Time"
          value={`${metrics.r2f.avgFulfillmentTime}d`}
          change={-10}
          trend="down"
          description="vs last month"
        />
        <KPICard
          title="Catalog Services"
          value={serviceCatalog.filter((s) => s.status === "active").length}
          trend="neutral"
          description="available"
        />
      </div>

      {/* Charts and Lists */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Requests by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Requests by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(requestsByStatus).map(([status, count]) => {
                const colors = {
                  draft: "bg-gray-400",
                  submitted: "bg-blue-500",
                  approved: "bg-green-500",
                  fulfilling: "bg-yellow-500",
                  fulfilled: "bg-green-600",
                  rejected: "bg-red-500",
                  cancelled: "bg-gray-500",
                };
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{status}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[status as keyof typeof colors]}`}
                          style={{ width: `${(count / serviceRequests.length) * 100}%` }}
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

        {/* Subscriptions by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Subscriptions by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(subscriptionsByStatus).map(([status, count]) => {
                const colors = {
                  active: "bg-green-600",
                  suspended: "bg-yellow-500",
                  expired: "bg-gray-500",
                  cancelled: "bg-gray-400",
                };
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{status}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[status as keyof typeof colors]}`}
                          style={{ width: `${(count / subscriptions.length) * 100}%` }}
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

        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Recent Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div key={request.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{request.serviceName}</p>
                    <p className="text-xs text-muted-foreground">{request.requestor}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <RequestStatusBadge status={request.status} />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Popular Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topServices.map((service) => (
                <div key={service.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{service.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{service.category}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold">${service.price}/mo</span>
                    <span className="text-xs text-muted-foreground">
                      {service.deliveryTime}h delivery
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
