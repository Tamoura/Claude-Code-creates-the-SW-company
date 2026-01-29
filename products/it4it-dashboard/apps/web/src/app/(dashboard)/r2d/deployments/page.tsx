"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DeploymentStatusBadge } from "@/components/r2d/status-badge";
import { Badge } from "@/components/ui/badge";
import { dataService } from "@/lib/mock-data/data-service";
import { Search } from "lucide-react";
import type { Deployment, Environment, DeploymentStatus } from "@/types/r2d";

export default function DeploymentsPage() {
  const allDeployments = dataService.getDeployments();
  const [searchQuery, setSearchQuery] = useState("");
  const [envFilter, setEnvFilter] = useState<Environment | "all">("all");
  const [statusFilter, setStatusFilter] = useState<DeploymentStatus | "all">("all");

  const filteredDeployments = useMemo(() => {
    return allDeployments.filter((deployment) => {
      const matchesSearch =
        searchQuery === "" ||
        deployment.releaseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deployment.version.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesEnv = envFilter === "all" || deployment.environment === envFilter;
      const matchesStatus = statusFilter === "all" || deployment.status === statusFilter;

      return matchesSearch && matchesEnv && matchesStatus;
    });
  }, [allDeployments, searchQuery, envFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deployments"
        description="Track and manage application deployments across environments"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "R2D", href: "/r2d" },
          { title: "Deployments" },
        ]}
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search deployments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <select
              value={envFilter}
              onChange={(e) => setEnvFilter(e.target.value as Environment | "all")}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Environments</option>
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DeploymentStatus | "all")}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="rolled_back">Rolled Back</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredDeployments.length} of {allDeployments.length} deployments
        </p>
      </div>

      {/* Deployments Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Release</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Version</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Environment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Deployed By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Started</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDeployments.map((deployment) => (
                  <tr key={deployment.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{deployment.releaseName}</span>
                        <span className="text-xs text-muted-foreground">{deployment.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">v{deployment.version}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        variant={
                          deployment.environment === "production" ? "destructive" :
                          deployment.environment === "staging" ? "warning" : "info"
                        }
                        className="capitalize"
                      >
                        {deployment.environment}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <DeploymentStatusBadge status={deployment.status} />
                    </td>
                    <td className="px-6 py-4 text-sm">{deployment.deployedBy}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(deployment.startedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {deployment.duration ? `${Math.floor(deployment.duration / 60)}m ${deployment.duration % 60}s` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredDeployments.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No deployments found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
