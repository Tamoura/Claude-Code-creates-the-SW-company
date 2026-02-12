import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">G</span>
        </div>
        <span className="font-bold text-xl text-primary">ConnectGRC</span>
      </Link>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
