'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { mockUsers } from '@/data/mock-users';

export default function MobileLoginPage() {
  const { login } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<string>('fatima');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    const user = mockUsers[selectedUser];
    if (user) {
      login(user);
      router.push('/m');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d5a8e] to-[#1e3a5f] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#c8a951] flex items-center justify-center text-[#1e3a5f] font-bold text-sm">Q</div>
          <span className="text-white font-semibold">QDB One</span>
        </div>
        <button
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className="px-3 py-1.5 rounded-lg border border-white/20 text-white text-xs"
        >
          {lang === 'en' ? '\u0639\u0631\u0628\u064A' : 'English'}
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-white mb-1">
            {t('Sign In', '\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644')}
          </h1>
          <p className="text-white/60 text-xs">
            {t('Authenticate via NAS', '\u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629 \u0639\u0628\u0631 NAS')}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 space-y-4">
          <div className="space-y-2">
            {[
              { key: 'fatima', nameEn: 'Fatima Al-Kuwari', nameAr: '\u0641\u0627\u0637\u0645\u0629 \u0627\u0644\u0643\u0648\u0627\u0631\u064A', descEn: '2 companies \u00B7 3 roles', descAr: '\u0634\u0631\u0643\u062A\u0627\u0646 \u00B7 3 \u0623\u062F\u0648\u0627\u0631' },
              { key: 'ahmed', nameEn: 'Ahmed Al-Thani', nameAr: '\u0623\u062D\u0645\u062F \u0622\u0644 \u062B\u0627\u0646\u064A', descEn: '1 company \u00B7 1 role', descAr: '\u0634\u0631\u0643\u0629 \u0648\u0627\u062D\u062F\u0629 \u00B7 \u062F\u0648\u0631 \u0648\u0627\u062D\u062F' },
            ].map(u => (
              <label
                key={u.key}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedUser === u.key ? 'border-[#1e3a5f] bg-[#1e3a5f]/5' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="user"
                  value={u.key}
                  checked={selectedUser === u.key}
                  onChange={e => setSelectedUser(e.target.value)}
                  className="text-[#1e3a5f]"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">{t(u.nameEn, u.nameAr)}</div>
                  <div className="text-[10px] text-gray-500">{t(u.descEn, u.descAr)}</div>
                </div>
              </label>
            ))}
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 bg-[#1e3a5f] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('Authenticating...', '\u062C\u0627\u0631\u064A \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629...')}
              </>
            ) : (
              t('Sign in with QDB Login', '\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u062D\u0633\u0627\u0628 QDB')
            )}
          </button>

          <p className="text-[10px] text-gray-400 text-center">
            {t('Prototype \u2014 No real authentication', '\u0646\u0645\u0648\u0630\u062C \u0623\u0648\u0644\u064A \u2014 \u0644\u0627 \u0645\u0635\u0627\u062F\u0642\u0629 \u062D\u0642\u064A\u0642\u064A\u0629')}
          </p>
        </div>
      </div>
    </div>
  );
}
