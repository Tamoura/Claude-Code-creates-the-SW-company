import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function D2CPage() {
  return (
    <div>
      <PageHeader
        title="Detect to Correct"
        description="Detect, diagnose, and resolve IT issues while managing changes safely"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "D2C" },
        ]}
      />
      <ComingSoon
        title="D2C Dashboard Coming Soon"
        description="The Detect to Correct value stream dashboard will provide incident management, problem tracking, and change control."
      />
    </div>
  );
}
