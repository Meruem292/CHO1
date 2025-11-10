
'use client';

import React, { useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth-hook';
import { useMockDb } from '@/hooks/use-mock-db';
import Link from 'next/link';
import { ChevronLeft, BriefcaseMedical, ShieldAlert, Loader2, UserCircle, CalendarDays, Clock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Patient, DoctorSchedule, WorkingDay } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const formatTime = (timeStr: string | undefined) => {
  if (!timeStr) return 'N/A';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

export default function AdminManageSchedulesPage() {
  const { user } = useAuth();
  const { 
    patients, 
    patientsLoading, 
    allDoctorSchedules, 
    allDoctorSchedulesLoading, 
    getAllDoctorSchedules 
  } = useMockDb();

  useEffect(() => {
    const unsubscribe = getAllDoctorSchedules();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [getAllDoctorSchedules]);

  const providersWithSchedule = useMemo(() => {
    return patients.filter(p => p.role === 'doctor' || p.role === 'midwife/nurse');
  }, [patients]);

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

  const isLoading = patientsLoading || allDoctorSchedulesLoading;

  if (isLoading && providersWithSchedule.length === 0 && allDoctorSchedules.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading provider schedules...</p>
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
          <BriefcaseMedical className="mr-3 h-8 w-8 text-primary" /> Manage Provider Schedules
        </h1>
      </div>
      <p className="text-muted-foreground">
        View the availability schedules for all doctors and midwives/nurses.
      </p>

      {providersWithSchedule.length === 0 && !isLoading ? (
        <Alert>
          <UserCircle className="h-4 w-4" />
          <AlertTitle>No Providers Found</AlertTitle>
          <AlertDescription>There are no doctors or midwives/nurses in the system to display schedules for.</AlertDescription>
        </Alert>
      ) : allDoctorSchedules.length === 0 && !isLoading && providersWithSchedule.length > 0 ? (
         <Alert>
          <CalendarDays className="h-4 w-4" />
          <AlertTitle>No Schedules Configured</AlertTitle>
          <AlertDescription>None of the providers have configured their schedules yet.</AlertDescription>
        </Alert>
      ) : (
        <Accordion type="multiple" className="w-full space-y-4">
          {providersWithSchedule.map((provider) => {
            const schedule = allDoctorSchedules.find(s => s.doctorId === provider.id);
            return (
              <AccordionItem value={provider.id} key={provider.id} className="border rounded-lg shadow-sm bg-card">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center space-x-3">
                    <UserCircle className="h-6 w-6 text-primary" />
                    <span className="text-lg font-semibold">{provider.name}</span>
                    <Badge variant="outline">{provider.role === 'midwife/nurse' ? 'Midwife/Nurse' : 'Doctor'}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 space-y-4">
                  {!schedule ? (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>No Schedule Found</AlertTitle>
                      <AlertDescription>This provider has not configured their schedule yet.</AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <p><strong>Default Slot Duration:</strong> {schedule.defaultSlotDurationMinutes} minutes</p>
                        <p><strong>Booking Notice Period:</strong> {schedule.noticePeriodHours || 'N/A'} hours</p>
                      </div>
                      <Separator className="my-3" />
                      <h4 className="font-medium text-md mb-2">Weekly Working Hours:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {schedule.workingHours?.map((day: WorkingDay) => (
                          <Card key={day.dayOfWeek} className={`p-3 ${day.isEnabled ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'}`}>
                            <CardHeader className="p-0 pb-1">
                              <CardTitle className="text-sm font-semibold flex justify-between items-center">
                                {day.dayOfWeek}
                                <Badge variant={day.isEnabled ? 'default' : 'destructive'} className="text-xs">
                                  {day.isEnabled ? 'Enabled' : 'Disabled'}
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            {day.isEnabled && (
                              <CardContent className="p-0 text-xs space-y-0.5">
                                <p><Clock className="inline h-3 w-3 mr-1" /> {formatTime(day.startTime)} - {formatTime(day.endTime)}</p>
                                {/* TODO: Display break times if implemented */}
                              </CardContent>
                            )}
                          </Card>
                        ))}
                      </div>
                      {schedule.unavailableDates && schedule.unavailableDates.length > 0 && (
                        <>
                          <Separator className="my-3" />
                          <h4 className="font-medium text-md mb-1">Unavailable Dates:</h4>
                          <div className="flex flex-wrap gap-2">
                            {schedule.unavailableDates.map(dateStr => (
                              <Badge key={dateStr} variant="outline" className="text-xs">{dateStr}</Badge>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                   <div className="mt-4">
                      <Link href={`/doctor/my-schedule?doctorId=${provider.id}`} passHref legacyBehavior>
                        <a className="text-sm text-primary hover:underline">View/Edit Full Schedule &raquo;</a>
                      </Link>
                    </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
