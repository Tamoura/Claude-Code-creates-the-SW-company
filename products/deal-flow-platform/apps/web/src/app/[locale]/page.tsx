import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const tDeals = useTranslations('deals');

  return (
    <div className="container mx-auto px-4 py-12">
      <section className="text-center mb-16">
        <h1 className="text-5xl font-bold text-maroon mb-4">
          {tDeals('marketplace')}
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Discover investment opportunities in Qatar&apos;s premier deal flow platform
        </p>
        <Link href="/deals">
          <Button size="lg">
            {tDeals('allDeals')}
          </Button>
        </Link>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-maroon">For Investors</CardTitle>
            <CardDescription>
              Access exclusive investment opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• IPOs and Private Placements</li>
              <li>• Sukuk and Mutual Funds</li>
              <li>• Real Estate Opportunities</li>
              <li>• Sharia-Compliant Options</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-maroon">For Issuers</CardTitle>
            <CardDescription>
              Raise capital efficiently
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Streamlined Deal Creation</li>
              <li>• Qualified Investor Network</li>
              <li>• Real-time Analytics</li>
              <li>• Regulatory Compliance</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-maroon">Secure & Compliant</CardTitle>
            <CardDescription>
              Qatar-focused, regulation-ready
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• QFMA Compliant</li>
              <li>• KYC/AML Verification</li>
              <li>• Secure Transactions</li>
              <li>• Multi-tenant Architecture</li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
