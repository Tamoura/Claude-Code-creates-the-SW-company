import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { Plus, Building2 } from "lucide-react";

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">Manage your client information</p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Client Management Coming Soon
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Soon you&apos;ll be able to save client information, track invoice history,
              and manage your business relationships all in one place.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
