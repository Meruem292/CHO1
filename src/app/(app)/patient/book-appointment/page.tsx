
'use client';

import { useAuth } from '@/hooks/use-auth-hook';
import Link from 'next/link';
import { ChevronLeft, CalendarPlus } from 'lucide-react';

export default function PatientBookAppointmentPage() {
  const { user } = useAuth();

  if (!user || user.role !== 'patient') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
        <p>This page is for patients only.</p>
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
          <CalendarPlus className="mr-3 h-8 w-8 text-primary" /> Book an Appointment
        </h1>
      </div>
      <p className="text-muted-foreground">
        Find available doctors and schedule your visit.
      </p>
      <div className="border rounded-lg p-8 text-center">
        <p className="text-xl text-muted-foreground">Appointment booking functionality coming soon!</p>
      </div>
    </div>
  );
}
