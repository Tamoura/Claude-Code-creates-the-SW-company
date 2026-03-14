"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAdrs } from "@/hooks/useAdrs";
import { AdrStatusBadge } from "@/components/adr/AdrStatusBadge";
import type { AdrStatus } from "@/types/adr";
import { ADR_STATUS_META } from "@/types/adr";

const ALL_STATUSES: AdrStatus[] = [
  "proposed",
  "accepted",
  "deprecated",
  "superseded",
];

const ITEMS_PER_PAGE = 10;

/**
 * ADR list page with filtering, search, and pagination.
 * [US-15][FR-030]
 */
export default function AdrsPage() {
  const { adrs, isLoading, error } = useAdrs();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdrStatus | "all">("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = adrs;
    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.title.toLowerCase().includes(q));
    }
    return result;
  }, [adrs, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Architecture Decision Records</h1>
        <div className="flex items-center justify-center py-16">
          <div className="text-muted-foreground" role="status" aria-label="Loading ADRs">
            Loading ADRs...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Architecture Decision Records</h1>
        <div
          className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          Architecture Decision Records
        </h1>
        <Link
          href="/adrs/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px] inline-flex items-center"
        >
          New ADR
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <label htmlFor="adr-search" className="sr-only">
            Search ADRs
          </label>
          <input
            id="adr-search"
            type="search"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          />
        </div>
        <div>
          <label htmlFor="status-filter" className="sr-only">
            Filter by status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as AdrStatus | "all");
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <option value="all">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ADR_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {adrs.length === 0 ? (
            <>
              <p className="text-lg mb-2">No ADRs created yet</p>
              <p className="text-sm">
                Create your first Architecture Decision Record to track important decisions.
              </p>
            </>
          ) : (
            <p>No ADRs match your filters.</p>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Architecture Decision Records">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-foreground">
                    Title
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((adr) => (
                  <tr
                    key={adr.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/adrs/${adr.id}`}
                        className="text-primary-600 hover:text-primary-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                      >
                        {adr.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <AdrStatusBadge status={adr.status} />
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(adr.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav aria-label="ADR list pagination" className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                aria-label="Previous page"
                className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[44px]"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                aria-label="Next page"
                className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[44px]"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
