import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = {
  title: "About HumanID",
  description: "Learn about HumanID's mission and technology",
};

export default function AboutPage() {
  return (
    <PlaceholderPage
      title="About HumanID"
      description="HumanID is building the universal digital identity layer for the internet. Learn about our mission, the open standards we implement (W3C DID, W3C Verifiable Credentials, OpenID4VC), our team, and our commitment to user privacy and data sovereignty."
      backLink={{ href: "/", label: "Back to Home" }}
    />
  );
}
