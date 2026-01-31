import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DealsPage() {
  const t = useTranslations('deals');
  const tCommon = useTranslations('common');

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-maroon mb-2">
          {t('marketplace')}
        </h1>
        <p className="text-gray-600">
          Browse all available investment opportunities
        </p>
      </div>

      <div className="mb-8 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={tCommon('search') + '...'}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon"
          />
        </div>
        <Button variant="outline">
          {tCommon('filter')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                {t('statuses.SUBSCRIPTION_OPEN')}
              </span>
              <span className="text-xs text-gray-500">
                {t('dealTypes.IPO')}
              </span>
            </div>
            <CardTitle className="text-lg">Sample IPO Deal</CardTitle>
            <CardDescription>
              Technology sector opportunity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('targetAmount')}:</span>
                <span className="font-medium">QR 10,000,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('minSubscription')}:</span>
                <span className="font-medium">QR 50,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('shariaCompliance')}:</span>
                <span className="font-medium text-green-600">
                  {t('shariaCompliance.CERTIFIED')}
                </span>
              </div>
            </div>
            <Button className="w-full mt-4" size="sm">
              {tCommon('view')} {t('dealDetails')}
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="text-lg">More deals coming soon</CardTitle>
            <CardDescription>
              Connect with the API to see live deals
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
