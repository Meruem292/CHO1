
'use client';

import { useAuth } from '@/hooks/use-auth-hook';
import Link from 'next/link';
import { ChevronLeft, CalendarClock } from 'lucide-react';

export default function DoctorMyAppointmentsPage() {
  const { user } = useAuth();

   if (!user || user.role !== 'doctor') {
    // Similar to My Schedule, this page is primarily for logged-in doctors.
    // Admins would view appointments via /admin/appointments.
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
        <p>This page is for doctors to view their appointments. Admins can manage appointments via the Admin section.</p>
        <Link href="/dashboard" className="text-primary hover:underline">
            Go to Dashboard
        </Link>
      </div>
    );
  }
  // TODO: Redirect to /doctors/[user.id]/appointments in a useEffect or similar

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="flex items-center text-sm text-primary hover:underline mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <CalendarClock className="mr-3 h-8 w-8 text-primary" /> My Appointments
        </h1>
      </div>
      <p className="text-muted-foreground">
        View and manage your upcoming and past appointments.
      </p>
      <div className="border rounded-lg p-8 text-center">
        <p className="text-xl text-muted-foreground">Your appointment list functionality coming soon!</p>
      </div>
    </div>
  );
}
