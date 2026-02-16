'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LandingPage() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a5f]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#c8a951] flex items-center justify-center text-[#1e3a5f] font-bold text-base">
              Q
            </div>
            <span className="text-white font-semibold text-lg">QDB One</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="px-3 py-1.5 rounded-lg border border-white/20 text-white text-sm hover:bg-white/10 transition-colors"
            >
              {lang === 'en' ? 'عربي' : 'English'}
            </button>
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg bg-[#c8a951] text-[#1e3a5f] text-sm font-semibold hover:bg-[#d4b85e] transition-colors"
            >
              {t('Sign In', 'تسجيل الدخول')}
            </Link>
          </div>
        </div>
      </nav>

      {/* 1. Hero Section */}
      <section className="relative pt-16 min-h-[600px] flex items-center bg-gradient-to-br from-[#1e3a5f] via-[#2d5a8e] to-[#1e3a5f] overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 text-[200px] text-white">◈</div>
          <div className="absolute bottom-10 right-20 text-[150px] text-white">◉</div>
          <div className="absolute top-40 right-40 text-[120px] text-white">◎</div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-[#c8a951]" />
            {t('Qatar Development Bank', 'بنك قطر للتنمية')}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-4xl mx-auto">
            {t('One Login.', 'تسجيل دخول واحد.')}
            <br />
            <span className="text-[#c8a951]">
              {t('All Your QDB Services.', 'جميع خدمات QDB.')}
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
            {t(
              'Access Financing, Guarantees, and Advisory services through a single unified portal. No more juggling multiple logins and disconnected systems.',
              'الوصول إلى خدمات التمويل والضمانات والاستشارات من خلال بوابة موحدة واحدة. لا مزيد من التنقل بين تسجيلات دخول متعددة وأنظمة منفصلة.'
            )}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-xl bg-[#c8a951] text-[#1e3a5f] font-semibold text-base hover:bg-[#d4b85e] transition-colors shadow-lg shadow-[#c8a951]/20"
            >
              {t('Sign In to QDB One', 'تسجيل الدخول إلى QDB One')}
            </Link>
            <a
              href="#features"
              className="px-8 py-3.5 rounded-xl border border-white/30 text-white font-medium text-base hover:bg-white/10 transition-colors"
            >
              {t('Explore Features', 'استكشف المميزات')}
            </a>
          </div>

          {/* Portal badges */}
          <div className="mt-16 flex items-center justify-center gap-8">
            {[
              { icon: '◈', label: t('Financing', 'التمويل'), color: '#5b9bd5' },
              { icon: '◉', label: t('Guarantees', 'الضمانات'), color: '#c8a951' },
              { icon: '◎', label: t('Advisory', 'الاستشارات'), color: '#70ad47' },
            ].map((portal) => (
              <div key={portal.label} className="flex items-center gap-2 text-white/60 text-sm">
                <span style={{ color: portal.color }} className="text-xl">{portal.icon}</span>
                <span>{portal.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Problem Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              {t('The Problem We Solve', 'المشكلة التي نحلها')}
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              {t(
                'QDB customers currently navigate three separate portals with different logins and no shared context.',
                'يتنقل عملاء QDB حاليًا بين ثلاث بوابات منفصلة بتسجيلات دخول مختلفة وبدون سياق مشترك.'
              )}
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
            {/* Before */}
            <div className="flex-1 max-w-sm">
              <div className="text-center mb-4">
                <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                  {t('Before', 'قبل')}
                </span>
              </div>
              <div className="space-y-3">
                {[
                  { icon: '◈', name: t('Financing Portal', 'بوابة التمويل'), color: 'border-blue-200 bg-blue-50' },
                  { icon: '◉', name: t('Guarantees Portal', 'بوابة الضمانات'), color: 'border-yellow-200 bg-yellow-50' },
                  { icon: '◎', name: t('Advisory Portal', 'بوابة الاستشارات'), color: 'border-green-200 bg-green-50' },
                ].map((portal) => (
                  <div key={portal.name} className={`flex items-center gap-3 p-4 rounded-xl border ${portal.color}`}>
                    <span className="text-xl">{portal.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{portal.name}</div>
                      <div className="text-xs text-gray-500">{t('Separate login', 'تسجيل دخول منفصل')}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center text-sm text-gray-400">
                {t('3 logins · 3 passwords · 0 context', '3 تسجيلات · 3 كلمات مرور · 0 سياق')}
              </div>
            </div>

            {/* Arrow */}
            <div className="text-4xl text-[#c8a951] font-bold lg:rotate-0 rotate-90">
              →
            </div>

            {/* After */}
            <div className="flex-1 max-w-sm">
              <div className="text-center mb-4">
                <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  {t('After — QDB One', 'بعد — QDB One')}
                </span>
              </div>
              <div className="p-6 rounded-2xl border-2 border-[#1e3a5f] bg-white shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#c8a951] flex items-center justify-center text-[#1e3a5f] font-bold">Q</div>
                  <div className="font-semibold text-gray-900">QDB One</div>
                </div>
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-xl" style={{ color: '#5b9bd5' }}>◈</span>
                  <span className="text-xl" style={{ color: '#c8a951' }}>◉</span>
                  <span className="text-xl" style={{ color: '#70ad47' }}>◎</span>
                </div>
                <div className="text-sm text-gray-600">
                  {t('All portals, one session, shared context', 'جميع البوابات، جلسة واحدة، سياق مشترك')}
                </div>
              </div>
              <div className="mt-4 text-center text-sm text-[#1e3a5f] font-medium">
                {t('1 login · unified view · cross-portal links', '1 تسجيل · عرض موحد · روابط مشتركة')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Grid */}
      <section id="features" className="py-20 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              {t('Everything in One Place', 'كل شيء في مكان واحد')}
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              {t(
                'QDB One brings together the tools and services you use every day.',
                'يجمع QDB One بين الأدوات والخدمات التي تستخدمها كل يوم.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '🔐',
                titleEn: 'Single Sign-On',
                titleAr: 'تسجيل دخول موحد',
                descEn: 'Authenticate once with QDB Login (NAS-backed) and access all portals seamlessly.',
                descAr: 'المصادقة مرة واحدة مع تسجيل دخول QDB (مدعوم من NAS) والوصول لجميع البوابات بسلاسة.',
              },
              {
                icon: '⊞',
                titleEn: 'Unified Dashboard',
                titleAr: 'لوحة تحكم موحدة',
                descEn: 'See loans, guarantees, advisory programs, and documents in a single view.',
                descAr: 'عرض القروض والضمانات والبرامج الاستشارية والمستندات في عرض واحد.',
              },
              {
                icon: '🔗',
                titleEn: 'Cross-Portal Linking',
                titleAr: 'الربط بين البوابات',
                descEn: 'Navigate from a guarantee to its linked loan or from a session to a program — instantly.',
                descAr: 'الانتقال من ضمان إلى القرض المرتبط أو من جلسة إلى برنامج — فورًا.',
              },
              {
                icon: '🔔',
                titleEn: 'Smart Notifications',
                titleAr: 'إشعارات ذكية',
                descEn: 'Get alerts for payment due dates, signature requests, and session reminders across all portals.',
                descAr: 'الحصول على تنبيهات لمواعيد الدفع وطلبات التوقيع وتذكيرات الجلسات عبر جميع البوابات.',
              },
              {
                icon: '🔍',
                titleEn: 'Unified Search',
                titleAr: 'بحث موحد',
                descEn: 'Search across financing, guarantees, and advisory data from a single search bar.',
                descAr: 'البحث عبر بيانات التمويل والضمانات والاستشارات من شريط بحث واحد.',
              },
              {
                icon: '🌐',
                titleEn: 'Bilingual AR/EN',
                titleAr: 'ثنائي اللغة عربي/إنجليزي',
                descEn: 'Full Arabic and English support with RTL layout — switch anytime with one click.',
                descAr: 'دعم كامل للعربية والإنجليزية مع تخطيط RTL — التبديل في أي وقت بنقرة واحدة.',
              },
            ].map((feature) => (
              <div key={feature.titleEn} className="p-6 rounded-2xl border border-gray-200 hover:border-[#1e3a5f]/30 hover:shadow-md transition-all">
                <span className="text-3xl">{feature.icon}</span>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {t(feature.titleEn, feature.titleAr)}
                </h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {t(feature.descEn, feature.descAr)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              {t('How It Works', 'كيف يعمل')}
            </h2>
            <p className="mt-3 text-gray-500">
              {t('Three simple steps to access all QDB services.', 'ثلاث خطوات بسيطة للوصول إلى جميع خدمات QDB.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                titleEn: 'Authenticate via NAS',
                titleAr: 'المصادقة عبر NAS',
                descEn: 'Sign in once using your National Authentication System credentials — secure and verified.',
                descAr: 'تسجيل الدخول مرة واحدة باستخدام بيانات نظام المصادقة الوطني — آمن وموثق.',
                color: '#1e3a5f',
              },
              {
                step: '2',
                titleEn: 'Choose Your Company',
                titleAr: 'اختر شركتك',
                descEn: 'If you represent multiple organizations, select which company context to work in.',
                descAr: 'إذا كنت تمثل عدة مؤسسات، اختر سياق الشركة التي تريد العمل فيها.',
                color: '#c8a951',
              },
              {
                step: '3',
                titleEn: 'Access All Services',
                titleAr: 'الوصول لجميع الخدمات',
                descEn: 'Your unified dashboard shows financing, guarantees, and advisory — all in one place.',
                descAr: 'لوحة التحكم الموحدة تعرض التمويل والضمانات والاستشارات — الكل في مكان واحد.',
                color: '#70ad47',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-5"
                  style={{ backgroundColor: item.color }}
                >
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t(item.titleEn, item.titleAr)}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {t(item.descEn, item.descAr)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. For Stakeholders — Architecture Highlights */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <span className="inline-block px-3 py-1 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs font-medium">
              {t('For Stakeholders', 'لأصحاب المصلحة')}
            </span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            {t('Built on Enterprise Architecture', 'مبني على بنية مؤسسية')}
          </h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">
            {t(
              'QDB One is not just a UI layer. It\'s a complete integration platform designed for QDB\'s operational reality.',
              'QDB One ليس مجرد واجهة مستخدم. إنه منصة تكامل كاملة مصممة لواقع QDB التشغيلي.'
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: '🏛',
                titleEn: 'Master Person Index',
                titleAr: 'فهرس الشخص الرئيسي',
                descEn: 'One identity per person across all portals. QID-based deterministic resolution eliminates duplicates.',
                descAr: 'هوية واحدة لكل شخص عبر جميع البوابات. الحل القائم على QID يزيل التكرارات.',
              },
              {
                icon: '🔑',
                titleEn: 'NAS Integration',
                titleAr: 'تكامل NAS',
                descEn: 'National Authentication System provides government-grade identity verification.',
                descAr: 'نظام المصادقة الوطني يوفر التحقق من الهوية بمستوى حكومي.',
              },
              {
                icon: '⊘',
                titleEn: 'Zero Duplicate Data',
                titleAr: 'صفر بيانات مكررة',
                descEn: 'Each portal retains its own data store. QDB One reads and links — never copies.',
                descAr: 'كل بوابة تحتفظ ببياناتها الخاصة. QDB One يقرأ ويربط — لا ينسخ أبدًا.',
              },
              {
                icon: '🚀',
                titleEn: 'Unified API Gateway',
                titleAr: 'بوابة API موحدة',
                descEn: 'A single federated gateway routes requests to the correct portal backend securely.',
                descAr: 'بوابة اتحادية واحدة توجه الطلبات إلى الخلفية الصحيحة بأمان.',
              },
            ].map((item) => (
              <div key={item.titleEn} className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="text-2xl">{item.icon}</span>
                <h3 className="mt-3 text-base font-semibold text-gray-900">
                  {t(item.titleEn, item.titleAr)}
                </h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {t(item.descEn, item.descAr)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Portal Showcase */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              {t('Three Portals, Unified', 'ثلاث بوابات، موحدة')}
            </h2>
            <p className="mt-3 text-gray-500">
              {t('Each portal retains its specialty while sharing a common experience.', 'كل بوابة تحتفظ بتخصصها مع مشاركة تجربة مشتركة.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '◈',
                nameEn: 'Financing',
                nameAr: 'التمويل',
                color: '#5b9bd5',
                bgColor: 'bg-blue-50',
                borderColor: 'border-blue-200',
                descEn: 'Manage loan applications, track disbursements, view repayment schedules, and monitor your complete financing portfolio.',
                descAr: 'إدارة طلبات القروض، تتبع المصروفات، عرض جداول السداد، ومراقبة محفظة التمويل الكاملة.',
                itemsEn: ['Loan Management', 'Applications', 'Repayment Tracking'],
                itemsAr: ['إدارة القروض', 'الطلبات', 'تتبع السداد'],
              },
              {
                icon: '◉',
                nameEn: 'Guarantees',
                nameAr: 'الضمانات',
                color: '#c8a951',
                bgColor: 'bg-yellow-50',
                borderColor: 'border-yellow-200',
                descEn: 'View active guarantees, sign pending documents, track coverage amounts, and manage guarantee lifecycle.',
                descAr: 'عرض الضمانات النشطة، توقيع المستندات المعلقة، تتبع مبالغ التغطية، وإدارة دورة حياة الضمان.',
                itemsEn: ['Active Guarantees', 'Digital Signing', 'Coverage Tracking'],
                itemsAr: ['الضمانات النشطة', 'التوقيع الرقمي', 'تتبع التغطية'],
              },
              {
                icon: '◎',
                nameEn: 'Advisory',
                nameAr: 'الاستشارات',
                color: '#70ad47',
                bgColor: 'bg-green-50',
                borderColor: 'border-green-200',
                descEn: 'Enroll in development programs, attend advisory sessions, complete assessments, and track your growth journey.',
                descAr: 'التسجيل في برامج التطوير، حضور الجلسات الاستشارية، إكمال التقييمات، وتتبع رحلة النمو.',
                itemsEn: ['Programs', 'Sessions', 'Assessments'],
                itemsAr: ['البرامج', 'الجلسات', 'التقييمات'],
              },
            ].map((portal) => (
              <div key={portal.nameEn} className={`rounded-2xl border ${portal.borderColor} ${portal.bgColor} p-6 hover:shadow-md transition-shadow`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl" style={{ color: portal.color }}>{portal.icon}</span>
                  <h3 className="text-xl font-bold text-gray-900">{t(portal.nameEn, portal.nameAr)}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  {t(portal.descEn, portal.descAr)}
                </p>
                <ul className="space-y-2">
                  {portal.itemsEn.map((item, i) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: portal.color }} />
                      {t(item, portal.itemsAr[i])}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Stats / Impact */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              {t('The Impact', 'التأثير')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                stat: '3 → 1',
                labelEn: 'Portals consolidated into one unified platform',
                labelAr: 'بوابات موحدة في منصة واحدة',
                color: '#1e3a5f',
              },
              {
                stat: '15-25%',
                labelEn: 'of users hold roles in multiple portals — now served seamlessly',
                labelAr: 'من المستخدمين لديهم أدوار في بوابات متعددة — يتم خدمتهم بسلاسة الآن',
                color: '#c8a951',
              },
              {
                stat: '40-50%',
                labelEn: 'fewer support tickets expected with unified experience',
                labelAr: 'تذاكر دعم أقل متوقعة مع التجربة الموحدة',
                color: '#70ad47',
              },
            ].map((item) => (
              <div key={item.stat} className="text-center p-8 rounded-2xl bg-gray-50">
                <div className="text-4xl sm:text-5xl font-bold mb-3" style={{ color: item.color }}>
                  {item.stat}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t(item.labelEn, item.labelAr)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. CTA Footer */}
      <section className="py-20 bg-gradient-to-br from-[#1e3a5f] via-[#2d5a8e] to-[#1e3a5f]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('Ready to Get Started?', 'مستعد للبدء؟')}
          </h2>
          <p className="text-white/70 mb-8 text-lg">
            {t(
              'Sign in to access your unified QDB portal today.',
              'سجّل الدخول للوصول إلى بوابة QDB الموحدة اليوم.'
            )}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-xl bg-[#c8a951] text-[#1e3a5f] font-semibold text-base hover:bg-[#d4b85e] transition-colors shadow-lg"
            >
              {t('Sign In to QDB One', 'تسجيل الدخول إلى QDB One')}
            </Link>
          </div>
          <p className="mt-6 text-white/50 text-sm">
            {t('Foreign shareholder?', 'مساهم أجنبي؟')}{' '}
            <a href="#" className="text-[#c8a951] hover:underline">
              {t('Learn about access options', 'تعرف على خيارات الوصول')}
            </a>
          </p>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="bg-[#1a2f4a] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#c8a951] flex items-center justify-center text-[#1e3a5f] font-bold text-sm">
                Q
              </div>
              <span className="text-white/70 text-sm">QDB One</span>
            </div>
            <div className="flex items-center gap-6 text-white/40 text-xs">
              <a href="#" className="hover:text-white/70 transition-colors">{t('Privacy', 'الخصوصية')}</a>
              <a href="#" className="hover:text-white/70 transition-colors">{t('Terms', 'الشروط')}</a>
              <a href="#" className="hover:text-white/70 transition-colors">{t('Contact', 'اتصل بنا')}</a>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/10 text-center text-white/30 text-xs">
            {t(
              '© 2026 Qatar Development Bank. All rights reserved.',
              '© 2026 بنك قطر للتنمية. جميع الحقوق محفوظة.'
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
