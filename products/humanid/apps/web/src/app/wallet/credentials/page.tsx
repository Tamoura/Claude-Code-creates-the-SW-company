import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = {
  title: "My Credentials — HumanID Wallet",
  description: "View and manage your verifiable credentials",
};

export default function WalletCredentialsPage() {
  return (
    <PlaceholderPage
      title="My Credentials"
      description="Browse all your verifiable credentials — government IDs, professional certifications, academic degrees, membership cards, and more. Filter by type, issuer, or status. Present credentials using QR codes or deep links."
      backLink={{ href: "/wallet", label: "Back to Wallet" }}
    />
  );
}
