"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dataService } from "@/lib/mock-data/data-service";
import { Calendar } from "lucide-react";

export default function RoadmapPage() {
  const roadmapItems = dataService.getRoadmapItems();

  const [yearFilter, setYearFilter] = useState<string>("all");

  const filteredItems = useMemo(() => {
    return roadmapItems.filter((item) => {
      const matchesYear = yearFilter === "all" || item.year.toString() === yearFilter;
      return matchesYear;
    });
  }, [roadmapItems, yearFilter]);

  // Group items by year and quarter
  const groupedItems = useMemo(() => {
    const grouped: Record<string, Record<string, typeof roadmapItems>> = {};

    filteredItems.forEach((item) => {
      const year = item.year.toString();
      if (!grouped[year]) {
        grouped[year] = {};
      }
      if (!grouped[year][item.quarter]) {
        grouped[year][item.quarter] = [];
      }
      grouped[year][item.quarter].push(item);
    });

    return grouped;
  }, [filteredItems]);

  const getStatusColor = (status: string) => {
    const colors = {
      planned: "bg-gray-100 text-gray-700",
      in_progress: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      delayed: "bg-yellow-100 text-yellow-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return colors[status as keyof typeof colors] || colors.planned;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Strategic Roadmap"
        description="Visualize strategic plans and timelines"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "S2P", href: "/s2p" },
          { title: "Roadmap" },
        ]}
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredItems.length} of {roadmapItems.length} roadmap items
      </div>

      {/* Timeline View */}
      <div className="space-y-8">
        {Object.keys(groupedItems)
          .sort()
          .map((year) => (
            <div key={year}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{year}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {["Q1", "Q2", "Q3", "Q4"].map((quarter) => (
                  <Card key={quarter}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        {quarter}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {groupedItems[year][quarter] && groupedItems[year][quarter].length > 0 ? (
                        <div className="space-y-3">
                          {groupedItems[year][quarter].map((item) => (
                            <div
                              key={item.id}
                              className="rounded-lg border border-gray-200 p-3"
                            >
                              <div className="space-y-2">
                                <p className="font-medium text-sm text-gray-900">
                                  {item.title}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">
                                    {item.owner}
                                  </span>
                                  <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(item.status)}`}>
                                    {item.status.replace("_", " ").toUpperCase()}
                                  </span>
                                </div>
                                {item.dependencies.length > 0 && (
                                  <div className="text-xs text-gray-500">
                                    {item.dependencies.length} dependencies
                                  </div>
                                )}
                                {item.milestones.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {item.milestones.slice(0, 2).map((milestone, idx) => (
                                      <div key={idx} className="flex items-center gap-1 text-xs text-gray-600">
                                        <div className="w-1 h-1 rounded-full bg-blue-600" />
                                        {milestone}
                                      </div>
                                    ))}
                                    {item.milestones.length > 2 && (
                                      <div className="text-xs text-gray-500">
                                        +{item.milestones.length - 2} more
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No items planned</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
