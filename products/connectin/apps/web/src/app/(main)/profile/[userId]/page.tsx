"use client";

import { use, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/hooks/useProfile";
import { apiClient } from "@/lib/api";

interface UserProfilePageProps {
  params: Promise<{ userId: string }>;
}

/**
 * Dynamic profile page for viewing another user's profile.
 * Renders the same layout as the own-profile page but with
 * a "Connect" button instead of "Edit Profile".
 */
export default function UserProfilePage({ params }: UserProfilePageProps) {
  const { userId } = use(params);
  const { t } = useTranslation("common");
  const { profile, isLoading } = useProfile(userId);

  const [connectionStatus, setConnectionStatus] = useState<
    "none" | "pending_sent" | "connected"
  >("none");
  const [isConnecting, setIsConnecting] = useState(false);

  async function handleConnect() {
    setIsConnecting(true);
    try {
      const response = await apiClient.post(`/connections/request`, {
        targetUserId: userId,
      });
      if (response.success) {
        setConnectionStatus("pending_sent");
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setIsConnecting(false);
    }
  }

  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={t("loading")}
        className="flex items-center justify-center py-16"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-8 text-center shadow-apple-md">
        <p className="text-neutral-500">{t("profile.notFound")}</p>
      </div>
    );
  }

  const headline = profile.headlineEn || profile.headlineAr || "";
  const displayInitial = headline.charAt(0) || "U";

  function connectButtonLabel() {
    if (connectionStatus === "connected") return t("network.connected");
    if (connectionStatus === "pending_sent") return t("network.pendingSent");
    return t("network.connect");
  }

  return (
    <div className="space-y-4">
      {/* Profile Header Card */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] shadow-apple-md overflow-hidden">
        {/* Cover photo gradient */}
        <div className="h-28 bg-gradient-to-r from-[#0C9AB8] to-[#0B6E7F]" />

        <div className="p-6 -mt-10">
          {/* Avatar + name row */}
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-end gap-4">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={`${headline}'s profile photo`}
                  className="h-20 w-20 rounded-full object-cover ring-4 ring-white dark:ring-[#1C1C1E]"
                />
              ) : (
                <div className="h-20 w-20 rounded-full ring-4 ring-white dark:ring-[#1C1C1E] bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700">
                  {displayInitial}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 tracking-[-0.02em]">
                  {headline || `User ${userId}`}
                </h1>
                {profile.headlineAr && profile.headlineEn !== profile.headlineAr && (
                  <p className="mt-1 text-sm text-neutral-500">
                    {profile.headlineAr}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleConnect()}
              disabled={isConnecting || connectionStatus !== "none"}
              className={[
                "rounded-full px-4 py-2 text-sm font-medium",
                "hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-[180ms]",
                connectionStatus === "none"
                  ? "bg-primary-600 text-white shadow-apple-sm hover:bg-primary-700 hover:shadow-apple-md disabled:opacity-50"
                  : "border-2 border-neutral-300 text-neutral-500 cursor-default",
              ].join(" ")}
            >
              {isConnecting ? t("actions.loading") : connectButtonLabel()}
            </button>
          </div>
        </div>
      </div>

      {/* About section */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] shadow-apple-md">
        <div className="flex border-b border-neutral-200">
          <button
            type="button"
            className="border-b-2 border-primary-600 px-6 py-3 text-sm font-medium text-primary-600"
          >
            {t("profile.about")}
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Experience Section */}
          <section aria-labelledby="exp-heading">
            <h2
              id="exp-heading"
              className="mb-3 text-lg font-semibold text-neutral-900 tracking-[-0.01em]"
            >
              {t("profile.experience")}
            </h2>
            {profile.experiences && profile.experiences.length > 0 ? (
              <ul className="space-y-3">
                {profile.experiences.map((exp) => (
                  <li key={exp.id} className="flex flex-col">
                    <span className="font-medium text-neutral-800">
                      {exp.title}
                    </span>
                    <span className="text-sm text-neutral-500">
                      {exp.company}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {exp.startDate}
                      {exp.isCurrent
                        ? ` — ${t("profile.present")}`
                        : exp.endDate
                          ? ` — ${exp.endDate}`
                          : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">No experience added yet.</p>
            )}
          </section>

          {/* Education Section */}
          <section aria-labelledby="edu-heading">
            <h2
              id="edu-heading"
              className="mb-3 text-lg font-semibold text-neutral-900 tracking-[-0.01em]"
            >
              {t("profile.education")}
            </h2>
            {profile.education && profile.education.length > 0 ? (
              <ul className="space-y-3">
                {profile.education.map((edu) => (
                  <li key={edu.id} className="flex flex-col">
                    <span className="font-medium text-neutral-800">
                      {edu.degree}
                    </span>
                    <span className="text-sm text-neutral-500">
                      {edu.institution}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {edu.startYear}
                      {edu.endYear ? ` — ${edu.endYear}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">No education added yet.</p>
            )}
          </section>

          {/* Skills Section */}
          <section aria-labelledby="skills-heading">
            <h2
              id="skills-heading"
              className="mb-3 text-lg font-semibold text-neutral-900 tracking-[-0.01em]"
            >
              {t("profile.skills")}
            </h2>
            {profile.skills && profile.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No skills added yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
