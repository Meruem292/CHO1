
'use client';

import { useAuth } from '@/hooks/use-auth-hook';
import Link from 'next/link';
import { ChevronLeft, CalendarClock, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminManageAppointmentsPage() {
  const { user } = useAuth();

  if (!user || user.role !== 'admin') {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
            You do not have permission to view this page. This page is for administrators only.
            </AlertDescription>
        </Alert>
         <Link href="/dashboard" className="text-primary hover:underline">
            Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="flex items-center text-sm text-primary hover:underline mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <CalendarClock className="mr-3 h-8 w-8 text-primary" /> Manage All Appointments
        </h1>
      </div>
      <p className="text-muted-foreground">
        View, cancel, or assist in rescheduling appointments for all users.
      </p>
      <div className="border rounded-lg p-8 text-center">
        <p className="text-xl text-muted-foreground">Appointment management functionality coming soon!</p>
      </div>
    </div>
  );
}
