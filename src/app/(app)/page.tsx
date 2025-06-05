
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AppRootPage() {
  const router = useRouter();

  useEffect(() => {
    // Perform the redirect to the dashboard.
    router.replace('/dashboard');
  }, [router]);

  // Return a loading indicator while the redirect is happening.
  // This ensures the component always returns valid JSX.
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="ml-3 text-lg">Redirecting to dashboard...</p>
    </div>
  );
}
