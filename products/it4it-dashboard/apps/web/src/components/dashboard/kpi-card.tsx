import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "neutral";
  description?: string;
  className?: string;
}

export function KPICard({
  title,
  value,
  change,
  trend = "neutral",
  description,
  className,
}: KPICardProps) {
  const trendIcon = {
    up: ArrowUp,
    down: ArrowDown,
    neutral: Minus,
  }[trend];

  const TrendIcon = trendIcon;

  const trendColor = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-muted-foreground",
  }[trend];

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
            <TrendIcon className="h-4 w-4" />
            <span>{Math.abs(change)}%</span>
            {description && (
              <span className="text-muted-foreground ml-1">{description}</span>
            )}
          </div>
        )}
        {!change && description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
