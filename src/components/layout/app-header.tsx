
import Link from 'next/link';
import { AppLogo } from '@/components/icons/app-logo';
import { UserNav } from '@/components/layout/user-nav';
import { APP_NAME } from '@/lib/constants';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container px-4 md:px-6 lg:px-8 flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex items-center gap-2">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <Link href="/dashboard" className="flex items-center space-x-2">
            <AppLogo className="h-6 w-6 text-primary" />
            <span className="font-bold sm:inline-block font-headline">
              {APP_NAME}
            </span>
          </Link>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          <UserNav />
        </div>
      </div>
    </header>
  );
}
