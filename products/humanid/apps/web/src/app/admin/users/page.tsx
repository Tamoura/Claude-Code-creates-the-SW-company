import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = {
  title: "Manage Users — HumanID Admin",
  description: "User management for the HumanID platform",
};

export default function AdminUsersPage() {
  return (
    <PlaceholderPage
      title="Manage Users"
      description="Search and manage all platform users — individual wallet holders, issuer organisation members, and developer accounts. View account status, activity history, linked DIDs, and consent records. Suspend accounts, reset credentials, and handle GDPR deletion requests."
      backLink={{ href: "/admin", label: "Back to Admin Dashboard" }}
    />
  );
}
