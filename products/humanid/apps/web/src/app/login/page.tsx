import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = {
  title: "Sign In — HumanID",
  description: "Sign in to your HumanID account",
};

export default function LoginPage() {
  return (
    <PlaceholderPage
      title="Sign In"
      description="Securely sign in to your HumanID account using your decentralised identifier (DID), email, or a supported OAuth provider. Multi-factor authentication and passkey support coming soon."
      backLink={{ href: "/", label: "Back to Home" }}
    />
  );
}
