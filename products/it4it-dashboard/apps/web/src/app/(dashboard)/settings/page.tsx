import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your preferences and account settings"
      />
      <ComingSoon
        title="Settings Coming Soon"
        description="User preferences, notification settings, and dashboard customization will be available here."
      />
    </div>
  );
}
