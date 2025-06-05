
'use client';

import { Loader2 } from 'lucide-react';

// This is a temporary diagnostic page.
// Its purpose is to see if Vercel can build *any* client component
// at the path /app/(app)/page.tsx without the redirect logic.
export default function AppRootPlaceholderPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="ml-3 text-lg">Diagnostic Placeholder Page</p>
      <p className="mt-2 text-sm text-muted-foreground">If you see this after deployment, the build for this page structure was successful.</p>
    </div>
  );
}
