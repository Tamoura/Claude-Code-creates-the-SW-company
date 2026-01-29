"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceCategoryBadge } from "@/components/r2f/status-badge";
import { Badge } from "@/components/ui/badge";
import { dataService } from "@/lib/mock-data/data-service";
import { Plus, Search } from "lucide-react";
import type { ServiceCatalogEntry, ServiceCategory, ServiceStatus } from "@/types/r2f";

export default function ServiceCatalogPage() {
  const allServices = dataService.getServiceCatalog();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | "all">("all");

  // Filter services
  const filteredServices = useMemo(() => {
    return allServices.filter((service) => {
      const matchesSearch =
        searchQuery === "" ||
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === "all" || service.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || service.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [allServices, searchQuery, categoryFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Catalog"
        description="Browse and request IT services"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "R2F", href: "/r2f" },
          { title: "Catalog" },
        ]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as ServiceCategory | "all")}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Categories</option>
              <option value="compute">Compute</option>
              <option value="storage">Storage</option>
              <option value="database">Database</option>
              <option value="networking">Networking</option>
              <option value="security">Security</option>
              <option value="software">Software</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ServiceStatus | "all")}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredServices.length} of {allServices.length} services
        </p>
      </div>

      {/* Service Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredServices.map((service) => (
          <Card key={service.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <ServiceCategoryBadge category={service.category} />
                    {service.status !== "active" && (
                      <Badge variant="secondary">{service.status}</Badge>
                    )}
                  </div>
                  <Link
                    href={`/r2f/catalog/${service.id}`}
                    className="block group"
                  >
                    <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                      {service.name}
                    </h3>
                  </Link>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {service.description}
                  </p>
                </div>

                {/* Details */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price:</span>
                    <span className="font-semibold">${service.price} {service.currency}/mo</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery:</span>
                    <span className="font-medium">{service.deliveryTime}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SLA:</span>
                    <span className="font-medium">{service.sla.availability}%</span>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Key Capabilities:</p>
                  <div className="flex flex-wrap gap-1">
                    {service.capabilities.slice(0, 3).map((cap, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {cap}
                      </Badge>
                    ))}
                    {service.capabilities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{service.capabilities.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Action */}
                <Button 
                  className="w-full" 
                  variant={service.status === "active" ? "default" : "secondary"}
                  disabled={service.status !== "active"}
                >
                  {service.status === "active" ? "Request Service" : "Unavailable"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No services found matching your criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
