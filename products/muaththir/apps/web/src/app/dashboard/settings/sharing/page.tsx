'use client';

import { useTranslations } from 'next-intl';
import ComingSoon from '../../../../components/common/ComingSoon';

export default function SharingSettingsPage() {
  const t = useTranslations('sharing');
  const tc = useTranslations('common');

  return (
    <ComingSoon
      title={t('title')}
      description={t('description')}
      backHref="/dashboard/settings"
      backLabel={tc('back')}
    />
  );
}
