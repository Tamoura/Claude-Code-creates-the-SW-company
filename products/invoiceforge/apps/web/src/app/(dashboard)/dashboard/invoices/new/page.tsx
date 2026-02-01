import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { Sparkles } from "lucide-react";

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Invoice</h1>
        <p className="text-gray-500 mt-1">
          Use AI to generate a professional invoice from your description
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            AI Invoice Generator
          </CardTitle>
          <CardDescription>
            Describe your work in plain English and we&apos;ll create the invoice for you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-lg p-12 text-center">
            <Sparkles className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Coming Soon
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              The AI invoice generator is currently under development.
              You&apos;ll be able to describe your work and instantly get a formatted invoice.
            </p>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 text-left max-w-md mx-auto">
                <p className="text-sm text-gray-500 mb-2">Example input:</p>
                <p className="text-sm text-gray-700 italic">
                  &quot;I built a website for Acme Corp. 40 hours of development at $100/hour,
                  plus 10 hours of design at $80/hour.&quot;
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 text-left max-w-md mx-auto">
                <p className="text-sm text-gray-500 mb-2">AI will generate:</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Line item: Website Development - 40 hours × $100 = $4,000</li>
                  <li>• Line item: UI/UX Design - 10 hours × $80 = $800</li>
                  <li>• Total: $4,800</li>
                  <li>• Professional formatting and layout</li>
                </ul>
              </div>
            </div>
            <Button variant="outline" className="mt-6" disabled>
              Start with AI (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Invoice Creation</CardTitle>
          <CardDescription>
            Traditional form-based invoice creation (placeholder)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">
              Manual invoice creation form will be available here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
