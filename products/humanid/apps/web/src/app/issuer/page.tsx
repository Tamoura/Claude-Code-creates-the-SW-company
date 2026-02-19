import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = {
  title: "Issuer Dashboard — HumanID",
  description: "Manage your credential issuance as a HumanID issuer",
};

export default function IssuerPage() {
  return (
    <PlaceholderPage
      title="Issuer Dashboard"
      description="The Issuer Dashboard gives your organisation a complete view of all issued credentials, active templates, revocation queues, and issuance analytics. Monitor trust levels, manage your DID document, and configure issuance policies."
      backLink={{ href: "/", label: "Back to Home" }}
    />
  );
}
