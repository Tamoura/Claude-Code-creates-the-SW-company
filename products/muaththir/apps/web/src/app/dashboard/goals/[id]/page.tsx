'use client';

import { useTranslations } from 'next-intl';
import ComingSoon from '../../../../components/common/ComingSoon';

export default function GoalDetailPage() {
  const t = useTranslations('goalDetail');
  const tc = useTranslations('common');

  return (
    <ComingSoon
      title={t('title')}
      description={t('description')}
      backHref="/dashboard/goals"
      backLabel={tc('back')}
    />
  );
}
