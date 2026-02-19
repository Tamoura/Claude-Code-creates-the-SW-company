import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = {
  title: "API Keys — HumanID Developer Portal",
  description: "Create and manage your HumanID API keys",
};

export default function DeveloperApiKeysPage() {
  return (
    <PlaceholderPage
      title="API Keys"
      description="Create, rotate, and revoke API keys for your applications. Each key can be scoped to specific permissions (read credentials, issue credentials, verify presentations). Monitor per-key usage, set rate limits, and configure IP allowlists for production environments."
      backLink={{ href: "/developer", label: "Back to Developer Portal" }}
    />
  );
}
