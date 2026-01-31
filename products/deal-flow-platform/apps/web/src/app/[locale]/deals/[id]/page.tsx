import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DealDetailPage({ params }: { params: { id: string } }) {
  const t = useTranslations('deals');

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <span className="inline-block px-4 py-1.5 bg-green-100 text-green-800 text-sm font-medium rounded-full">
              {t('statuses.SUBSCRIPTION_OPEN')}
            </span>
            <span className="text-sm text-gray-500">
              {t('dealTypes.IPO')}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-maroon mb-2">
            Sample Deal #{params.id}
          </h1>
          <p className="text-gray-600">
            Technology sector investment opportunity
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('targetAmount')}:</span>
                <span className="font-medium">QR 10,000,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('minSubscription')}:</span>
                <span className="font-medium">QR 50,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('maxSubscription')}:</span>
                <span className="font-medium">QR 500,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('expectedReturn')}:</span>
                <span className="font-medium text-green-600">12.5%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dates & Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('openDate')}:</span>
                <span className="font-medium">Jan 1, 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('closeDate')}:</span>
                <span className="font-medium">Feb 28, 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('shariaCompliance')}:</span>
                <span className="font-medium text-green-600">
                  {t('shariaCompliance.CERTIFIED')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('sector')}:</span>
                <span className="font-medium">Technology</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 leading-relaxed">
              This is a sample deal description. In a real application, this would contain
              detailed information about the investment opportunity, including the company
              background, use of funds, risk factors, and other relevant details.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button size="lg" className="flex-1">
            {t('subscribe')}
          </Button>
          <Button size="lg" variant="outline">
            {t('addToWatchlist')}
          </Button>
        </div>
      </div>
    </div>
  );
}
