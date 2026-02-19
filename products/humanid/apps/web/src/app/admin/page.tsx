import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = {
  title: "Admin Dashboard — HumanID",
  description: "HumanID platform administration",
};

export default function AdminPage() {
  return (
    <PlaceholderPage
      title="Admin Dashboard"
      description="Platform-wide administration for HumanID. Monitor system health, review audit logs, manage issuer trust levels, handle user escalations, configure platform-wide policies, and view aggregate analytics across all wallets, issuers, and verifications."
      backLink={{ href: "/", label: "Back to Home" }}
    />
  );
}
