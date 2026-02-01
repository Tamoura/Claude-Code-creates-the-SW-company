'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { getProfile } from '@/lib/api';
import type { UserProfile } from '@/lib/types';
import { Loader2, Check, ArrowLeft, Zap } from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  recommended?: boolean;
  comingSoon?: boolean;
}

const plans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'Perfect for trying out InvoiceForge',
    features: [
      '5 invoices per month',
      'Basic invoice templates',
      'Client management',
      'Email delivery',
      'PDF downloads',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9',
    description: 'For freelancers and small businesses',
    recommended: true,
    features: [
      'Unlimited invoices',
      'All Free features',
      'Payment processing via Stripe',
      'Custom branding',
      'Priority support',
      'Advanced analytics',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: '$29',
    description: 'For growing teams and agencies',
    comingSoon: true,
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Role-based permissions',
      'Multi-user access',
      'Dedicated account manager',
      'API access',
    ],
  },
];

export default function BillingPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleUpgrade = (_planId: string) => {
    alert('Stripe Billing integration coming soon! You will be able to upgrade your plan here.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const currentTier = profile?.subscriptionTier || 'free';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Billing & Plans</h1>
        <p className="text-gray-500 mt-1">Choose the plan that fits your needs</p>
      </div>

      {/* Current Plan */}
      {profile && (
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>You are currently on the {currentTier} plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-indigo-900 capitalize">
                    {currentTier} Plan
                  </h3>
                  <Badge variant="success">Active</Badge>
                </div>
                <p className="text-sm text-indigo-700">
                  {profile.invoiceCountThisMonth} of{' '}
                  {profile.invoiceLimitThisMonth || '∞'} invoices used this month
                </p>
              </div>
              {currentTier === 'free' && (
                <Button onClick={() => handleUpgrade('pro')}>
                  <Zap className="mr-2 h-4 w-4" />
                  Upgrade Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Plans */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = currentTier === plan.id;

          return (
            <Card
              key={plan.id}
              className={`relative ${
                plan.recommended ? 'border-indigo-600 border-2 shadow-lg' : ''
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge variant="success" className="bg-indigo-600 text-white px-4 py-1">
                    Recommended
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600">/month</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-4">
                  {isCurrentPlan ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : plan.comingSoon ? (
                    <Button variant="outline" className="w-full" disabled>
                      Coming Soon
                    </Button>
                  ) : currentTier === 'free' && plan.id === 'pro' ? (
                    <Button className="w-full" onClick={() => handleUpgrade(plan.id)}>
                      Upgrade to {plan.name}
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => handleUpgrade(plan.id)}>
                      Contact Sales
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">
              Can I switch plans at any time?
            </h4>
            <p className="text-sm text-gray-600">
              Yes! You can upgrade or downgrade your plan at any time. Changes will be prorated
              based on your current billing cycle.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">
              What happens if I exceed my invoice limit?
            </h4>
            <p className="text-sm text-gray-600">
              On the Free plan, you will be prompted to upgrade once you reach your limit. Pro
              and Team plans have unlimited invoices.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">
              Do you offer refunds?
            </h4>
            <p className="text-sm text-gray-600">
              We offer a 30-day money-back guarantee on all paid plans. If you are not satisfied,
              contact our support team for a full refund.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
