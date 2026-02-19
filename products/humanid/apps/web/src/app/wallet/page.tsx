import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = {
  title: "Wallet — HumanID",
  description: "Your HumanID credential wallet",
};

export default function WalletPage() {
  return (
    <PlaceholderPage
      title="Your Identity Wallet"
      description="Your personal credential wallet is the central hub for managing your digital identity. View all issued credentials, initiate sharing requests, review your activity log, and manage your decentralised identifier (DID) settings."
      backLink={{ href: "/", label: "Back to Home" }}
    />
  );
}
