'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { mockUsers } from '@/data/mock-users';

export default function LoginPage() {
  const { login } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [selectedUser, setSelectedUser] = useState<string>('fatima');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    // Simulate NAS authentication delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    const user = mockUsers[selectedUser];
    if (user) {
      login(user);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d5a8e] to-[#1e3a5f] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#c8a951] flex items-center justify-center text-[#1e3a5f] font-bold text-lg">
            Q
          </div>
          <span className="text-white font-semibold text-lg">QDB One</span>
        </div>
        <button
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className="px-3 py-1.5 rounded-lg border border-white/20 text-white text-sm hover:bg-white/10 transition-colors"
        >
          {lang === 'en' ? 'عربي' : 'English'}
        </button>
      </div>

      {/* Login card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {t('Welcome to QDB One', 'مرحباً بك في QDB One')}
            </h1>
            <p className="text-white/70 text-sm">
              {t(
                'Your unified gateway to Qatar Development Bank services',
                'بوابتك الموحدة لخدمات بنك قطر للتنمية'
              )}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('Sign In', 'تسجيل الدخول')}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {t(
                  'Authenticate via National Authentication System (NAS)',
                  'المصادقة عبر نظام المصادقة الوطني (NAS)'
                )}
              </p>
            </div>

            {/* Demo user selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('Demo User', 'المستخدم التجريبي')}
              </label>
              <div className="space-y-2">
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                    ${selectedUser === 'fatima' ? 'border-[#1e3a5f] bg-[#1e3a5f]/5' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <input
                    type="radio"
                    name="user"
                    value="fatima"
                    checked={selectedUser === 'fatima'}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="text-[#1e3a5f]"
                  />
                  <div>
                    <div className="text-sm font-medium">
                      {t('Fatima Al-Kuwari', 'فاطمة الكواري')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t(
                        '2 companies · 3 roles (Financing, Guarantees, Advisory)',
                        'شركتان · 3 أدوار (التمويل، الضمانات، الاستشارات)'
                      )}
                    </div>
                  </div>
                </label>
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                    ${selectedUser === 'ahmed' ? 'border-[#1e3a5f] bg-[#1e3a5f]/5' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <input
                    type="radio"
                    name="user"
                    value="ahmed"
                    checked={selectedUser === 'ahmed'}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="text-[#1e3a5f]"
                  />
                  <div>
                    <div className="text-sm font-medium">
                      {t('Ahmed Al-Thani', 'أحمد آل ثاني')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t(
                        '1 company · 1 role (Financing)',
                        'شركة واحدة · دور واحد (التمويل)'
                      )}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 px-4 bg-[#1e3a5f] text-white rounded-lg font-medium hover:bg-[#2d5a8e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('Authenticating via NAS...', 'جاري المصادقة عبر NAS...')}
                </>
              ) : (
                t('Sign in with QDB Login', 'تسجيل الدخول بحساب QDB')
              )}
            </button>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400">
                {t(
                  'Prototype — No real authentication. Select a demo user above.',
                  'نموذج أولي — لا مصادقة حقيقية. اختر مستخدمًا تجريبيًا أعلاه.'
                )}
              </p>
            </div>
          </div>

          {/* Portal badges */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5 text-white/60 text-xs">
              <span>◈</span>
              <span>{t('Financing', 'التمويل')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/60 text-xs">
              <span>◉</span>
              <span>{t('Guarantees', 'الضمانات')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/60 text-xs">
              <span>◎</span>
              <span>{t('Advisory', 'الاستشارات')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-white/40 text-xs">
        {t(
          '© 2026 Qatar Development Bank. All rights reserved.',
          '© 2026 بنك قطر للتنمية. جميع الحقوق محفوظة.'
        )}
      </div>
    </div>
  );
}
