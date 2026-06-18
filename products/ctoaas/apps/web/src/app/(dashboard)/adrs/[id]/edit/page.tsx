"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAdr, useAdrActions } from "@/hooks/useAdrs";
import { AdrForm } from "@/components/adr/AdrForm";
import type { AdrFormData } from "@/components/adr/AdrForm";

/**
 * ADR edit page.
 * [US-15][FR-033]
 */
export default function EditAdrPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { adr, isLoading, error: loadError } = useAdr(id);
  const { updateAdr, isSaving, error: saveError } = useAdrActions();

  const handleSubmit = async (data: AdrFormData) => {
    const result = await updateAdr(id, data);
    if (result) {
      router.push(`/adrs/${id}`);
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

  if (loadError || !adr) {
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
          {loadError || "ADR not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href={`/adrs/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        >
          &larr; Back to ADR
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-foreground">Edit ADR</h1>

      {saveError && (
        <div
          className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800"
          role="alert"
        >
          {saveError}
        </div>
      )}

      <AdrForm
        initialData={adr}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/adrs/${id}`)}
        isSaving={isSaving}
      />
    </div>
  );
}
