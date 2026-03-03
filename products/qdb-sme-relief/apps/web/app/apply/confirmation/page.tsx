"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { useLang } from "@/lib/language-context";
import { useApp } from "@/lib/app-context";
import { APPLICATION_REFERENCE } from "@/lib/mock-data";

export default function ConfirmationPage() {
  const { t, isAr } = useLang();
  const { state } = useApp();

  const isAuto = state.isNrgpListed;

  return (
    <div className="step-page">
      <Header showUser />

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="gov-card text-center">
          {/* Animated checkmark */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center checkmark-animate">
              <svg
                className="w-14 h-14 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t(
              "Application Submitted Successfully",
              "تم تقديم الطلب بنجاح"
            )}
          </h1>
          <p className="text-gray-500 mb-6">
            {t(
              "Your QDB SME Relief financing application has been received and is being processed.",
              "تم استلام طلب تمويل دعم المنشآت الصغيرة والمتوسطة الخاص بك من QDB وجاري معالجته."
            )}
          </p>

          {/* Reference number */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-6 py-4 mb-6 inline-block w-full">
            <p className="text-sm text-gray-500 font-medium">
              {t("Application Reference Number", "رقم مرجع الطلب")}
            </p>
            <p className="text-2xl font-black text-qdb-navy font-mono mt-1">
              {APPLICATION_REFERENCE}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {t(
                "Save this reference number for your records",
                "احتفظ بهذا الرقم المرجعي في سجلاتك"
              )}
            </p>
          </div>

          {/* Timeline */}
          <div
            className={`rounded-lg border-2 p-6 mb-6 text-${isAr ? "right" : "left"} ${
              isAuto
                ? "border-blue-200 bg-blue-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <h2
              className={`font-bold mb-3 ${isAuto ? "text-blue-800" : "text-amber-800"}`}
            >
              {t("What happens next?", "ماذا سيحدث بعد ذلك؟")}
            </h2>
            {isAuto ? (
              <ul className="space-y-2 text-sm text-blue-700">
                {[
                  t(
                    "Your documents will be automatically verified within 24 hours.",
                    "سيتم التحقق من مستنداتك تلقائياً خلال 24 ساعة."
                  ),
                  t(
                    "Upon successful verification, disbursement will be initiated to your registered bank account.",
                    "عند اجتياز التحقق بنجاح، سيتم بدء الصرف إلى حسابك البنكي المسجل."
                  ),
                  t(
                    "Expected funds transfer: 2-3 business days.",
                    "الوقت المتوقع لتحويل الأموال: 2-3 أيام عمل."
                  ),
                  t(
                    "You will receive an SMS notification when funds are transferred.",
                    "ستتلقى إشعاراً عبر الرسائل القصيرة عند تحويل الأموال."
                  ),
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs flex items-center justify-center flex-shrink-0 font-bold mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-2 text-sm text-amber-700">
                {[
                  t(
                    "A QDB Relationship Manager will be assigned to your application.",
                    "سيتم تعيين مدير علاقات من QDB لطلبك."
                  ),
                  t(
                    "You will be contacted within 5 business days for a review meeting.",
                    "سيتم التواصل معك خلال 5 أيام عمل لاجتماع المراجعة."
                  ),
                  t(
                    "Additional documents may be requested during the review process.",
                    "قد يُطلب منك مستندات إضافية أثناء عملية المراجعة."
                  ),
                  t(
                    "Upon approval, disbursement will be processed within 2-3 business days.",
                    "عند الموافقة، سيتم معالجة الصرف خلال 2-3 أيام عمل."
                  ),
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-xs flex items-center justify-center flex-shrink-0 font-bold mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 pt-4 border-t border-opacity-30 border-gray-400 flex items-center gap-2">
              <svg
                className={`w-4 h-4 ${isAuto ? "text-blue-500" : "text-amber-500"}`}
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
              <p
                className={`text-sm font-semibold ${isAuto ? "text-blue-700" : "text-amber-700"}`}
              >
                {isAuto
                  ? t(
                      "Expected disbursement: 2-3 business days",
                      "الوقت المتوقع للصرف: 2-3 أيام عمل"
                    )
                  : t(
                      "QDB will contact you within 5 business days",
                      "سيتواصل معك QDB خلال 5 أيام عمل"
                    )}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/status"
              className="gov-btn-primary text-center inline-flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              {t("View Application Status", "عرض حالة الطلب")}
            </Link>
            <Link href="/dashboard" className="gov-btn-secondary text-center">
              {t("Return to Home", "العودة إلى الرئيسية")}
            </Link>
          </div>
        </div>

        {/* Contact info */}
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>
            {t(
              "Questions? Contact QDB at",
              "هل لديك أسئلة؟ تواصل مع QDB على"
            )}{" "}
            <span className="text-qdb-navy font-semibold">+974 4456 1100</span>{" "}
            {t("or", "أو")}{" "}
            <span className="text-qdb-navy font-semibold">sme@qdb.com.qa</span>
          </p>
        </div>
      </div>
    </div>
  );
}
