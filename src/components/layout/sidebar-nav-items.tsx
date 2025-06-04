
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Removed useParams as it's no longer needed here
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth-hook';
import type { NavItem } from '@/types';
import { NAV_ITEMS } from '@/lib/constants'; // Removed PATIENT_NAV_ITEMS
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

export function SidebarNavItems() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  // The sidebar will now always use NAV_ITEMS.
  // Patient-specific sub-navigation will be handled within the patient's layout.
  const itemsToRender: NavItem[] = NAV_ITEMS;

  const getHref = (item: NavItem) => {
    // For NAV_ITEMS when user is a patient (links to their own records)
    if (user.role === 'patient' && item.patientSpecific) {
      // Construct the patient-specific path by prepending /patients/[userId]
      // Example: item.href = '/consultations' becomes '/patients/[userId]/consultations'
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
            
            // More robust active state checking
            let finalIsActive = false;
            if (href === '/') { // Handle dashboard explicitly
              finalIsActive = pathname === '/dashboard' || pathname === '/';
            } else {
              finalIsActive = pathname === href || (item.patientSpecific && user.role === 'patient' ? pathname.startsWith(`/patients/${user.id}${item.href}`) : pathname.startsWith(href + '/'));
            }


            return (
              <SidebarMenuItem key={item.label + item.href}>
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
