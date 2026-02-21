"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * ConnectIn brand logo. Uses a teal circle with the "C" letter
 * as a placeholder until the custom SVG logo is designed.
 */
export function Logo({ size = "md", className }: LogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2",
        className
      )}
      aria-label="ConnectIn"
    >
      <div
        className={cn(
          "rounded-full bg-[#0C9AB8] text-white font-bold",
          "flex items-center justify-center",
          sizeClasses[size]
        )}
      >
        C
      </div>
      <span className="font-bold text-[#0F172A] dark:text-[#F1F5F9]">
        Connect<span className="text-[#0C9AB8]">In</span>
      </span>
    </div>
  );
}
