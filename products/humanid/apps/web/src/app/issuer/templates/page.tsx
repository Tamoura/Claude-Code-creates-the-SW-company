import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = {
  title: "Credential Templates — HumanID Issuer",
  description: "Create and manage credential schema templates",
};

export default function IssuerTemplatesPage() {
  return (
    <PlaceholderPage
      title="Credential Templates"
      description="Design and manage reusable credential schema templates for your organisation. Define claim types, required fields, display properties, and validity rules. Templates are versioned and can be shared across your team. Supports W3C Verifiable Credential schemas and JSON-LD contexts."
      backLink={{ href: "/issuer", label: "Back to Issuer Dashboard" }}
    />
  );
}
