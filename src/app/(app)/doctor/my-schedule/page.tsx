
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth-hook';
import { useMockDb } from '@/hooks/use-mock-db';
import Link from 'next/link';
import { ChevronLeft, CalendarPlus, Loader2, ShieldAlert } from 'lucide-react';
import { DoctorScheduleForm } from '@/components/forms/doctor-schedule-form';
import type { DoctorSchedule, DoctorScheduleFormData } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DoctorMySchedulePage() {
  const { user } = useAuth();
  const { getDoctorScheduleById, saveDoctorSchedule, doctorSchedule, doctorScheduleLoading } = useMockDb();
  const [isSaving, setIsSaving] = useState(false);

  const canManageSchedule = user?.role === 'doctor' || user?.role === 'midwife/nurse';

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (canManageSchedule && user?.id) {
      unsubscribe = getDoctorScheduleById(user.id);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, canManageSchedule, getDoctorScheduleById]);

  if (!user || (!canManageSchedule && user.role !== 'admin')) {
    // Admins can view this page but won't see a form.
     return (
      <div className="space-y-6">
        <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
            This page is for Doctors and Midwives to manage their schedule.
            </AlertDescription>
        </Alert>
         <Link href="/dashboard" className="text-primary hover:underline">
            Go to Dashboard
        </Link>
      </div>
    );
  }

  const handleSaveSchedule = async (data: DoctorScheduleFormData) => {
    if (!user || !canManageSchedule) {
      toast({ variant: "destructive", title: "Error", description: "Only authorized personnel can save a schedule." });
      return;
    }
    setIsSaving(true);
    try {
      // The form data matches DoctorScheduleFormData, which has doctorId.
      // The saveDoctorSchedule in useMockDb will handle id internally.
      await saveDoctorSchedule(data);
      toast({ title: "Schedule Saved", description: "Your working schedule has been updated successfully." });
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast({ variant: "destructive", title: "Error Saving Schedule", description: "Could not save your schedule. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (doctorScheduleLoading && canManageSchedule) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Loading your schedule...</p>
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
          <CalendarPlus className="mr-3 h-8 w-8 text-primary" /> Manage My Schedule
        </h1>
      </div>
      <p className="text-muted-foreground">
        Set your working hours, default appointment duration, and manage your availability.
      </p>
      
      {canManageSchedule && user.id && (
        <DoctorScheduleForm
          doctorId={user.id}
          currentSchedule={doctorSchedule}
          onSubmit={handleSaveSchedule}
          isLoading={isSaving || doctorScheduleLoading}
        />
      )}

      {user?.role === 'admin' && (
         <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Admin View</AlertTitle>
            <AlertDescription>
                You are viewing this page as an admin. Schedule editing is done by doctors or midwives themselves.
                You can view all schedules from the <Link href="/admin/schedules" className="font-medium text-primary hover:underline">Doctor Schedules</Link> page.
            </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
