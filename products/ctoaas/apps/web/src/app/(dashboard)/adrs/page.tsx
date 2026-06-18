import { FileText, Plus, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';

const adrs = [
  { id: 'ADR-001', title: 'Use CopilotKit for AI UI', status: 'accepted', date: 'Mar 14, 2026', author: 'Alex Chen' },
  { id: 'ADR-002', title: 'LangGraph for Agent Orchestration', status: 'accepted', date: 'Mar 14, 2026', author: 'Alex Chen' },
  { id: 'ADR-003', title: 'LlamaIndex for RAG Pipeline', status: 'accepted', date: 'Mar 14, 2026', author: 'Alex Chen' },
  { id: 'ADR-004', title: 'PostgreSQL + pgvector over Pinecone', status: 'accepted', date: 'Mar 15, 2026', author: 'Alex Chen' },
  { id: 'ADR-005', title: 'Monolith-first backend architecture', status: 'proposed', date: 'Mar 20, 2026', author: 'Alex Chen' },
  { id: 'ADR-006', title: 'Migrate from REST to tRPC', status: 'rejected', date: 'Mar 22, 2026', author: 'Priya Sharma' },
];

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: typeof CheckCircle2; className: string }> = {
    accepted: { icon: CheckCircle2, className: 'bg-success-light text-success' },
    proposed: { icon: Clock, className: 'bg-warning-light text-warning' },
    rejected: { icon: XCircle, className: 'bg-error-light text-error' },
  };
  const { icon: Icon, className } = config[status] || config.proposed;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro capitalize ${className}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

export default function ADRsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-h1 text-slate-900">Architecture Decision Records</h1>
          <p className="text-body-sm mt-1 text-slate-500">
            Document and track your technology decisions
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-[8px] bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus className="h-4 w-4" />
          New ADR
        </button>
      </div>

      <div className="rounded-[12px] border border-slate-200 bg-white shadow-ring">
        <div className="divide-y divide-slate-50">
          {adrs.map((adr) => (
            <div key={adr.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-slate-100">
                  <FileText className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-caption text-slate-400">{adr.id}</span>
                    <p className="text-body-sm font-medium text-slate-900">{adr.title}</p>
                  </div>
                  <p className="text-caption text-slate-500">
                    {adr.author} &middot; {adr.date}
                  </p>
                </div>
              </div>
              <StatusBadge status={adr.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
