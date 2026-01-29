"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dataService } from "@/lib/mock-data/data-service";
import { Plus, Search } from "lucide-react";
import type { Change, ChangeStatus } from "@/types/d2c";

export default function ChangesPage() {
  const allChanges = dataService.getChanges();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChangeStatus | "all">("all");

  // Filter changes
  const filteredChanges = useMemo(() => {
    return allChanges.filter((change) => {
      const matchesSearch =
        searchQuery === "" ||
        change.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        change.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || change.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [allChanges, searchQuery, statusFilter]);

  const statusConfig: Record<ChangeStatus, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
    draft: { variant: "secondary" },
    submitted: { variant: "info" },
    approved: { variant: "success" },
    scheduled: { variant: "info" },
    implementing: { variant: "warning" },
    completed: { variant: "success" },
    failed: { variant: "destructive" },
    cancelled: { variant: "outline" },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Changes"
        description="Manage and track all changes"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "D2C", href: "/d2c" },
          { title: "Changes" },
        ]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Change
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
                placeholder="Search changes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ChangeStatus | "all")}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="scheduled">Scheduled</option>
              <option value="implementing">Implementing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredChanges.length} of {allChanges.length} changes
        </p>
      </div>

      {/* Changes Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Risk</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Implementer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Scheduled</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredChanges.map((change) => (
                  <tr key={change.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm">
                      <Link
                        href={`/d2c/changes/${change.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {change.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm font-medium truncate">{change.title}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize">
                        {change.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          change.risk === "critical"
                            ? "destructive"
                            : change.risk === "high"
                            ? "warning"
                            : "secondary"
                        }
                        className="capitalize"
                      >
                        {change.risk}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusConfig[change.status].variant} className="capitalize">
                        {change.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm">{change.implementer}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(change.scheduledStart).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredChanges.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No changes found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
