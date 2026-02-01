'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { getProfile, updateProfile, getStripeConnectUrl, disconnectStripe } from '@/lib/api';
import type { UserProfile } from '@/lib/types';
import {
  Loader2,
  CheckCircle2,
  ExternalLink,
  CreditCard,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [disconnectingStripe, setDisconnectingStripe] = useState(false);
  const [formData, setFormData] = useState({ name: '', businessName: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data);
      setFormData({
        name: data.name,
        businessName: data.businessName || '',
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateProfile(formData);
      setProfile(updated);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const { url } = await getStripeConnectUrl();
      window.location.href = url;
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to get Stripe connect URL',
      });
      setConnectingStripe(false);
    }
  };

  const handleDisconnectStripe = async () => {
    if (!confirm('Are you sure you want to disconnect your Stripe account?')) return;

    setDisconnectingStripe(true);
    try {
      await disconnectStripe();
      await loadProfile();
      setMessage({ type: 'success', text: 'Stripe account disconnected successfully' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to disconnect Stripe',
      });
    } finally {
      setDisconnectingStripe(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">Failed to load profile</p>
      </div>
    );
  }

  const usagePercentage =
    profile.invoiceLimitThisMonth
      ? (profile.invoiceCountThisMonth / profile.invoiceLimitThisMonth) * 100
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <p
              className={`text-sm font-medium ${
                message.type === 'success' ? 'text-green-900' : 'text-red-900'
              }`}
            >
              {message.text}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal and business information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={profile.email}
              disabled
              className="bg-gray-50"
            />
            <Input
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your full name"
            />
            <Input
              label="Business Name (Optional)"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              placeholder="Your Company LLC"
            />
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Stripe Connect */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Processing</CardTitle>
            <CardDescription>
              Connect your Stripe account to accept payments directly from clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile.stripeConnected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">Stripe Connected</p>
                    <p className="text-sm text-green-700">
                      You can now accept payments from your clients
                    </p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDisconnectStripe}
                  disabled={disconnectingStripe}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {disconnectingStripe ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    'Disconnect Stripe'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                  <CreditCard className="h-8 w-8 text-blue-600 mb-3" />
                  <h4 className="font-semibold text-blue-900 mb-2">Enable Online Payments</h4>
                  <p className="text-sm text-blue-800 mb-4">
                    Connect your Stripe account to add payment links to your invoices and get paid
                    faster. Your clients will be able to pay securely with credit cards or bank
                    transfers.
                  </p>
                  <Button onClick={handleConnectStripe} disabled={connectingStripe}>
                    {connectingStripe ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Connect Stripe Account
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Usage</CardTitle>
            <CardDescription>Track your monthly invoice limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {profile.invoiceCountThisMonth} of{' '}
                  {profile.invoiceLimitThisMonth || '∞'} invoices used this month
                </span>
                <span className="font-medium text-gray-900">
                  {profile.subscriptionTier.toUpperCase()}
                </span>
              </div>
              {profile.invoiceLimitThisMonth && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      usagePercentage >= 80 ? 'bg-red-600' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {profile.subscriptionTier === 'free' && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-indigo-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-indigo-900 mb-1">Upgrade for unlimited invoices</p>
                    <p className="text-sm text-indigo-700 mb-3">
                      Get unlimited invoices, payment processing, and more with InvoiceForge Pro
                    </p>
                    <Link href="/dashboard/settings/billing">
                      <Button size="sm">View Plans</Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
