'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { listInvoices } from '@/lib/api';
import { formatCents, formatDate } from '@/lib/format';
import type { Invoice, InvoiceSummary } from '@/lib/types';
import { FileText, DollarSign, Users, TrendingUp, Plus, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await listInvoices({ limit: 5 });
      setRecentInvoices(data.invoices);
      setSummary(data.summary);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here&apos;s your overview.</p>
        </div>
        <Link href="/dashboard/invoices/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  Total Outstanding
                </CardTitle>
                <DollarSign className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {summary ? formatCents(summary.totalOutstanding) : '$0.00'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Unpaid invoices</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  Paid This Month
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {summary ? formatCents(summary.paidThisMonth) : '$0.00'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Revenue received</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  Invoices This Month
                </CardTitle>
                <FileText className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {summary ? summary.invoicesThisMonth : 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">Created this month</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Invoices</CardTitle>
                  <CardDescription>Your latest invoice activity</CardDescription>
                </div>
                <Link href="/dashboard/invoices">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No invoices yet</p>
                  <Link href="/dashboard/invoices/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Invoice
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                      className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                          <FileText className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-gray-500">
                            {invoice.client?.name || 'No client'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={invoice.status}>{invoice.status.toUpperCase()}</Badge>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCents(invoice.total)}</p>
                          <p className="text-sm text-gray-500">{formatDate(invoice.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get you started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/invoices/new">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                Create New Invoice
              </Button>
            </Link>
            <Link href="/dashboard/clients">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Manage Clients
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Learn how to use InvoiceForge</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-600">
              New to InvoiceForge? Check out these resources:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Create your first invoice with AI</li>
              <li>Set up payment links</li>
              <li>Customize your invoice template</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
