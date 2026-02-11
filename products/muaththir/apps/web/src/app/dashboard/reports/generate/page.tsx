'use client';

import { useTranslations } from 'next-intl';
import ComingSoon from '../../../../components/common/ComingSoon';

export default function GenerateReportPage() {
  const t = useTranslations('generateReport');
  const tc = useTranslations('common');

  return (
    <ComingSoon
      title={t('title')}
      description={t('description')}
      backHref="/dashboard/reports"
      backLabel={tc('back')}
    />
  );
}
