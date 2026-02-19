import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = {
  title: "API Documentation — HumanID Developer Portal",
  description: "Interactive API documentation for the HumanID platform",
};

export default function DeveloperDocsPage() {
  return (
    <PlaceholderPage
      title="API Documentation"
      description="Full interactive API reference for the HumanID REST API. Browse endpoints for credential issuance, DID resolution, presentation verification, and revocation. Includes request/response examples, authentication guides, error codes, and code samples in JavaScript, Python, Go, and cURL."
      backLink={{ href: "/developer", label: "Back to Developer Portal" }}
    />
  );
}
