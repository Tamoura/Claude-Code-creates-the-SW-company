"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dataService } from "@/lib/mock-data/data-service";
import { InvestmentStatusBadge } from "@/components/s2p/status-badge";
import type { InvestmentType, InvestmentStatus } from "@/types/s2p";

export default function InvestmentsPage() {
  const investments = dataService.getInvestments();

  const [typeFilter, setTypeFilter] = useState<InvestmentType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<InvestmentStatus | "all">("all");

  const filteredInvestments = useMemo(() => {
    return investments.filter((investment) => {
      const matchesType = typeFilter === "all" || investment.type === typeFilter;
      const matchesStatus = statusFilter === "all" || investment.status === statusFilter;

      return matchesType && matchesStatus;
    });
  }, [investments, typeFilter, statusFilter]);

  const getTypeColor = (type: InvestmentType) => {
    const colors = {
      strategic: "text-blue-700 bg-blue-100",
      operational: "text-green-700 bg-green-100",
      compliance: "text-yellow-700 bg-yellow-100",
      innovation: "text-purple-700 bg-purple-100",
    };
    return colors[type];
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investment Tracking"
        description="Track approved and funded IT initiatives"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "S2P", href: "/s2p" },
          { title: "Investments" },
        ]}
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as InvestmentType | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="strategic">Strategic</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="innovation">Innovation</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as InvestmentStatus | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="proposed">Proposed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredInvestments.length} of {investments.length} investments
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Investment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROI
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvestments.map((investment) => (
                  <tr key={investment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{investment.name}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{investment.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(investment.type)}`}>
                        {investment.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <InvestmentStatusBadge status={investment.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {investment.owner}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      ${(investment.budget / 1000000).toFixed(1)}M
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      ${(investment.spent / 1000000).toFixed(1)}M
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {investment.roi}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {new Date(investment.startDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
