"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Adr, AdrStatus } from "@/types/adr";
import { ADR_STATUS_META } from "@/types/adr";

const adrSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be under 200 characters"),
  status: z.enum(["proposed", "accepted", "deprecated", "superseded"] as const),
  context: z.string().min(1, "Context is required"),
  decision: z.string().min(1, "Decision is required"),
  consequences: z.string().optional().default(""),
  alternatives: z.string().optional().default(""),
  diagram: z.string().optional().default(""),
});

export type AdrFormData = z.infer<typeof adrSchema>;

interface AdrFormProps {
  initialData?: Adr;
  onSubmit: (data: AdrFormData) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

const ALL_STATUSES: AdrStatus[] = [
  "proposed",
  "accepted",
  "deprecated",
  "superseded",
];

/**
 * ADR create/edit form with validation.
 * [US-15][FR-030][FR-033]
 */
export function AdrForm({
  initialData,
  onSubmit,
  onCancel,
  isSaving,
}: AdrFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdrFormData>({
    resolver: zodResolver(adrSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          status: initialData.status,
          context: initialData.context,
          decision: initialData.decision,
          consequences: initialData.consequences ?? "",
          alternatives: initialData.alternatives ?? "",
          diagram: initialData.diagram ?? "",
        }
      : {
          title: "",
          status: "proposed" as const,
          context: "",
          decision: "",
          consequences: "",
          alternatives: "",
          diagram: "",
        },
  });

  const handleFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data);
  });

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6" noValidate>
      {/* Title */}
      <div>
        <label htmlFor="adr-title" className="block text-sm font-medium text-foreground mb-1">
          Title <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          id="adr-title"
          type="text"
          {...register("title")}
          aria-invalid={errors.title ? "true" : "false"}
          aria-describedby={errors.title ? "adr-title-error" : undefined}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          placeholder="Descriptive title for this decision"
        />
        {errors.title && (
          <p id="adr-title-error" role="alert" className="text-red-500 text-sm mt-1">
            {errors.title.message}
          </p>
        )}
      </div>

      {/* Status */}
      <div>
        <label htmlFor="adr-status" className="block text-sm font-medium text-foreground mb-1">
          Status
        </label>
        <select
          id="adr-status"
          {...register("status")}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ADR_STATUS_META[s].label}
            </option>
          ))}
        </select>
      </div>

      {/* Context */}
      <div>
        <label htmlFor="adr-context" className="block text-sm font-medium text-foreground mb-1">
          Context <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <p className="text-xs text-muted-foreground mb-1">
          What is the issue that motivates this decision?
        </p>
        <textarea
          id="adr-context"
          {...register("context")}
          rows={4}
          aria-invalid={errors.context ? "true" : "false"}
          aria-describedby={errors.context ? "adr-context-error" : undefined}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 resize-y"
          placeholder="Describe the context and problem statement..."
        />
        {errors.context && (
          <p id="adr-context-error" role="alert" className="text-red-500 text-sm mt-1">
            {errors.context.message}
          </p>
        )}
      </div>

      {/* Decision */}
      <div>
        <label htmlFor="adr-decision" className="block text-sm font-medium text-foreground mb-1">
          Decision <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <p className="text-xs text-muted-foreground mb-1">
          What is the change that we are proposing?
        </p>
        <textarea
          id="adr-decision"
          {...register("decision")}
          rows={4}
          aria-invalid={errors.decision ? "true" : "false"}
          aria-describedby={errors.decision ? "adr-decision-error" : undefined}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 resize-y"
          placeholder="Describe the decision..."
        />
        {errors.decision && (
          <p id="adr-decision-error" role="alert" className="text-red-500 text-sm mt-1">
            {errors.decision.message}
          </p>
        )}
      </div>

      {/* Consequences */}
      <div>
        <label htmlFor="adr-consequences" className="block text-sm font-medium text-foreground mb-1">
          Consequences
        </label>
        <p className="text-xs text-muted-foreground mb-1">
          What becomes easier or harder as a result?
        </p>
        <textarea
          id="adr-consequences"
          {...register("consequences")}
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 resize-y"
          placeholder="Describe the consequences..."
        />
      </div>

      {/* Alternatives */}
      <div>
        <label htmlFor="adr-alternatives" className="block text-sm font-medium text-foreground mb-1">
          Alternatives
        </label>
        <p className="text-xs text-muted-foreground mb-1">
          What other options were considered?
        </p>
        <textarea
          id="adr-alternatives"
          {...register("alternatives")}
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 resize-y"
          placeholder="Describe the alternatives..."
        />
      </div>

      {/* Mermaid diagram */}
      <div>
        <label htmlFor="adr-diagram" className="block text-sm font-medium text-foreground mb-1">
          Architecture Diagram
        </label>
        <p className="text-xs text-muted-foreground mb-1">
          Paste Mermaid syntax for architecture diagrams
        </p>
        <textarea
          id="adr-diagram"
          {...register("diagram")}
          rows={5}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 resize-y"
          placeholder="graph TD&#10;  A[Client] --> B[Server]&#10;  B --> C[Database]"
        />
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none min-h-[44px]"
        >
          {isSaving ? "Saving..." : initialData ? "Update ADR" : "Create ADR"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
