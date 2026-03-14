"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SETTINGS_SECTIONS = [
  {
    title: "Profile Settings",
    description:
      "Update your company profile, tech stack, and organizational details.",
    href: "/settings/profile",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
  {
    title: "Account Settings",
    description:
      "Manage your email, password, and account security options.",
    href: "/settings/account",
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  },
  {
    title: "Advisory Preferences",
    description:
      "Customize how your AI advisor communicates and what topics it focuses on.",
    href: "/settings/preferences",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  },
] as const;

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/profile");
  }, [router]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {SETTINGS_SECTIONS.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className="block bg-background rounded-xl p-6 shadow-sm border border-border hover:shadow-md hover:border-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={section.icon}
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {section.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {section.description}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
