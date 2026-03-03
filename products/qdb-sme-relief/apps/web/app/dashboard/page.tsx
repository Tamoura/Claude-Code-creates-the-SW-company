"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import StepIndicator from "@/components/StepIndicator";
import { useLang } from "@/lib/language-context";
import { useApp } from "@/lib/app-context";

export default function DashboardPage() {
  const { t, isAr } = useLang();
  const { setStep } = useApp();
  const router = useRouter();

  const handleStart = () => {
    setStep(1);
    router.push("/apply/company");
  };

  return (
    <div className="step-page">
      <Header showUser />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome banner */}
        <div className="bg-qdb-navy text-white rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1">
                {t("Welcome to QDB SME Relief Portal", "مرحباً في بوابة دعم المنشآت الصغيرة والمتوسطة")}
              </p>
              <h1 className="text-xl font-bold">
                {isAr
                  ? "مرحباً، محمد الثاني | Welcome, Mohammed Al-Thani"
                  : "Welcome, Mohammed Al-Thani | مرحباً، محمد الثاني"}
              </h1>
              <p className="text-blue-200 text-sm mt-1">
                {t(
                  "Al-Noor Trading & Services W.L.L",
                  "شركة النور للتجارة والخدمات ذ.م.م"
                )}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className="bg-qdb-gold text-white text-xs font-semibold px-3 py-1 rounded-full">
                {t("Authorized Signatory", "مفوض بالتوقيع")}
              </span>
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="gov-card mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            {t("Application Progress", "تقدم الطلب")}
          </h2>
          <StepIndicator currentStep={0} />
        </div>

        {/* Program info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="gov-card flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-qdb-navy"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">
                {t("Maximum Financing", "الحد الأقصى للتمويل")}
              </p>
              <p className="text-lg font-bold text-qdb-navy">QAR 500,000</p>
              <p className="text-xs text-gray-400">
                {t("Per eligible SME", "لكل منشأة مؤهلة")}
              </p>
            </div>
          </div>

          <div className="gov-card flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-qdb-gold"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">
                {t("Processing Time", "وقت المعالجة")}
              </p>
              <p className="text-lg font-bold text-qdb-navy">2-5 {t("Days", "أيام")}</p>
              <p className="text-xs text-gray-400">
                {t("Business days", "أيام عمل")}
              </p>
            </div>
          </div>

          <div className="gov-card flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">
                {t("Interest Rate", "معدل الفائدة")}
              </p>
              <p className="text-lg font-bold text-qdb-navy">0%</p>
              <p className="text-xs text-gray-400">
                {t("Zero interest relief loan", "قرض إغاثة بدون فوائد")}
              </p>
            </div>
          </div>
        </div>

        {/* Application CTA */}
        <div className="gov-card border-l-4 border-qdb-navy">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold text-qdb-navy">
                {t("QDB SME Relief Financing Program", "برنامج تمويل دعم المنشآت الصغيرة والمتوسطة")}
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                {t(
                  "Apply for emergency relief financing. The process takes approximately 10-15 minutes.",
                  "تقديم طلب للحصول على تمويل الإغاثة الطارئة. تستغرق العملية حوالي 10-15 دقيقة."
                )}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                <span className="text-xs text-gray-500">
                  {t("Applications open until 31 January 2025", "الطلبات مفتوحة حتى 31 يناير 2025")}
                </span>
              </div>
            </div>
            <button
              onClick={handleStart}
              className="gov-btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              {t("Start Application", "بدء الطلب")}
              <svg
                className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              icon: "📄",
              label: t("Required Documents", "المستندات المطلوبة"),
              href: "#",
            },
            {
              icon: "❓",
              label: t("FAQs", "الأسئلة الشائعة"),
              href: "#",
            },
            {
              icon: "📞",
              label: t("Contact QDB", "التواصل مع QDB"),
              href: "#",
            },
            {
              icon: "🔍",
              label: t("Check Status", "التحقق من الحالة"),
              href: "/status",
            },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="bg-white border border-gray-200 rounded-lg p-3 text-center hover:border-qdb-navy hover:shadow-sm transition-all"
              onClick={link.href === "#" ? (e) => e.preventDefault() : undefined}
            >
              <span className="text-2xl block mb-1">{link.icon}</span>
              <span className="text-xs text-gray-600 font-medium">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
