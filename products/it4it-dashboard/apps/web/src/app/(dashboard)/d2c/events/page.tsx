"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dataService } from "@/lib/mock-data/data-service";
import { Search } from "lucide-react";
import type { Event, EventSeverity } from "@/types/d2c";

export default function EventsPage() {
  const allEvents = dataService.getEvents();
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<EventSeverity | "all">("all");

  // Filter events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      const matchesSearch =
        searchQuery === "" ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.source.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSeverity = severityFilter === "all" || event.severity === severityFilter;

      return matchesSearch && matchesSeverity;
    });
  }, [allEvents, searchQuery, severityFilter]);

  const severityConfig: Record<EventSeverity, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
    critical: { variant: "destructive" },
    error: { variant: "warning" },
    warning: { variant: "info" },
    info: { variant: "secondary" },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event Console"
        description="Real-time monitoring of system events"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "D2C", href: "/d2c" },
          { title: "Events" },
        ]}
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
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as EventSeverity | "all")}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredEvents.length} of {allEvents.length} events
        </p>
      </div>

      {/* Events List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredEvents.map((event) => (
              <div key={event.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={severityConfig[event.severity].variant} className="capitalize">
                        {event.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{event.id}</span>
                    </div>
                    <h3 className="font-medium mb-1">{event.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Source: {event.source}</span>
                      {event.relatedCI && <span>CI: {event.relatedCI}</span>}
                      <span>{new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  {!event.acknowledged && (
                    <Badge variant="outline" className="whitespace-nowrap">
                      Unacknowledged
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No events found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
