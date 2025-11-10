

'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth-hook';
import type { Patient, Appointment } from '@/types';
import { database } from '@/lib/firebase-config';
import { ref as dbRef, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, User, ClipboardList, Baby, HeartPulse, ShieldAlert, Loader2, TrendingUp } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface ResolvedPageParams {
  patientId: string;
}

interface PatientDetailLayoutProps {
  children: React.ReactNode;
  params: Promise<ResolvedPageParams>;
}

const snapshotToArray = <T extends { id: string }>(snapshot: any): T[] => {
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  if (data === null || typeof data !== 'object') return [];
  return Object.keys(data).map(key => ({ ...data[key], id: key } as T));
};

export default function PatientDetailLayout({ children, params: paramsPromise }: PatientDetailLayoutProps) {
  const actualParams = use(paramsPromise);
  const { patientId } = actualParams;
  const { user: currentUser } = useAuth();
  const pathname = usePathname();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!patientId || !currentUser) {
      setIsLoading(false);
      setHasAccess(false);
      return;
    }

    setIsLoading(true);
    const patientRecordRef = dbRef(database, `patients/${patientId}`);
    const unsubscribePatient = onValue(patientRecordRef, (snapshot) => {
      if (snapshot.exists()) {
        setPatient({ id: snapshot.key!, ...snapshot.val() } as Patient);
      } else {
        setPatient(null);
      }

      // Access check logic
      if (currentUser.role === 'admin' || (currentUser.role === 'patient' && currentUser.id === patientId)) {
        setHasAccess(true);
        setIsLoading(false);
      } else if (currentUser.role === 'doctor' || currentUser.role === 'midwife/nurse') {
        const doctorAppointmentsQuery = query(dbRef(database, 'appointments'), orderByChild('doctorId'), equalTo(currentUser.id));
        const unsubAppointments = onValue(doctorAppointmentsQuery, (appSnapshot) => {
          const appointments = snapshotToArray<Appointment>(appSnapshot);
          const foundAppointment = appointments.some(app => app.patientId === patientId);
          setHasAccess(foundAppointment);
          setIsLoading(false);
        }, (error) => {
          console.error("Error checking doctor-patient relationship:", error);
          setHasAccess(false);
          setIsLoading(false);
        });
        return () => unsubAppointments(); // Cleanup for appointments listener
      } else {
        setHasAccess(false);
        setIsLoading(false);
      }
    }, (error) => {
      console.error("Error fetching patient data for layout:", error);
      setPatient(null);
      setIsLoading(false);
    });

    return () => unsubscribePatient(); // Cleanup for patient listener
  }, [patientId, currentUser]);

  const getActiveTabValue = () => {
    if (pathname.endsWith('/profile')) return 'profile';
    if (pathname.endsWith('/bmi-history')) return 'bmi-history';
    if (pathname.endsWith('/consultations')) return 'consultations';
    if (pathname.endsWith('/maternity-history')) return 'maternity-history';
    if (pathname.endsWith('/baby-health')) return 'baby-health';
    return 'profile'; // Default
  };
  
  const activeTab = getActiveTabValue();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading patient details...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard" className="flex items-center text-sm text-primary hover:underline mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Link>
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You do not have permission to view this patient's records.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!patient) {
     return (
      <div className="space-y-6">
        <Link href="/patients" className="flex items-center text-sm text-primary hover:underline mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Patients List
        </Link>
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Patient Not Found</AlertTitle>
          <AlertDescription>
            The patient with ID '{patientId}' could not be found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const baseNavItems = [
    { value: 'profile', label: 'Patient Info', icon: User, href: `/patients/${patientId}/profile` },
    { value: 'bmi-history', label: 'BMI History', icon: TrendingUp, href: `/patients/${patientId}/bmi-history`, roles: ['admin', 'doctor', 'midwife/nurse', 'patient'] },
    { value: 'consultations', label: 'Consultations', icon: ClipboardList, href: `/patients/${patientId}/consultations`, roles: ['admin', 'doctor', 'patient'] },
    { value: 'maternity-history', label: 'Maternity History', icon: Baby, href: `/patients/${patientId}/maternity-history` },
    { value: 'baby-health', label: 'Baby Health', icon: HeartPulse, href: `/patients/${patientId}/baby-health` },
  ];

  const navItems = baseNavItems.filter(item => !item.roles || (currentUser && item.roles.includes(currentUser.role)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link href={currentUser?.role === 'patient' ? "/dashboard" : "/patients"} className="flex items-center text-sm text-primary hover:underline">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to {currentUser?.role === 'patient' ? "Dashboard" : (currentUser?.role === 'doctor' || currentUser?.role === 'midwife/nurse' ? "My Patients" : "Patients List")}
        </Link>
        <h1 className="text-2xl font-bold font-headline truncate">
          Patient Records: <span className="text-primary">{patient.name}</span>
        </h1>
        <div className="sm:min-w-[150px]"></div> {/* Spacer for alignment */}
      </div>


      <Tabs value={activeTab} className="w-full">
        <TabsList className={`grid w-full grid-cols-${navItems.length} mb-6`}>
          {navItems.map(item => (
            <TabsTrigger value={item.value} key={item.value} asChild>
              <Link href={item.href} className="flex items-center justify-center gap-2">
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
        
        {/* Children (page.tsx for profile, consultations, etc.) will be rendered here by Next.js routing */}
        {children}
      </Tabs>
    </div>
  );
}
