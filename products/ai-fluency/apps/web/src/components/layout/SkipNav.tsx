import { t } from '@/lib/i18n';

export function SkipNav() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-brand-700 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
    >
      {t('common.skip_to_content')}
    </a>
  );
}
