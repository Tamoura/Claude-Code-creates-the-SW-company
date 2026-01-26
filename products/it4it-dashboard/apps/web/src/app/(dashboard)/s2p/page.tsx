import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function S2PPage() {
  return (
    <div>
      <PageHeader
        title="Strategy to Portfolio"
        description="Manage IT portfolio from demand intake to investment execution"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "S2P" },
        ]}
      />
      <ComingSoon
        title="S2P Dashboard Coming Soon"
        description="The Strategy to Portfolio value stream dashboard will provide demand management, portfolio planning, and investment tracking."
      />
    </div>
  );
}
