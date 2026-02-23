"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Search, Users, FileText, Briefcase } from "lucide-react";
import Link from "next/link";
import { useSearch } from "@/hooks/useSearch";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";
import type { SearchType } from "@/types";

const TABS: { key: SearchType | "all"; icon: typeof Search; labelKey: string }[] = [
  { key: "all", icon: Search, labelKey: "search.all" },
  { key: "people", icon: Users, labelKey: "search.people" },
  { key: "posts", icon: FileText, labelKey: "search.posts" },
  { key: "jobs", icon: Briefcase, labelKey: "search.jobs" },
];

export default function SearchPage() {
  const { t } = useTranslation("common");
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchType | "all">("all");
  const { results, isLoading, error, search } = useSearch();

  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    (q: string, tab: SearchType | "all") => {
      const trimmed = q.trim();
      if (!trimmed) return;
      search(trimmed, tab === "all" ? undefined : tab);
    },
    [search]
  );

  // Search on mount if query param present
  useEffect(() => {
    if (initialQuery) {
      doSearch(initialQuery, activeTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      doSearch(value, activeTab);
    }, 300);
    setDebounceTimer(timer);
  };

  const handleTabChange = (tab: SearchType | "all") => {
    setActiveTab(tab);
    doSearch(query, tab);
  };

  const totalResults =
    (results?.people.length || 0) +
    (results?.posts.length || 0) +
    (results?.jobs.length || 0);

  return (
    <div className="space-y-4">
      <h1 className="sr-only">{t("search.title")}</h1>

      {/* Search input */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-md">
        <div className="relative">
          <Search
            className="absolute inset-y-0 start-0 flex items-center ps-3 h-full w-4 text-[#94A3B8] pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={t("nav.search")}
            autoFocus
            className={cn(
              "w-full h-12 ps-10 pe-4",
              "bg-[#F1F5F9] dark:bg-[#334155]",
              "border border-transparent rounded-full",
              "text-base text-[#0F172A] dark:text-[#F1F5F9]",
              "placeholder:text-[#64748B]",
              "focus:border-[#0C9AB8] focus:bg-white dark:focus:bg-[#1E293B]",
              "focus:outline-none transition-colors duration-100"
            )}
            aria-label={t("nav.search")}
          />
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label={t("search.filterByType")}>
        {TABS.map(({ key, icon: Icon, labelKey }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => handleTabChange(key)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap",
              "transition-all duration-[180ms]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#57BBCE] focus-visible:ring-offset-2",
              activeTab === key
                ? "bg-[#0B6E7F] text-white shadow-apple-sm"
                : "bg-white dark:bg-[#1C1C1E] text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-[#0B6E7F] hover:text-[#0B6E7F]"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3" aria-label={t("actions.loading")} aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-5 shadow-apple-md animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-white/10" />
                <div className="flex-1">
                  <div className="h-4 w-1/3 rounded bg-neutral-200 dark:bg-white/10" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-neutral-200 dark:bg-white/10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-8 text-center shadow-apple-md">
          <p className="text-red-700">{error}</p>
        </div>
      ) : results && totalResults === 0 ? (
        <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-8 text-center shadow-apple-md">
          <Search className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-600" aria-hidden="true" />
          <p className="mt-3 text-neutral-500">{t("noResults")}</p>
        </div>
      ) : results ? (
        <div className="space-y-4">
          {/* People results */}
          {results.people.length > 0 && (
            <section aria-labelledby="search-people-heading">
              <h2
                id="search-people-heading"
                className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 px-1"
              >
                {t("search.people")} ({results.people.length})
              </h2>
              <div className="space-y-2">
                {results.people.map((person) => (
                  <Link
                    key={person.id}
                    href={`/profile/${person.id}`}
                    className="flex items-center gap-3 rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-sm hover:shadow-apple-md hover:-translate-y-0.5 transition-all duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#57BBCE]"
                  >
                    <UserAvatar displayName={person.displayName} size="md" />
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {person.displayName}
                      </p>
                      {(person.headlineEn || person.headlineAr) && (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                          {person.headlineEn || person.headlineAr}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Posts results */}
          {results.posts.length > 0 && (
            <section aria-labelledby="search-posts-heading">
              <h2
                id="search-posts-heading"
                className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 px-1"
              >
                {t("search.posts")} ({results.posts.length})
              </h2>
              <div className="space-y-2">
                {results.posts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-sm"
                  >
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {post.authorName}
                    </p>
                    <p className="mt-1 text-neutral-900 dark:text-neutral-100 line-clamp-3">
                      {post.content}
                    </p>
                    <p className="mt-2 text-xs text-neutral-400">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Jobs results */}
          {results.jobs.length > 0 && (
            <section aria-labelledby="search-jobs-heading">
              <h2
                id="search-jobs-heading"
                className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 px-1"
              >
                {t("search.jobs")} ({results.jobs.length})
              </h2>
              <div className="space-y-2">
                {results.jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs?highlight=${job.id}`}
                    className="block rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-sm hover:shadow-apple-md hover:-translate-y-0.5 transition-all duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#57BBCE]"
                  >
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {job.title}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {job.company}
                      {job.location ? ` · ${job.location}` : ""}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <span className="inline-flex items-center rounded-full bg-[#F1F5F9] dark:bg-white/5 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                        {job.workType}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-[#F1F5F9] dark:bg-white/5 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                        {job.experienceLevel}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}
