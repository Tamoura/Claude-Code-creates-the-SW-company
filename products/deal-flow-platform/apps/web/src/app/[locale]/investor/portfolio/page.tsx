import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function InvestorPortfolioPage() {
  const t = useTranslations('investor');
  const tCommon = useTranslations('common');

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-maroon mb-2">
          {t('portfolio')}
        </h1>
        <p className="text-gray-600">
          Track your investments and performance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('totalInvested')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-maroon">QR 0</p>
            <p className="text-sm text-gray-500 mt-1">
              Connect wallet to see balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('activeInvestments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-maroon">0</p>
            <p className="text-sm text-gray-500 mt-1">
              No active investments yet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('kycStatus')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">Pending</p>
            <p className="text-sm text-gray-500 mt-1">
              Complete your profile
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('subscriptions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>No subscriptions yet</p>
              <p className="text-sm mt-2">
                Browse the marketplace to find investment opportunities
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('watchlist')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>Your watchlist is empty</p>
              <p className="text-sm mt-2">
                Add deals to track them here
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
