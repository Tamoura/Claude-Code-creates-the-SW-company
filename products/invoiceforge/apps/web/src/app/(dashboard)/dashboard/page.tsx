import Link from "next/link";
import { Button } from "@/components/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { FileText, DollarSign, Users, TrendingUp, Plus } from "lucide-react";

export default function DashboardPage() {
  // Placeholder data
  const stats = [
    {
      name: "Total Invoices",
      value: "12",
      icon: FileText,
      change: "+2 this month",
    },
    {
      name: "Total Revenue",
      value: "$8,450",
      icon: DollarSign,
      change: "+15% from last month",
    },
    {
      name: "Active Clients",
      value: "8",
      icon: Users,
      change: "+1 new this month",
    },
    {
      name: "Pending Payments",
      value: "$1,250",
      icon: TrendingUp,
      change: "2 invoices",
    },
  ];

  const recentInvoices = [
    {
      id: "INV-001",
      client: "Acme Corp",
      amount: "$1,500",
      status: "paid" as const,
      date: "Jan 28, 2026",
    },
    {
      id: "INV-002",
      client: "TechStart Inc",
      amount: "$750",
      status: "sent" as const,
      date: "Jan 30, 2026",
    },
    {
      id: "INV-003",
      client: "Design Studio",
      amount: "$2,200",
      status: "draft" as const,
      date: "Feb 1, 2026",
    },
  ];

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
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
          <div className="space-y-4">
            {recentInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{invoice.id}</p>
                    <p className="text-sm text-gray-500">{invoice.client}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={invoice.status}>{invoice.status}</Badge>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{invoice.amount}</p>
                    <p className="text-sm text-gray-500">{invoice.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
