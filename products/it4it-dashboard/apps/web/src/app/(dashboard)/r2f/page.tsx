import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function R2FPage() {
  return (
    <div>
      <PageHeader
        title="Request to Fulfill"
        description="Enable users to request and receive IT services efficiently"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "R2F" },
        ]}
      />
      <ComingSoon
        title="R2F Dashboard Coming Soon"
        description="The Request to Fulfill value stream dashboard will provide service catalog, request management, and fulfillment tracking."
      />
    </div>
  );
}
