import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = {
  title: "Issue Credentials — HumanID Issuer",
  description: "Issue verifiable credentials to your users",
};

export default function IssuerCredentialsPage() {
  return (
    <PlaceholderPage
      title="Issue Credentials"
      description="Issue verifiable credentials directly to holders using your organisation's trusted DID. Select a template, fill in the subject claims, set an expiration date, and trigger issuance via QR code or deep link. Bulk issuance via CSV and API also supported."
      backLink={{ href: "/issuer", label: "Back to Issuer Dashboard" }}
    />
  );
}
