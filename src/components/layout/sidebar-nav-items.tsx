
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

  const patientIdFromUrl = params.patientId as string | undefined;

  let itemsToRender: NavItem[];

  if (patientIdFromUrl && (user.role === 'admin' || user.role === 'doctor')) {
    // Admin or Doctor is viewing a specific patient's records
    itemsToRender = PATIENT_NAV_ITEMS;
  } else {
    // Either on a general page, or a Patient is viewing their own records (patientIdFromUrl might be user.id)
    itemsToRender = NAV_ITEMS;
  }

  const getHref = (item: NavItem) => {
    // For PATIENT_NAV_ITEMS (admin/doctor viewing specific patient)
    if (patientIdFromUrl && item.patientSpecific && (user.role === 'admin' || user.role === 'doctor')) {
      return `/patients/${patientIdFromUrl}${item.href}`;
    }
    // For NAV_ITEMS when user is a patient (links to their own records)
    if (user.role === 'patient' && item.patientSpecific) {
      return `/patients/${user.id}${item.href}`;
    }
    // Default for general NAV_ITEMS or non-patientSpecific items
    return item.href;
  };

  return (
    <ScrollArea className="flex-1">
      <SidebarMenu>
        {itemsToRender
          .filter(item => item.roles.includes(user.role))
          .map((item) => {
            const href = getHref(item);
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href + '/') && href.length > 1);
            // Ensure dashboard ('/') active state is handled correctly and doesn't match all other routes
            const isDashboardActive = href === '/' && pathname === '/';
            const finalIsActive = href === '/' ? isDashboardActive : isActive;

            return (
              <SidebarMenuItem key={item.label + item.href}> {/* Ensure key is unique, combining label and original href */}
                <SidebarMenuButton
                  asChild
                  isActive={finalIsActive}
                  className={cn(
                    'w-full justify-start',
                    finalIsActive && 'bg-primary/10 text-primary hover:bg-primary/20'
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
