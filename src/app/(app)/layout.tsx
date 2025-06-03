'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth-hook';
import { AppHeader } from '@/components/layout/app-header';
import { SidebarNavItems } from '@/components/layout/sidebar-nav-items';
import { Sidebar, SidebarContent, SidebarProvider, SidebarInset, SidebarHeader, SidebarFooter } from '@/components/ui/sidebar';
import { AppLogo } from '@/components/icons/app-logo';
import { APP_NAME } from '@/lib/constants';
import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p> {/* Or a proper spinner/loader component */}
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
        <Sidebar variant="sidebar" collapsible="icon" side="left">
          <SidebarHeader className="p-4">
             <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                <AppLogo className="h-7 w-7 text-primary group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8" />
                <span className="text-lg font-semibold font-headline group-data-[collapsible=icon]:hidden">{APP_NAME}</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarNavItems />
          </SidebarContent>
          <SidebarFooter>
            {/* Footer content if any, e.g. settings, help */}
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <AppHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                {children}
            </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
