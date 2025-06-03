'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth-hook';
import type { NavItem } from '@/types';
import { NAV_ITEMS, PATIENT_NAV_ITEMS } from '@/lib/constants';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar'; // Assuming these are part of your sidebar component structure

export function SidebarNavItems() {
  const pathname = usePathname();
  const params = useParams();
  const { user } = useAuth();

  if (!user) return null;

  const patientId = params.patientId as string | undefined;

  const itemsToRender = patientId ? PATIENT_NAV_ITEMS : NAV_ITEMS;

  const getHref = (item: NavItem) => {
    if (patientId && item.patientSpecific) {
      return `/patients/${patientId}${item.href}`;
    }
    if (user.role === 'patient' && item.patientSpecific) {
      // For patients, their own records are under /patients/[their_own_id]/...
      // This mock assumes user.id is the patientId for a patient user.
      return `/patients/${user.id}${item.href}`;
    }
    return item.href;
  };

  return (
    <ScrollArea className="flex-1">
      <SidebarMenu>
        {itemsToRender
          .filter(item => item.roles.includes(user.role))
          .map((item) => {
            const href = getHref(item);
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href + '/'));
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={cn(
                    'w-full justify-start',
                    isActive && 'bg-primary/10 text-primary hover:bg-primary/20'
                  )}
                  tooltip={item.label}
                >
                  <Link href={href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
        })}
      </SidebarMenu>
    </ScrollArea>
  );
}
