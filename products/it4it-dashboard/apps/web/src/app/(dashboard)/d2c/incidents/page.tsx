"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IncidentStatusBadge, SeverityBadge } from "@/components/d2c/status-badge";
import { dataService } from "@/lib/mock-data/data-service";
import { Plus, Search } from "lucide-react";
import type { Incident, IncidentStatus, IncidentSeverity } from "@/types/d2c";

export default function IncidentsPage() {
  const allIncidents = dataService.getIncidents();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | "all">("all");

  // Filter incidents
  const filteredIncidents = useMemo(() => {
    return allIncidents.filter((incident) => {
      const matchesSearch =
        searchQuery === "" ||
        incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
      const matchesSeverity = severityFilter === "all" || incident.severity === severityFilter;

      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [allIncidents, searchQuery, statusFilter, severityFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incidents"
        description="Monitor and manage all incidents"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "D2C", href: "/d2c" },
          { title: "Incidents" },
        ]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Incident
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
                placeholder="Search incidents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | "all")}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value === "all" ? "all" : Number(e.target.value) as IncidentSeverity)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Severities</option>
              <option value="1">Critical</option>
              <option value="2">High</option>
              <option value="3">Medium</option>
              <option value="4">Low</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredIncidents.length} of {allIncidents.length} incidents
        </p>
      </div>

      {/* Incidents Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Assignee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredIncidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm">
                      <Link
                        href={`/d2c/incidents/${incident.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {incident.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm font-medium truncate">{incident.title}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td className="px-6 py-4">
                      <IncidentStatusBadge status={incident.status} />
                    </td>
                    <td className="px-6 py-4 text-sm">{incident.assignee}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{incident.affectedService}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(incident.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredIncidents.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No incidents found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
