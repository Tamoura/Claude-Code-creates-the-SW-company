import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function HelpPage() {
  return (
    <div>
      <PageHeader
        title="Help & Documentation"
        description="Learn about IT4IT value streams and how to use this dashboard"
      />
      <ComingSoon
        title="Help Center Coming Soon"
        description="Documentation and guides for using the IT4IT Dashboard will be available here."
      />
    </div>
  );
}
