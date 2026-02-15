'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface MobileCardProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export default function MobileCard({ children, href, onClick, className = '' }: MobileCardProps) {
  const base = `bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 ${className}`;

  if (href) {
    return (
      <Link href={href} className={`block active:bg-gray-50 transition-colors ${base}`}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={`w-full text-left active:bg-gray-50 transition-colors ${base}`}>
        {children}
      </button>
    );
  }

  return <div className={base}>{children}</div>;
}
