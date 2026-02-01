import { FileText } from "lucide-react";
import Link from "next/link";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <FileText className="h-8 w-8 text-indigo-600" />
      <span className="text-xl font-bold text-gray-900">InvoiceForge</span>
    </Link>
  );
}
