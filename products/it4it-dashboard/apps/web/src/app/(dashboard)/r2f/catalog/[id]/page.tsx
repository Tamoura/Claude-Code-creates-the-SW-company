import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceCategoryBadge } from "@/components/r2f/status-badge";
import { Badge } from "@/components/ui/badge";
import { dataService } from "@/lib/mock-data/data-service";
import { Clock, DollarSign, Shield, Zap } from "lucide-react";

interface ServiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { id } = await params;
  const service = dataService.getServiceCatalogEntryById(id);

  if (!service) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={service.name}
        description={`Service ID: ${service.id}`}
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "R2F", href: "/r2f" },
          { title: "Catalog", href: "/r2f/catalog" },
          { title: service.id },
        ]}
        actions={
          <Button disabled={service.status !== "active"}>
            {service.status === "active" ? "Request This Service" : "Service Unavailable"}
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle>Service Overview</CardTitle>
                <div className="flex gap-2">
                  <ServiceCategoryBadge category={service.category} />
                  {service.status !== "active" && (
                    <Badge variant="secondary">{service.status}</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{service.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Pricing
                  </h3>
                  <p className="text-2xl font-bold">${service.price}</p>
                  <p className="text-xs text-muted-foreground">{service.currency} per month</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Delivery Time
                  </h3>
                  <p className="text-2xl font-bold">{service.deliveryTime}h</p>
                  <p className="text-xs text-muted-foreground">Typical delivery</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Capabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {service.capabilities.map((capability, idx) => (
                  <Badge key={idx} variant="outline">
                    {capability}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          {service.requirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {service.requirements.map((requirement, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground mt-1">•</span>
                      <span>{requirement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* SLA Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Service Level Agreement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Availability</p>
                <p className="text-2xl font-bold">{service.sla.availability}%</p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium">Support Level</p>
                <Badge variant="outline" className="mt-1 capitalize">
                  {service.sla.supportLevel}
                </Badge>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium">Response Time</p>
                <p className="text-lg font-semibold">{service.sla.responseTime}h</p>
              </div>
            </CardContent>
          </Card>

          {/* Provider Card */}
          <Card>
            <CardHeader>
              <CardTitle>Provider</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{service.provider}</p>
              <p className="text-xs text-muted-foreground mt-1">Service provider</p>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{new Date(service.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">{new Date(service.updatedAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
