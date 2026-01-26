import { PageHeader } from "@/components/layout/page-header";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        description="Comprehensive overview across all IT4IT value streams"
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="h-40 rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Strategy to Portfolio</h3>
          <p className="mt-2 text-2xl font-bold">12</p>
          <p className="text-sm text-muted-foreground">Active Demands</p>
        </div>
        <div className="h-40 rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Requirement to Deploy</h3>
          <p className="mt-2 text-2xl font-bold">8</p>
          <p className="text-sm text-muted-foreground">Active Pipelines</p>
        </div>
        <div className="h-40 rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Request to Fulfill</h3>
          <p className="mt-2 text-2xl font-bold">45</p>
          <p className="text-sm text-muted-foreground">Pending Requests</p>
        </div>
        <div className="h-40 rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Detect to Correct</h3>
          <p className="mt-2 text-2xl font-bold">23</p>
          <p className="text-sm text-muted-foreground">Open Incidents</p>
        </div>
      </div>
    </div>
  );
}
