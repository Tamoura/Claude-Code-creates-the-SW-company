import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function R2DPage() {
  return (
    <div>
      <PageHeader
        title="Requirement to Deploy"
        description="Manage IT services from requirements through build, test, and deployment"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "R2D" },
        ]}
      />
      <ComingSoon
        title="R2D Dashboard Coming Soon"
        description="The Requirement to Deploy value stream dashboard will provide pipeline visibility, release management, and deployment tracking."
      />
    </div>
  );
}
