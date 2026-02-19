import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = {
  title: "Manage Issuers — HumanID Admin",
  description: "Review and approve credential issuers on the HumanID platform",
};

export default function AdminIssuersPage() {
  return (
    <PlaceholderPage
      title="Manage Issuers"
      description="Review pending issuer applications, approve or reject organisations, assign trust levels (self-asserted, verified, government-backed), suspend problematic issuers, and audit all issuance activity. View issuer DIDs, credential volume, and revocation rates."
      backLink={{ href: "/admin", label: "Back to Admin Dashboard" }}
    />
  );
}
