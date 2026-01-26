"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReleaseStatusBadge } from "@/components/r2d/status-badge";
import { Badge } from "@/components/ui/badge";
import { dataService } from "@/lib/mock-data/data-service";
import { Plus, Search } from "lucide-react";
import type { Release, ReleaseStatus, ReleaseType } from "@/types/r2d";

export default function ReleasesPage() {
  const allReleases = dataService.getReleases();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReleaseStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ReleaseType | "all">("all");

  const filteredReleases = useMemo(() => {
    return allReleases.filter((release) => {
      const matchesSearch =
        searchQuery === "" ||
        release.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        release.version.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || release.status === statusFilter;
      const matchesType = typeFilter === "all" || release.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [allReleases, searchQuery, statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Releases"
        description="Manage software releases and version deployments"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "R2D", href: "/r2d" },
          { title: "Releases" },
        ]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Release
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search releases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReleaseStatus | "all")}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ReleaseType | "all")}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Types</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
              <option value="patch">Patch</option>
              <option value="hotfix">Hotfix</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredReleases.length} of {allReleases.length} releases
        </p>
      </div>

      {/* Releases Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Version</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Created By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Scheduled</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Requirements</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredReleases.map((release) => (
                  <tr key={release.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{release.name}</span>
                        <span className="text-xs text-muted-foreground">{release.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">v{release.version}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        variant={
                          release.type === "major" ? "destructive" :
                          release.type === "minor" ? "warning" :
                          release.type === "hotfix" ? "info" : "secondary"
                        }
                        className="capitalize"
                      >
                        {release.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <ReleaseStatusBadge status={release.status} />
                    </td>
                    <td className="px-6 py-4 text-sm">{release.createdBy}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {release.scheduledDate ? new Date(release.scheduledDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">{release.requirements.length} items</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredReleases.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No releases found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
