"use client";

import { useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";

export default function LoginPage() {
  const router = useRouter();
  const { isAr, toggleLang, lang, t } = useLang();

  const handleTawtheeqLogin = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-qdb-navy to-qdb-navy-dark flex flex-col">
      {/* Top bar */}
      <div className="flex justify-end p-4">
        <button
          onClick={toggleLang}
          className="text-sm text-white border border-blue-400 rounded px-3 py-1 hover:bg-blue-800 transition-colors font-medium"
          aria-label={isAr ? "Switch to English" : "التحويل إلى العربية"}
        >
          {lang === "en" ? (
            <span className="font-arabic">عربي</span>
          ) : (
            <span>EN</span>
          )}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          {/* Logo card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header section */}
            <div className="bg-qdb-navy px-8 py-10 text-center">
              {/* QDB Logo */}
              <div className="inline-flex flex-col items-center mb-6">
                <div className="bg-white rounded-xl px-6 py-3 shadow-lg">
                  <span className="text-4xl font-black text-qdb-navy tracking-tight">
                    QDB
                  </span>
                </div>
                <div className="h-1 w-24 bg-qdb-gold rounded-full mt-2" />
              </div>

              <h1 className="text-white text-lg font-semibold">
                {t(
                  "SME Relief Portal",
                  "بوابة دعم المنشآت الصغيرة والمتوسطة"
                )}
              </h1>
              {isAr ? (
                <p className="text-blue-200 text-sm mt-1">SME Relief Portal</p>
              ) : (
                <p className="text-blue-200 text-sm mt-1 font-arabic">
                  بوابة دعم المنشآت الصغيرة والمتوسطة
                </p>
              )}
              <p className="text-blue-300 text-xs mt-2">
                {t("Qatar Development Bank", "بنك قطر للتنمية")}
              </p>
            </div>

            {/* Login section */}
            <div className="px-8 py-10">
              <div className="text-center mb-8">
                <h2 className="text-gray-900 text-xl font-semibold">
                  {t("Sign In", "تسجيل الدخول")}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {t(
                    "Use your Tawtheeq account to access the portal",
                    "استخدم حساب توثيق للوصول إلى البوابة"
                  )}
                </p>
              </div>

              {/* Tawtheeq button */}
              <button
                onClick={handleTawtheeqLogin}
                className="w-full flex items-center justify-center gap-3 bg-qdb-navy text-white font-semibold py-3.5 px-6 rounded-lg hover:bg-qdb-navy-light transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-qdb-navy focus:ring-offset-2"
                aria-label={t("Login with Tawtheeq", "تسجيل الدخول عبر توثيق")}
              >
                {/* Tawtheeq logo placeholder */}
                <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-qdb-navy text-xs font-black">T</span>
                </div>
                <span>
                  {t("Login with Tawtheeq", "تسجيل الدخول عبر توثيق")}
                </span>
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                {t(
                  "Secure government authentication via National Identity System",
                  "المصادقة الحكومية الآمنة عبر نظام الهوية الوطنية"
                )}
              </p>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">
                  {t("or", "أو")}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Help section */}
              <div className="text-center">
                <a
                  href="#"
                  className="text-qdb-navy text-sm hover:underline font-medium"
                  onClick={(e) => e.preventDefault()}
                >
                  {t(
                    "Need help? Contact QDB Support",
                    "هل تحتاج مساعدة؟ تواصل مع دعم بنك قطر للتنمية"
                  )}
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{t("© 2025 Qatar Development Bank", "© 2025 بنك قطر للتنمية")}</span>
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3 h-3 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {t("Secure", "آمن")}
                </span>
              </div>
            </div>
          </div>

          {/* Notice */}
          <p className="text-center text-blue-200 text-xs mt-6">
            {t(
              "This portal is for SMEs registered in the State of Qatar",
              "هذه البوابة مخصصة للمنشآت الصغيرة والمتوسطة المسجلة في دولة قطر"
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
