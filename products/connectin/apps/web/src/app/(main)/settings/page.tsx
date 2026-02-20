"use client";

import { useTranslation } from "react-i18next";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-neutral-900">{title}</h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-4">
      <SettingsSection title={t("settings.account")}>
        <p className="text-sm text-neutral-500">
          Manage your account details and preferences.
        </p>
      </SettingsSection>

      <SettingsSection title={t("settings.notifications")}>
        <p className="text-sm text-neutral-500">
          Control how and when you receive notifications.
        </p>
      </SettingsSection>

      <SettingsSection title={t("settings.privacy")}>
        <p className="text-sm text-neutral-500">
          Manage who can see your profile and activity.
        </p>
      </SettingsSection>

      <SettingsSection title={t("settings.language")}>
        <p className="text-sm text-neutral-500">
          Choose your preferred display language.
        </p>
      </SettingsSection>
    </div>
  );
}
