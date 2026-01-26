import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IncidentStatusBadge, SeverityBadge } from "@/components/d2c/status-badge";
import { Badge } from "@/components/ui/badge";
import { dataService } from "@/lib/mock-data/data-service";
import { Clock, User, Server, AlertCircle } from "lucide-react";

interface IncidentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function IncidentDetailPage({ params }: IncidentDetailPageProps) {
  const { id } = await params;
  const incident = dataService.getIncidentById(id);

  if (!incident) {
    notFound();
  }

  const timeOpen = Math.floor(
    (new Date().getTime() - new Date(incident.createdAt).getTime()) / (1000 * 60 * 60)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={incident.id}
        description={incident.title}
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "D2C", href: "/d2c" },
          { title: "Incidents", href: "/d2c/incidents" },
          { title: incident.id },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline">Edit</Button>
            <Button>Update Status</Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle>Incident Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{incident.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Severity
                  </h3>
                  <SeverityBadge severity={incident.severity} />
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Status</h3>
                  <IncidentStatusBadge status={incident.status} />
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Assignee
                  </h3>
                  <p className="text-sm">{incident.assignee}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Affected Service
                  </h3>
                  <p className="text-sm">{incident.affectedService}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Related CIs */}
          <Card>
            <CardHeader>
              <CardTitle>Related Configuration Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {incident.relatedCIs.map((ci) => (
                  <Badge key={ci} variant="outline">
                    {ci}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(incident.createdAt).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">Last Updated</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(incident.updatedAt).toLocaleString()}
                </p>
              </div>

              {incident.resolvedAt && (
                <div>
                  <p className="text-sm font-medium">Resolved</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(incident.resolvedAt).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-sm font-medium">Time Open</p>
                <p className="text-2xl font-bold">{timeOpen}h</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                Assign to Me
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Create Problem
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Link Change
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
