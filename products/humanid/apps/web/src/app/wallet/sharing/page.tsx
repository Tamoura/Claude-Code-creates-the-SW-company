import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = {
  title: "Sharing History — HumanID Wallet",
  description: "Review your credential sharing history",
};

export default function WalletSharingPage() {
  return (
    <PlaceholderPage
      title="Sharing History"
      description="Review every instance where you have shared credentials with a verifier — who received them, which claims were disclosed, when they were shared, and whether the sharing session has expired. Revoke active sessions at any time."
      backLink={{ href: "/wallet", label: "Back to Wallet" }}
    />
  );
}
