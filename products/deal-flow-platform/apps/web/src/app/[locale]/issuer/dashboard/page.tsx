import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function IssuerDashboardPage() {
  const t = useTranslations('issuer');

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-maroon mb-2">
            {t('dashboard')}
          </h1>
          <p className="text-gray-600">
            Manage your deals and track performance
          </p>
        </div>
        <Button size="lg">
          {t('createDeal')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('activeDeals')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-maroon">0</p>
            <p className="text-sm text-gray-500 mt-1">
              Create your first deal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('totalSubscriptions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-maroon">0</p>
            <p className="text-sm text-gray-500 mt-1">
              No subscriptions yet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('totalRaised')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-maroon">QR 0</p>
            <p className="text-sm text-gray-500 mt-1">
              Start raising capital
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('myDeals')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>No deals created yet</p>
              <p className="text-sm mt-2">
                Click &quot;Create New Deal&quot; to get started
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dealAnalytics')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>Analytics will appear here</p>
              <p className="text-sm mt-2">
                Once you have active deals with subscriptions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
