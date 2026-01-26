"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RequestStatusBadge } from "@/components/r2f/status-badge";
import { dataService } from "@/lib/mock-data/data-service";
import { Plus, Search } from "lucide-react";
import type { ServiceRequest, RequestStatus, RequestPriority } from "@/types/r2f";

export default function MyRequestsPage() {
  const allRequests = dataService.getServiceRequests();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<RequestPriority | "all">("all");

  // Filter requests
  const filteredRequests = useMemo(() => {
    return allRequests.filter((request) => {
      const matchesSearch =
        searchQuery === "" ||
        request.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.requestor.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || request.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || request.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [allRequests, searchQuery, statusFilter, priorityFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Requests"
        description="View and manage your service requests"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "R2F", href: "/r2f" },
          { title: "My Requests" },
        ]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Request
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
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RequestStatus | "all")}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="fulfilling">Fulfilling</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value === "all" ? "all" : Number(e.target.value) as RequestPriority)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Priorities</option>
              <option value="1">Urgent (P1)</option>
              <option value="2">High (P2)</option>
              <option value="3">Medium (P3)</option>
              <option value="4">Low (P4)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredRequests.length} of {allRequests.length} requests
        </p>
      </div>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Requestor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Est. Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm">
                      <Link
                        href={`/r2f/requests/${request.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {request.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm font-medium truncate">{request.serviceName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RequestStatusBadge status={request.status} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`font-medium ${
                        request.priority === 1 ? "text-red-600" :
                        request.priority === 2 ? "text-orange-600" :
                        request.priority === 3 ? "text-yellow-600" :
                        "text-blue-600"
                      }`}>
                        P{request.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{request.requestor}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {request.estimatedDelivery
                        ? new Date(request.estimatedDelivery).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRequests.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No requests found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
