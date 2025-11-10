
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth-hook";
import { useMockDb } from "@/hooks/use-mock-db";
import { Users, ClipboardList, Baby, HeartPulse, Loader2, Stethoscope } from "lucide-react";
import Link from "next/link";
import type { Patient } from '@/types';
import { AdminDashboard } from '@/components/admin-dashboard'; // New component for admin

export default function DashboardPage() {
  const { user } = useAuth();
  const { 
    patients, patientsLoading,
    consultations, consultationsLoading, getConsultationsByPatientId,
    maternityRecords, maternityRecordsLoading, getMaternityHistoryByPatientId,
    babyRecords: patientBabyRecords, babyRecordsLoading: patientBabyRecordsLoading, getBabyRecordsByMotherId, // Renamed for clarity
    allAppointmentsForAdmin, getAllAppointments, allAppointmentsLoading, // For Admin
    // Note: We are not fetching *all* baby records for the admin dashboard in this iteration due to complexity.
    // The "Born Kids" stat would require a new global fetch in useMockDb or backend aggregation.
  } = useMockDb();

  // States for patient-specific data (if user is patient)
  const [myConsultationsCount, setMyConsultationsCount] = useState(0);
  const [myMaternityRecordsCount, setMyMaternityRecordsCount] = useState(0);
  const [myBabyRecordsCount, setMyBabyRecordsCount] = useState(0);
  const [isPatientDataLoading, setIsPatientDataLoading] = useState(true);

  // Effect for admin data fetching
  useEffect(() => {
    if (user?.role === 'admin') {
      const unsubAppointments = getAllAppointments();
      // Patients are already fetched globally by useMockDb
      // No need to fetch babyRecords globally here as we're omitting that stat for now.
      return () => {
        if (unsubAppointments) unsubAppointments();
      };
    }
  }, [user?.role, getAllAppointments]);
  
  // Effect for patient-specific data fetching
  useEffect(() => {
    let unsubscribeConsultations: (() => void) | undefined;
    let unsubscribeMaternity: (() => void) | undefined;
    let unsubscribeBaby: (() => void) | undefined;

    if (user?.role === 'patient' && user.id) {
      setIsPatientDataLoading(true);
      unsubscribeConsultations = getConsultationsByPatientId(user.id);
      unsubscribeMaternity = getMaternityHistoryByPatientId(user.id);
      unsubscribeBaby = getBabyRecordsByMotherId(user.id);
    } else {
        setIsPatientDataLoading(false); 
    }
    
    return () => {
      if (unsubscribeConsultations) unsubscribeConsultations();
      if (unsubscribeMaternity) unsubscribeMaternity();
      if (unsubscribeBaby) unsubscribeBaby();
    };
  }, [user, getConsultationsByPatientId, getMaternityHistoryByPatientId, getBabyRecordsByMotherId]);

  // Effect for updating patient-specific counts
 useEffect(() => {
    if (user?.role === 'patient') {
        if (!consultationsLoading) setMyConsultationsCount(consultations.length);
        if (!maternityRecordsLoading) setMyMaternityRecordsCount(maternityRecords.length);
        if (!patientBabyRecordsLoading) setMyBabyRecordsCount(patientBabyRecords.length);
        
        if (!consultationsLoading && !maternityRecordsLoading && !patientBabyRecordsLoading) {
            setIsPatientDataLoading(false);
        }
    }
  }, [user?.role, consultations, consultationsLoading, maternityRecords, maternityRecordsLoading, patientBabyRecords, patientBabyRecordsLoading]);

  // Overall loading state
  const isLoadingOverall = user?.role === 'admin'
    ? patientsLoading || allAppointmentsLoading 
    : (user?.role === 'patient' ? (patientsLoading || isPatientDataLoading) : patientsLoading);


  if (isLoadingOverall && user) { // Show loader only if user is determined
     return (
       <div className="flex flex-col items-center justify-center h-screen space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }
  
  if (!user) { // Should be handled by layout, but as a fallback
     return (
       <div className="flex flex-col items-center justify-center h-screen space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Initializing...</p>
      </div>
    );
  }

  // Admin Dashboard
  if (user.role === 'admin') {
    return (
       <div className="space-y-6">
         <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
         <AdminDashboard 
            allPatients={patients} 
            allAppointments={allAppointmentsForAdmin} 
            isLoading={patientsLoading || allAppointmentsLoading}
         />
       </div>
    );
  }

  // Patient/Doctor/Midwife Dashboard
  const isProvider = user.role === 'doctor' || user.role === 'midwife/nurse';
  const totalPatientsInSystem = patients.filter((p: Patient) => p.role === 'patient').length; 
  
  const stats = user.role === 'patient' ? [
    { title: "My Consultations", value: myConsultationsCount, icon: ClipboardList, href: `/patients/${user.id}/consultations`, loading: consultationsLoading },
    { title: "My Maternity Records", value: myMaternityRecordsCount, icon: Baby, href: `/patients/${user.id}/maternity-history`, loading: maternityRecordsLoading },
    { title: "My Baby's Records", value: myBabyRecordsCount, icon: HeartPulse, href: `/patients/${user.id}/baby-health`, loading: patientBabyRecordsLoading },
  ] : isProvider ? [
    { title: "Total Patients in System", value: totalPatientsInSystem, icon: Users, href: "/patients", loading: patientsLoading },
    // More provider-specific stats could be added here if needed
  ] : [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Welcome, {user.name}!</h1>
      <p className="text-muted-foreground">
        This is your central hub for managing health records.
      </p>

      {stats.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
            <Link href={stat.href} key={stat.title}>
                <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                    {stat.title}
                    </CardTitle>
                    <stat.icon className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {stat.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{stat.value}</div>}
                </CardContent>
                </Card>
            </Link>
            ))}
        </div>
      )}

      {user.role !== 'admin' && ( // Quick actions for non-admins
         <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
                {user.role === 'patient' && <Link href="/patient/book-appointment" className="text-primary hover:underline">Book New Appointment</Link>}
                {isProvider && <Link href="/patients" className="text-primary hover:underline">View My Associated Patients</Link>}
                {isProvider && <Link href="/doctor/my-schedule" className="text-primary hover:underline">Manage My Schedule</Link>}
                {isProvider && <Link href={`/users/${user.id}/appointments`} className="text-primary hover:underline">View My Appointments</Link>}
                {user.role === 'patient' && <Link href={`/users/${user.id}/appointments`} className="text-primary hover:underline">View My Appointments</Link>}
            </CardContent>
        </Card>
      )}
    </div>
  );
}
