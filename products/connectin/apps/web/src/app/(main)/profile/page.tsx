"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/providers/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { apiClient } from "@/lib/api";

export default function ProfilePage() {
  const { t } = useTranslation("common");
  const { user } = useAuthContext();
  const { profile, isLoading, refetch } = useProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [headlineValue, setHeadlineValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleEditClick() {
    setHeadlineValue(profile?.headlineEn || profile?.headlineAr || "");
    setSaveError(null);
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    setSaveError(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await apiClient.put("/profiles/me", {
        headlineEn: headlineValue,
      });
      if (response.success) {
        setIsEditing(false);
        await refetch();
      } else {
        setSaveError(response.error?.message || "Failed to save");
      }
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
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

  const headline = profile?.headlineEn || profile?.headlineAr || "";

  return (
    <div className="space-y-4">
      {/* Profile Header Card */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] shadow-apple-md overflow-hidden">
        {/* Cover photo gradient */}
        <div className="h-28 bg-gradient-to-r from-[#0C9AB8] to-[#0B6E7F]" />

        <div className="p-6 -mt-10">
          {/* Avatar + name row */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
              <div className="h-20 w-20 rounded-full ring-4 ring-white dark:ring-[#1C1C1E] bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700">
                {user?.displayName?.charAt(0) || "U"}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 tracking-[-0.02em]">
                  {user?.displayName}
                </h1>
                {isEditing ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <input
                      type="text"
                      value={headlineValue}
                      onChange={(e) => setHeadlineValue(e.target.value)}
                      aria-label={t("profile.editHeadline")}
                      placeholder={t("profile.headlinePlaceholder")}
                      autoFocus
                      maxLength={200}
                      className="rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-600 focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-[180ms] w-full max-w-64"
                    />
                    {saveError && (
                      <p className="text-xs text-red-700">{saveError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={isSaving}
                        className="rounded-full bg-primary-600 px-4 py-1.5 text-xs font-medium text-white hover:-translate-y-0.5 hover:shadow-apple-md active:scale-[0.97] disabled:opacity-50 transition-all duration-[180ms]"
                      >
                        {isSaving ? t("actions.saving") : t("actions.save")}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 active:scale-[0.97] transition-all duration-[180ms]"
                      >
                        {t("actions.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-neutral-500">
                    {headline || t("profile.addHeadline")}
                  </p>
                )}
              </div>
            </div>

            {!isEditing && (
              <button
                type="button"
                onClick={handleEditClick}
                className="rounded-full border-2 border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-[180ms]"
              >
                {t("profile.editProfile")}
              </button>
            )}
          </div>

          {/* Profile Completeness */}
          {profile && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-neutral-700">
                  {t("profile.completeness")}
                </span>
                <span className="text-primary-600 font-medium">
                  {profile.completenessScore}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={profile.completenessScore}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t("profile.completeness")}
                className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
              >
                <div
                  className="h-full bg-[#0B6E7F] transition-all duration-300"
                  style={{ width: `${profile.completenessScore}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs: About / Posts */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] shadow-apple-md">
        <div className="flex border-b border-neutral-200">
          <button
            type="button"
            className="border-b-2 border-primary-600 px-6 py-3 text-sm font-medium text-primary-600"
          >
            {t("profile.about")}
          </button>
          <button
            type="button"
            className="px-6 py-3 text-sm font-medium text-neutral-500 hover:text-neutral-700"
          >
            {t("profile.posts")}
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Experience Section */}
          <section aria-labelledby="experience-heading">
            <h2
              id="experience-heading"
              className="mb-3 text-lg font-semibold text-neutral-900 tracking-[-0.01em]"
            >
              {t("profile.experience")}
            </h2>
            {profile?.experiences && profile.experiences.length > 0 ? (
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
              <p className="text-sm text-neutral-400">
                No experience added yet.
              </p>
            )}
          </section>

          {/* Education Section */}
          <section aria-labelledby="education-heading">
            <h2
              id="education-heading"
              className="mb-3 text-lg font-semibold text-neutral-900 tracking-[-0.01em]"
            >
              {t("profile.education")}
            </h2>
            {profile?.education && profile.education.length > 0 ? (
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
              <p className="text-sm text-neutral-400">
                No education added yet.
              </p>
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
            {profile?.skills && profile.skills.length > 0 ? (
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
