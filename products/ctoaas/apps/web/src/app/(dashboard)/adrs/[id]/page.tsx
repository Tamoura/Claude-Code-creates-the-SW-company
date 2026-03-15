"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAdr, useAdrActions } from "@/hooks/useAdrs";
import { AdrStatusBadge } from "@/components/adr/AdrStatusBadge";
import { ADR_STATUS_TRANSITIONS } from "@/types/adr";
import type { AdrStatus } from "@/types/adr";
import { ADR_STATUS_META } from "@/types/adr";

/**
 * ADR detail page showing all fields and status change actions.
 * [US-15][FR-033]
 */
export default function AdrDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { adr, isLoading, error, refetch } = useAdr(id);
  const { updateStatus, deleteAdr, isSaving, isDeleting } = useAdrActions();

  const handleStatusChange = async (newStatus: AdrStatus) => {
    const result = await updateStatus(id, newStatus);
    if (result) {
      refetch();
    }
  };

  const handleDelete = async () => {
    const success = await deleteAdr(id);
    if (success) {
      router.push("/adrs");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-16">
          <div className="text-muted-foreground" role="status" aria-label="Loading ADR">
            Loading ADR...
          </div>
        </div>
      </div>
    );
  }

  if (error || !adr) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/adrs"
            className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            &larr; Back to ADRs
          </Link>
        </div>
        <div
          className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800"
          role="alert"
        >
          {error || "ADR not found."}
        </div>
      </div>
    );
  }

  const allowedTransitions = ADR_STATUS_TRANSITIONS[adr.status];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <div>
        <Link
          href="/adrs"
          className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        >
          &larr; Back to ADRs
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{adr.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <AdrStatusBadge status={adr.status} />
          </div>
        </div>
        <Link
          href={`/adrs/${id}/edit`}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px] inline-flex items-center flex-shrink-0"
        >
          Edit
        </Link>
      </div>

      {/* Context */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-2">Context</h2>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{adr.context}</p>
      </section>

      {/* Decision */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-2">Decision</h2>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{adr.decision}</p>
      </section>

      {/* Consequences */}
      {adr.consequences && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-2">Consequences</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{adr.consequences}</p>
        </section>
      )}

      {/* Alternatives */}
      {adr.alternatives && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-2">Alternatives</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{adr.alternatives}</p>
        </section>
      )}

      {/* Diagram */}
      {adr.diagram && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-2">Architecture Diagram</h2>
          <pre className="bg-muted p-4 rounded-lg text-sm text-foreground overflow-x-auto font-mono">
            <code>{adr.diagram}</code>
          </pre>
        </section>
      )}

      {/* Status transitions */}
      {allowedTransitions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-2">Change Status</h2>
          <div className="flex flex-wrap gap-2">
            {allowedTransitions.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={isSaving}
                className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 disabled:pointer-events-none min-h-[44px]"
              >
                Move to {ADR_STATUS_META[status].label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Timestamps and delete */}
      <div className="pt-4 border-t border-border flex items-center justify-between">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Created: {new Date(adr.createdAt).toLocaleString()}</p>
          <p>Updated: {new Date(adr.updatedAt).toLocaleString()}</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50 disabled:pointer-events-none min-h-[44px]"
        >
          {isDeleting ? "Deleting..." : "Delete ADR"}
        </button>
      </div>
    </div>
  );
}
