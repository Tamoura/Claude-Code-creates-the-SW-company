import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = {
  title: "Developer Portal — HumanID",
  description: "Build identity-powered applications with the HumanID API",
};

export default function DeveloperPage() {
  return (
    <PlaceholderPage
      title="Developer Portal"
      description="Everything you need to integrate HumanID into your application. Access API keys, explore interactive documentation, test in the sandbox environment, and download SDKs for your preferred language. Rate limits, webhooks, and OIDC configuration available here."
      backLink={{ href: "/", label: "Back to Home" }}
    />
  );
}
