import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = {
  title: "Create Account — HumanID",
  description: "Create your HumanID account and take control of your digital identity",
};

export default function RegisterPage() {
  return (
    <PlaceholderPage
      title="Create Your Identity"
      description="Sign up for HumanID to create your self-sovereign digital identity. Choose between an individual wallet, an issuer organisation account, or a developer account to access our API."
      backLink={{ href: "/", label: "Back to Home" }}
    />
  );
}
