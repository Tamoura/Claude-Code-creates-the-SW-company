'use client';

import { useTranslations } from 'next-intl';
import ComingSoon from '../../../../components/common/ComingSoon';

export default function SharingSettingsPage() {
  const t = useTranslations('sharing');

  return (
    <ComingSoon
      title={t('title')}
      description={t('description')}
      backHref="/dashboard/settings"
      backLabel="Back to Settings"
    />
  );
}
