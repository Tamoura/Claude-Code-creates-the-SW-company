"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BuildStatusBadge } from "@/components/r2d/status-badge";
import { Badge } from "@/components/ui/badge";
import { dataService } from "@/lib/mock-data/data-service";
import { Plus, Search } from "lucide-react";
import type { Pipeline, PipelineStatus, BuildStatus } from "@/types/r2d";

export default function PipelinesPage() {
  const allPipelines = dataService.getPipelines();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PipelineStatus | "all">("all");

  const filteredPipelines = useMemo(() => {
    return allPipelines.filter((pipeline) => {
      const matchesSearch =
        searchQuery === "" ||
        pipeline.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pipeline.repository.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || pipeline.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [allPipelines, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Build Pipelines"
        description="Manage CI/CD pipelines and build configurations"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "R2D", href: "/r2d" },
          { title: "Pipelines" },
        ]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Pipeline
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
                placeholder="Search pipelines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PipelineStatus | "all")}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredPipelines.length} of {allPipelines.length} pipelines
        </p>
      </div>

      {/* Pipelines Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Repository</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Branch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Last Run</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPipelines.map((pipeline) => (
                  <tr key={pipeline.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/r2d/pipelines/${pipeline.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {pipeline.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm">{pipeline.repository}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-xs">
                        {pipeline.branch}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={pipeline.status === "active" ? "success" : pipeline.status === "paused" ? "warning" : "secondary"}>
                        {pipeline.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {pipeline.lastRunStatus ? (
                        <div className="flex flex-col gap-1">
                          <BuildStatusBadge status={pipeline.lastRunStatus} />
                          {pipeline.lastRunAt && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(pipeline.lastRunAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No runs</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm capitalize">{pipeline.triggerType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPipelines.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No pipelines found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
