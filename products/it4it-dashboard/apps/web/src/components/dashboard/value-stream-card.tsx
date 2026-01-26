import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Metric {
  label: string;
  value: string | number;
}

interface ValueStreamCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  color: string;
  metrics: Metric[];
}

export function ValueStreamCard({
  title,
  description,
  href,
  icon: Icon,
  color,
  metrics,
}: ValueStreamCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className={cn("rounded-lg p-2", color)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardTitle className="mt-4">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{metric.label}</span>
              <span className="font-semibold">{metric.value}</span>
            </div>
          ))}
        </div>
        <Link href={href}>
          <Button variant="outline" className="w-full mt-4">
            View Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
