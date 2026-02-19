import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = {
  title: "Verify Email — HumanID",
  description: "Verify your email address to activate your HumanID account",
};

export default function VerifyEmailPage() {
  return (
    <PlaceholderPage
      title="Verify Your Email"
      description="After registration, a verification link will be sent to your email address. Click the link to activate your account and begin using your HumanID digital wallet."
      backLink={{ href: "/register", label: "Back to Registration" }}
    />
  );
}
