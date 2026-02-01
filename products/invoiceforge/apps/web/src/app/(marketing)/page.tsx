import Link from "next/link";
import { Button } from "@/components/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card";
import { Zap, CreditCard, FileDown, Star } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="px-4 py-20 md:py-32 bg-gradient-to-b from-indigo-50 to-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Generate Professional Invoices with AI
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 sm:text-xl">
              Describe your work in plain English. Get a formatted, professional invoice in seconds.
              No complex forms. No manual calculations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  See Pricing
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500">No credit card required • 5 free invoices</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 py-20 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything you need to invoice clients
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Powered by AI, designed for simplicity
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-100">
                    <Zap className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
                <CardTitle>AI Generation</CardTitle>
                <CardDescription>
                  Just describe what you did. Our AI formats it into a professional invoice automatically.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-100">
                    <CreditCard className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
                <CardTitle>Payment Links</CardTitle>
                <CardDescription>
                  Integrated Stripe payment links. Get paid faster with one-click checkout for your clients.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-100">
                    <FileDown className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
                <CardTitle>PDF Export</CardTitle>
                <CardDescription>
                  Download professional PDFs ready to send. Customizable templates and branding.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="px-4 py-20 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Trusted by freelancers worldwide
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                name: "Sarah Chen",
                role: "Freelance Designer",
                quote: "InvoiceForge saves me hours every week. I just describe my work and it creates the perfect invoice.",
              },
              {
                name: "Michael Park",
                role: "Software Consultant",
                quote: "The AI understands context so well. It even suggests better descriptions for my line items.",
              },
              {
                name: "Jessica Rodriguez",
                role: "Content Writer",
                quote: "Getting paid has never been easier. Clients love the clean invoices and quick payment links.",
              },
            ].map((testimonial, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex gap-1 mb-2">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <CardDescription className="text-base">
                    &quot;{testimonial.quote}&quot;
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 bg-indigo-600">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl mb-6">
            Ready to simplify your invoicing?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join thousands of freelancers who trust InvoiceForge
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="bg-white text-indigo-600 hover:bg-gray-100">
              Start Free Today
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
