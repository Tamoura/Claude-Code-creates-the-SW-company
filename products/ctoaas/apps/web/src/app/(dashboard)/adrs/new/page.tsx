"use client";

import { useRouter } from "next/navigation";
import { AdrForm } from "@/components/adr/AdrForm";
import { useAdrActions } from "@/hooks/useAdrs";
import type { AdrFormData } from "@/components/adr/AdrForm";
import Link from "next/link";

/**
 * ADR create page.
 * [US-15][FR-030]
 */
export default function NewAdrPage() {
  const router = useRouter();
  const { createAdr, isSaving, error } = useAdrActions();

  const handleSubmit = async (data: AdrFormData) => {
    const result = await createAdr(data);
    if (result) {
      router.push(`/adrs/${result.id}`);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/adrs"
          className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        >
          &larr; Back to ADRs
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-foreground">
        New Architecture Decision Record
      </h1>

      {error && (
        <div
          className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <AdrForm
        onSubmit={handleSubmit}
        onCancel={() => router.push("/adrs")}
        isSaving={isSaving}
      />
    </div>
  );
}
