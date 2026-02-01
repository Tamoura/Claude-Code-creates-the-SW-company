import Link from "next/link";
import { Button } from "@/components/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Perfect for trying out InvoiceForge",
    features: [
      "5 invoices per month",
      "AI invoice generation",
      "PDF export",
      "Email support",
      "Basic templates",
    ],
    cta: "Get Started",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month",
    description: "For freelancers and solopreneurs",
    features: [
      "Unlimited invoices",
      "AI invoice generation",
      "PDF export",
      "Stripe payment links",
      "Custom branding",
      "Priority support",
      "Advanced templates",
      "Client management",
    ],
    cta: "Start Pro Trial",
    href: "/signup?plan=pro",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$29",
    period: "/month",
    description: "For small teams and agencies",
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "Team collaboration",
      "Role-based permissions",
      "API access",
      "Advanced analytics",
      "Dedicated support",
      "Custom integrations",
    ],
    cta: "Start Team Trial",
    href: "/signup?plan=team",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-gray-600">
            Choose the plan that fits your needs. Always know what you&apos;ll pay.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3 lg:gap-6 mb-16">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={tier.highlighted ? "border-indigo-600 border-2 shadow-lg" : ""}
            >
              {tier.highlighted && (
                <div className="bg-indigo-600 text-white text-center py-2 rounded-t-lg text-sm font-semibold">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                  <span className="text-gray-500">{tier.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href={tier.href}>
                  <Button
                    variant={tier.highlighted ? "primary" : "outline"}
                    className="w-full"
                  >
                    {tier.cta}
                  </Button>
                </Link>
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Compare Features
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900">
                    Feature
                  </th>
                  <th className="text-center py-4 px-4 text-sm font-semibold text-gray-900">
                    Free
                  </th>
                  <th className="text-center py-4 px-4 text-sm font-semibold text-gray-900">
                    Pro
                  </th>
                  <th className="text-center py-4 px-4 text-sm font-semibold text-gray-900">
                    Team
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Monthly invoices", free: "5", pro: "Unlimited", team: "Unlimited" },
                  { name: "AI generation", free: true, pro: true, team: true },
                  { name: "PDF export", free: true, pro: true, team: true },
                  { name: "Payment links", free: false, pro: true, team: true },
                  { name: "Custom branding", free: false, pro: true, team: true },
                  { name: "Team members", free: "1", pro: "1", team: "Unlimited" },
                  { name: "API access", free: false, pro: false, team: true },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-4 px-4 text-sm text-gray-700">{row.name}</td>
                    <td className="py-4 px-4 text-center text-sm">
                      {typeof row.free === "boolean" ? (
                        row.free ? (
                          <Check className="h-5 w-5 text-indigo-600 mx-auto" />
                        ) : (
                          <span className="text-gray-300">−</span>
                        )
                      ) : (
                        <span className="text-gray-700">{row.free}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      {typeof row.pro === "boolean" ? (
                        row.pro ? (
                          <Check className="h-5 w-5 text-indigo-600 mx-auto" />
                        ) : (
                          <span className="text-gray-300">−</span>
                        )
                      ) : (
                        <span className="text-gray-700">{row.pro}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      {typeof row.team === "boolean" ? (
                        row.team ? (
                          <Check className="h-5 w-5 text-indigo-600 mx-auto" />
                        ) : (
                          <span className="text-gray-300">−</span>
                        )
                      ) : (
                        <span className="text-gray-700">{row.team}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
