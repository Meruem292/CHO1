
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth-hook";
import { useMockDb } from "@/hooks/use-mock-db"; // This now uses Firebase
import { Users, ClipboardList, Baby, HeartPulse, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Patient } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const { 
    patients, patientsLoading,
    consultations, consultationsLoading, getConsultationsByPatientId,
    maternityRecords, maternityRecordsLoading, getMaternityHistoryByPatientId,
    babyRecords, babyRecordsLoading, getBabyRecordsByMotherId
  } = useMockDb();

  const [myConsultationsCount, setMyConsultationsCount] = useState(0);
  const [myMaternityRecordsCount, setMyMaternityRecordsCount] = useState(0);
  const [myBabyRecordsCount, setMyBabyRecordsCount] = useState(0);
  
  const [isPatientDataLoading, setIsPatientDataLoading] = useState(true);

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
        setIsPatientDataLoading(false); // No specific patient data to load for admin/doctor on this dashboard view
    }
    
    return () => {
      if (unsubscribeConsultations) unsubscribeConsultations();
      if (unsubscribeMaternity) unsubscribeMaternity();
      if (unsubscribeBaby) unsubscribeBaby();
    };
  }, [user, getConsultationsByPatientId, getMaternityHistoryByPatientId, getBabyRecordsByMotherId]);

 useEffect(() => {
    if (user?.role === 'patient') {
        if (!consultationsLoading) setMyConsultationsCount(consultations.length);
        if (!maternityRecordsLoading) setMyMaternityRecordsCount(maternityRecords.length);
        if (!babyRecordsLoading) setMyBabyRecordsCount(babyRecords.length);
        
        if (!consultationsLoading && !maternityRecordsLoading && !babyRecordsLoading) {
            setIsPatientDataLoading(false);
        }
    }
  }, [user?.role, consultations, consultationsLoading, maternityRecords, maternityRecordsLoading, babyRecords, babyRecordsLoading]);


  const totalPatients = user?.role !== 'patient' ? patients.filter((p: Patient) => p.role === 'patient').length : 0;
  
  const isLoadingOverall = patientsLoading || (user?.role === 'patient' && isPatientDataLoading);

  const stats = user?.role === 'patient' ? [
    { title: "My Consultations", value: myConsultationsCount, icon: ClipboardList, href: `/patients/${user.id}/consultations`, loading: consultationsLoading },
    { title: "My Maternity Records", value: myMaternityRecordsCount, icon: Baby, href: `/patients/${user.id}/maternity-history`, loading: maternityRecordsLoading },
    { title: "My Baby's Records", value: myBabyRecordsCount, icon: HeartPulse, href: `/patients/${user.id}/baby-health`, loading: babyRecordsLoading },
  ] : [
    { title: "Total Patients", value: totalPatients, icon: Users, href: "/patients", loading: patientsLoading },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Welcome, {user?.name}!</h1>
      <p className="text-muted-foreground">
        This is your central hub for managing health records.
      </p>

      {isLoadingOverall && (
         <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading dashboard data...</p>
        </div>
      )}

      {!isLoadingOverall && (
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

      {user?.role !== 'patient' && !patientsLoading && (
         <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
                <Link href="/patients" className="text-primary hover:underline">View All Patients</Link>
                <Link href="/ai-suggestions" className="text-primary hover:underline">Get AI Health Suggestions</Link>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
