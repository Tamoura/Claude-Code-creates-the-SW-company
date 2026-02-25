"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/lib/api";
import type { Profile } from "@/types";

/**
 * Public profile page accessible via custom slug URL.
 * Route: /profile/slug/[slug]
 *
 * Usage:
 *   Navigate to /profile/slug/john-doe to view that user's profile.
 */
export default function SlugProfilePage() {
  const { t } = useTranslation("common");
  const params = useParams();
  const slug = params?.slug as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    async function fetchProfile() {
      setIsLoading(true);
      setNotFound(false);
      try {
        const response = await apiClient.get<Profile>(`/profiles/by-slug/${slug}`);
        if (cancelled) return;
        if (response.success && response.data) {
          setProfile(response.data);
        } else {
          setNotFound(true);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchProfile();
    return () => { cancelled = true; };
  }, [slug]);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="flex items-center justify-center py-16"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-8 text-center shadow-apple-md">
        <p className="text-neutral-500">{t("profile.notFound")}</p>
      </div>
    );
  }

  const headline = profile.headlineEn || profile.headlineAr || "";

  return (
    <div className="space-y-4">
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] shadow-apple-md overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-[#0C9AB8] to-[#0B6E7F]" />
        <div className="p-6 -mt-10">
          <div className="h-20 w-20 rounded-full ring-4 ring-white dark:ring-[#1C1C1E] bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={headline || "Profile"}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span>{headline.charAt(0).toUpperCase() || "U"}</span>
            )}
          </div>
          {headline && (
            <h1 className="mt-3 text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-[-0.02em]">
              {headline}
            </h1>
          )}
          {profile.location && (
            <p className="mt-1 text-sm text-neutral-500">{profile.location}</p>
          )}
          {(profile.summaryEn || profile.summaryAr) && (
            <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
              {profile.summaryEn || profile.summaryAr}
            </p>
          )}
        </div>
      </div>

      {profile.experiences.length > 0 && (
        <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-6 shadow-apple-md">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            {t("profile.experience")}
          </h2>
          <div className="space-y-3">
            {profile.experiences.map((exp) => (
              <div key={exp.id} className="border-b border-neutral-100 dark:border-neutral-700 last:border-0 pb-3 last:pb-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{exp.title}</p>
                <p className="text-sm text-neutral-500">{exp.company}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile.skills.length > 0 && (
        <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-6 shadow-apple-md">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            {t("profile.skills")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <span
                key={skill.id}
                className="rounded-full bg-neutral-100 dark:bg-white/10 px-3 py-1 text-sm text-neutral-700 dark:text-neutral-300"
              >
                {skill.nameEn}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
