"use client";

import Link from "next/link";
import { useLang } from "@/lib/language-context";

interface HeaderProps {
  showUser?: boolean;
  userName?: string;
}

export default function Header({
  showUser = false,
  userName = "Mohammed Al-Thani",
}: HeaderProps) {
  const { isAr, toggleLang, lang, t } = useLang();

  return (
    <header className="bg-qdb-navy text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Title */}
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-white tracking-tight leading-none">
                QDB
              </span>
              <div className="h-0.5 w-full bg-qdb-gold mt-0.5" />
            </div>
            <div className={`hidden sm:block ${isAr ? "text-right" : "text-left"}`}>
              <p className="text-sm font-semibold leading-tight">
                {t("SME Relief Portal", "بوابة دعم المنشآت الصغيرة والمتوسطة")}
              </p>
              <p className="text-xs text-blue-200 leading-tight">
                {t("Qatar Development Bank", "بنك قطر للتنمية")}
              </p>
            </div>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1 text-sm font-medium border border-blue-400 rounded px-3 py-1 hover:bg-blue-800 transition-colors"
              aria-label={isAr ? "Switch to English" : "التحويل إلى العربية"}
            >
              {lang === "en" ? (
                <span className="font-arabic">عربي</span>
              ) : (
                <span>EN</span>
              )}
            </button>

            {/* User info */}
            {showUser && (
              <div className="flex items-center gap-3">
                <div
                  className={`hidden sm:block text-sm ${isAr ? "text-right" : "text-left"}`}
                >
                  <p className="font-medium leading-tight">
                    {isAr ? "محمد الثاني" : userName}
                  </p>
                  <p className="text-xs text-blue-200">
                    {t("Authorized Signatory", "المفوض بالتوقيع")}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-qdb-gold flex items-center justify-center text-qdb-navy font-bold text-sm">
                  {isAr ? "م" : "M"}
                </div>
                <Link
                  href="/"
                  className="text-xs text-blue-300 hover:text-white transition-colors"
                >
                  {t("Logout", "خروج")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
