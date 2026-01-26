"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface HeaderProps {
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

export function Header({ user }: HeaderProps) {
  const defaultUser = user || {
    name: "Demo User",
    email: "demo@it4it.com",
    role: "IT Manager",
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-6">
      <div className="flex flex-1 items-center justify-end gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium">{defaultUser.name}</div>
            <div className="text-xs text-muted-foreground">{defaultUser.role}</div>
          </div>
          <Avatar>
            <AvatarFallback>{getInitials(defaultUser.name)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
