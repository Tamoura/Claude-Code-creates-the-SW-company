"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useAuthContext } from "@/providers/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { apiClient } from "@/lib/api";
import { ExperienceForm } from "@/components/profile/ExperienceForm";
import { EducationForm } from "@/components/profile/EducationForm";
import type { ExperienceFormData } from "@/components/profile/ExperienceForm";
import type { EducationFormData } from "@/components/profile/EducationForm";
import type { Post, Experience, Education } from "@/types";

type Tab = "about" | "posts";

export default function ProfilePage() {
  const { t } = useTranslation("common");
  const { user } = useAuthContext();
  const { profile, isLoading, refetch } = useProfile();

  const [activeTab, setActiveTab] = useState<Tab>("about");
  const [isEditing, setIsEditing] = useState(false);
  const [headlineValue, setHeadlineValue] = useState("");
  const [locationValue, setLocationValue] = useState("");
  const [summaryValue, setSummaryValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Experience modal state
  const [showExpForm, setShowExpForm] = useState(false);
  const [editingExp, setEditingExp] = useState<Experience | undefined>();

  // Education modal state
  const [showEduForm, setShowEduForm] = useState(false);
  const [editingEdu, setEditingEdu] = useState<Education | undefined>();

  // Deletion confirmation
  const [deletingExpId, setDeletingExpId] = useState<string | null>(null);
  const [deletingEduId, setDeletingEduId] = useState<string | null>(null);

  // Posts state
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const fetchMyPosts = useCallback(async () => {
    if (!user?.id) return;
    setPostsLoading(true);
    try {
      const response = await apiClient.get<Post[]>("/feed", {
        params: { limit: "50" },
      });
      if (response.success && response.data) {
        const data = response.data as unknown as { data: Post[] };
        const allPosts = Array.isArray(response.data) ? response.data : (data.data || []);
        setMyPosts(allPosts.filter((p: Post) => p.author?.userId === user.id));
      }
    } catch {
      // silent
    } finally {
      setPostsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (activeTab === "posts") {
      fetchMyPosts();
    }
  }, [activeTab, fetchMyPosts]);

  // Profile header edit handlers
  function handleEditClick() {
    setHeadlineValue(profile?.headlineEn || profile?.headlineAr || "");
    setLocationValue(profile?.location || "");
    setSummaryValue(profile?.summaryEn || profile?.summaryAr || "");
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
        location: locationValue,
        summaryEn: summaryValue,
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

  // Experience CRUD
  async function handleSaveExperience(data: ExperienceFormData): Promise<boolean> {
    if (editingExp) {
      const res = await apiClient.put(`/profiles/me/experience/${editingExp.id}`, data);
      if (res.success) { await refetch(); return true; }
      return false;
    }
    const res = await apiClient.post("/profiles/me/experience", data);
    if (res.success) { await refetch(); return true; }
    return false;
  }

  async function handleDeleteExperience(id: string) {
    const res = await apiClient.delete(`/profiles/me/experience/${id}`);
    if (res.success) {
      setDeletingExpId(null);
      await refetch();
    }
  }

  // Education CRUD
  async function handleSaveEducation(data: EducationFormData): Promise<boolean> {
    if (editingEdu) {
      const res = await apiClient.put(`/profiles/me/education/${editingEdu.id}`, data);
      if (res.success) { await refetch(); return true; }
      return false;
    }
    const res = await apiClient.post("/profiles/me/education", data);
    if (res.success) { await refetch(); return true; }
    return false;
  }

  async function handleDeleteEducation(id: string) {
    const res = await apiClient.delete(`/profiles/me/education/${id}`);
    if (res.success) {
      setDeletingEduId(null);
      await refetch();
    }
  }

  function formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "short" });
    } catch {
      return dateStr;
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
        <div className="h-28 bg-gradient-to-r from-[#0C9AB8] to-[#0B6E7F]" />
        <div className="p-6 -mt-10">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
              <div className="h-20 w-20 rounded-full ring-4 ring-white dark:ring-[#1C1C1E] bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={user?.displayName || ""} className="h-full w-full rounded-full object-cover" />
                ) : (
                  user?.displayName?.charAt(0) || "U"
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-[-0.02em]">
                  {user?.displayName}
                </h1>
                {isEditing ? (
                  <div className="mt-2 flex flex-col gap-3">
                    <div>
                      <label htmlFor="profile-headline" className="text-xs font-medium text-neutral-500 mb-1 block">
                        {t("profile.editHeadline")}
                      </label>
                      <input
                        id="profile-headline"
                        type="text"
                        value={headlineValue}
                        onChange={(e) => setHeadlineValue(e.target.value)}
                        placeholder={t("profile.headlinePlaceholder")}
                        autoFocus
                        maxLength={200}
                        className="rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-[180ms] w-full max-w-80"
                      />
                    </div>
                    <div>
                      <label htmlFor="profile-location" className="text-xs font-medium text-neutral-500 mb-1 block">
                        {t("profile.location")}
                      </label>
                      <input
                        id="profile-location"
                        type="text"
                        value={locationValue}
                        onChange={(e) => setLocationValue(e.target.value)}
                        placeholder={t("profile.locationPlaceholder")}
                        maxLength={100}
                        className="rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-[180ms] w-full max-w-80"
                      />
                    </div>
                    <div>
                      <label htmlFor="profile-summary" className="text-xs font-medium text-neutral-500 mb-1 block">
                        {t("profile.summary")}
                      </label>
                      <textarea
                        id="profile-summary"
                        value={summaryValue}
                        onChange={(e) => setSummaryValue(e.target.value)}
                        placeholder={t("profile.summaryPlaceholder")}
                        maxLength={2000}
                        rows={3}
                        className="rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-[180ms] w-full max-w-80 resize-none"
                      />
                    </div>
                    {saveError && <p className="text-xs text-red-700">{saveError}</p>}
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
                  <>
                    <p className="mt-1 text-sm text-neutral-500">
                      {headline || t("profile.addHeadline")}
                    </p>
                    {profile?.location && (
                      <p className="text-xs text-neutral-400 mt-0.5">{profile.location}</p>
                    )}
                  </>
                )}
              </div>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={handleEditClick}
                className="rounded-full border-2 border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-[180ms] shrink-0"
              >
                {t("profile.editProfile")}
              </button>
            )}
          </div>

          {/* Profile Completeness */}
          {profile && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">{t("profile.completeness")}</span>
                <span className="text-primary-600 font-medium">{profile.completenessScore}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={profile.completenessScore}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t("profile.completeness")}
                className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
              >
                <div className="h-full bg-[#0B6E7F] transition-all duration-300" style={{ width: `${profile.completenessScore}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] shadow-apple-md">
        <div className="flex border-b border-neutral-200 dark:border-white/8" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "about"}
            onClick={() => setActiveTab("about")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "about" ? "border-b-2 border-primary-600 text-primary-600" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t("profile.about")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "posts"}
            onClick={() => setActiveTab("posts")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "posts" ? "border-b-2 border-primary-600 text-primary-600" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t("profile.posts")}
          </button>
        </div>

        {activeTab === "about" ? (
          <div className="space-y-6 p-6" role="tabpanel">
            {/* Summary */}
            {(profile?.summaryEn || profile?.summaryAr) && (
              <section>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-line">
                  {profile.summaryEn || profile.summaryAr}
                </p>
              </section>
            )}

            {/* Experience Section */}
            <section aria-labelledby="experience-heading">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="experience-heading" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 tracking-[-0.01em]">
                  {t("profile.experience")}
                </h2>
                <button
                  type="button"
                  onClick={() => { setEditingExp(undefined); setShowExpForm(true); }}
                  aria-label={t("profile.addExperience")}
                  className="flex items-center gap-1 rounded-full bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("actions.add", { defaultValue: "Add" })}
                </button>
              </div>
              {profile?.experiences && profile.experiences.length > 0 ? (
                <ul className="space-y-3">
                  {profile.experiences.map((exp) => (
                    <li key={exp.id} className="group flex items-start justify-between rounded-xl p-3 hover:bg-neutral-50 dark:hover:bg-white/3 transition-colors">
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{exp.title}</span>
                        <span className="text-sm text-neutral-500">{exp.company}{exp.location ? ` · ${exp.location}` : ""}</span>
                        <span className="text-xs text-neutral-400">
                          {formatDate(exp.startDate)}
                          {exp.isCurrent ? ` — ${t("profile.present")}` : exp.endDate ? ` — ${formatDate(exp.endDate)}` : ""}
                        </span>
                        {exp.description && (
                          <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{exp.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ms-2">
                        <button
                          type="button"
                          onClick={() => { setEditingExp(exp); setShowExpForm(true); }}
                          aria-label={t("profile.editExperience")}
                          className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {deletingExpId === exp.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void handleDeleteExperience(exp.id)}
                              className="px-2 py-1 rounded text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100"
                            >
                              {t("actions.confirm")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingExpId(null)}
                              className="px-2 py-1 rounded text-xs text-neutral-500 hover:bg-neutral-100"
                            >
                              {t("actions.cancel")}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingExpId(exp.id)}
                            aria-label={t("profile.deleteExperience")}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-400">{t("profile.noExperience")}</p>
              )}
            </section>

            {/* Education Section */}
            <section aria-labelledby="education-heading">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="education-heading" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 tracking-[-0.01em]">
                  {t("profile.education")}
                </h2>
                <button
                  type="button"
                  onClick={() => { setEditingEdu(undefined); setShowEduForm(true); }}
                  aria-label={t("profile.addEducation")}
                  className="flex items-center gap-1 rounded-full bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("actions.add", { defaultValue: "Add" })}
                </button>
              </div>
              {profile?.education && profile.education.length > 0 ? (
                <ul className="space-y-3">
                  {profile.education.map((edu) => (
                    <li key={edu.id} className="group flex items-start justify-between rounded-xl p-3 hover:bg-neutral-50 dark:hover:bg-white/3 transition-colors">
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{edu.degree}</span>
                        <span className="text-sm text-neutral-500">
                          {edu.institution}{edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : ""}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {edu.startYear}{edu.endYear ? ` — ${edu.endYear}` : ` — ${t("profile.present")}`}
                        </span>
                        {edu.description && (
                          <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{edu.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ms-2">
                        <button
                          type="button"
                          onClick={() => { setEditingEdu(edu); setShowEduForm(true); }}
                          aria-label={t("profile.editEducation")}
                          className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {deletingEduId === edu.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void handleDeleteEducation(edu.id)}
                              className="px-2 py-1 rounded text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100"
                            >
                              {t("actions.confirm")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingEduId(null)}
                              className="px-2 py-1 rounded text-xs text-neutral-500 hover:bg-neutral-100"
                            >
                              {t("actions.cancel")}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingEduId(edu.id)}
                            aria-label={t("profile.deleteEducation")}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-400">{t("profile.noEducation")}</p>
              )}
            </section>

            {/* Skills Section */}
            <section aria-labelledby="skills-heading">
              <h2 id="skills-heading" className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100 tracking-[-0.01em]">
                {t("profile.skills")}
              </h2>
              {profile?.skills && profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill.id}
                      className="rounded-full bg-primary-50 dark:bg-primary-900/20 px-3 py-1 text-sm font-medium text-primary-700 dark:text-primary-400"
                    >
                      {skill.nameEn || skill.nameAr}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">{t("profile.noSkills")}</p>
              )}
            </section>
          </div>
        ) : (
          <div className="p-6" role="tabpanel">
            {postsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              </div>
            ) : myPosts.length === 0 ? (
              <p className="text-center text-sm text-neutral-400 py-8">{t("feed.empty")}</p>
            ) : (
              <div className="space-y-4">
                {myPosts.map((post) => (
                  <div key={post.id} className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
                    <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-line">{post.content}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-neutral-400">
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      <span>{post.likeCount} {t("actions.like").toLowerCase()}s</span>
                      <span>{post.commentCount} {t("actions.comment").toLowerCase()}s</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showExpForm && (
        <ExperienceForm
          experience={editingExp}
          onSave={handleSaveExperience}
          onClose={() => { setShowExpForm(false); setEditingExp(undefined); }}
        />
      )}
      {showEduForm && (
        <EducationForm
          education={editingEdu}
          onSave={handleSaveEducation}
          onClose={() => { setShowEduForm(false); setEditingEdu(undefined); }}
        />
      )}
    </div>
  );
}
