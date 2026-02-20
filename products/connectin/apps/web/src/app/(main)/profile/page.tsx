"use client";

import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/providers/AuthProvider";
import { useProfile } from "@/hooks/useProfile";

export default function ProfilePage() {
  const { t } = useTranslation("common");
  const { user } = useAuthContext();
  const { profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const headline = profile?.headlineEn || profile?.headlineAr || "";

  return (
    <div className="space-y-4">
      {/* Profile Header Card */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        {/* Cover / Avatar row */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              {user?.displayName}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {headline || t("profile.editProfile")}
            </p>
          </div>

          <button
            type="button"
            className="rounded-lg border border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50"
          >
            {t("profile.editProfile")}
          </button>
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
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-primary-600 transition-all"
                style={{ width: `${profile.completenessScore}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs: About / Posts */}
      <div className="rounded-xl bg-white shadow-sm">
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
              className="mb-3 text-lg font-semibold text-neutral-900"
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
              className="mb-3 text-lg font-semibold text-neutral-900"
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
              className="mb-3 text-lg font-semibold text-neutral-900"
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
