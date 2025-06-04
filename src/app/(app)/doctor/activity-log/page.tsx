
'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth-hook';
import { useMockDb } from '@/hooks/use-mock-db';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import type { ConsultationRecord, MaternityRecord, BabyRecord } from '@/types';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ChevronLeft, ClipboardList, Baby, HeartPulse, Eye, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { parseISO, format } from 'date-fns';

const PH_TIMEZONE = 'Asia/Manila';

function formatInPHTime_PPP(date: Date | string | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, year: 'numeric', month: 'short', day: 'numeric' }).format(d);
  } catch (e) {
    return 'Invalid Date';
  }
}

export default function DoctorActivityLogPage() {
  const { user } = useAuth();
  const {
    doctorActivityConsultations,
    doctorActivityMaternity,
    doctorActivityBaby,
    doctorActivityLoading,
    getConsultationsByDoctor,
    getMaternityRecordsByDoctor,
    getBabyRecordsByDoctor,
    patients // Used to look up patient names if not denormalized
  } = useMockDb();

  useEffect(() => {
    let unsubConsultations: (() => void) | undefined;
    let unsubMaternity: (() => void) | undefined;
    let unsubBaby: (() => void) | undefined;

    if (user?.role === 'doctor' && user.id) {
      unsubConsultations = getConsultationsByDoctor(user.id);
      unsubMaternity = getMaternityRecordsByDoctor(user.id);
      unsubBaby = getBabyRecordsByDoctor(user.id);
    }

    return () => {
      if (unsubConsultations) unsubConsultations();
      if (unsubMaternity) unsubMaternity();
      if (unsubBaby) unsubBaby();
    };
  }, [user, getConsultationsByDoctor, getMaternityRecordsByDoctor, getBabyRecordsByDoctor]);

  const consultationColumns: ColumnDef<ConsultationRecord>[] = useMemo(() => [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatInPHTime_PPP(row.original.date),
    },
    {
      accessorKey: 'patientName',
      header: 'Patient',
      cell: ({ row }) => row.original.patientName || patients.find(p => p.id === row.original.patientId)?.name || 'N/A',
    },
    {
      accessorKey: 'subjectType',
      header: 'Subject',
      cell: ({ row }) => {
        if (row.original.subjectType === 'baby') {
          return `Baby (${row.original.babyName || 'Unnamed'})`;
        }
        return 'Mother';
      },
    },
    {
      accessorKey: 'notes',
      header: 'Notes Preview',
      cell: ({ row }) => <p className="truncate max-w-xs">{row.original.notes}</p>,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Link href={`/patients/${row.original.patientId}/consultations`}>
          <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" /> View Record</Button>
        </Link>
      ),
    },
  ], [patients]);

  const maternityColumns: ColumnDef<MaternityRecord>[] = useMemo(() => [
    {
      accessorKey: 'pregnancyNumber',
      header: 'Pregnancy #',
    },
    {
      accessorKey: 'patientName',
      header: 'Patient',
       cell: ({ row }) => row.original.patientName || patients.find(p => p.id === row.original.patientId)?.name || 'N/A',
    },
    {
      accessorKey: 'deliveryDate',
      header: 'Delivery Date',
      cell: ({ row }) => formatInPHTime_PPP(row.original.deliveryDate),
    },
    {
      accessorKey: 'outcome',
      header: 'Outcome',
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Link href={`/patients/${row.original.patientId}/maternity-history`}>
          <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" /> View Record</Button>
        </Link>
      ),
    },
  ], [patients]);

  const babyColumns: ColumnDef<BabyRecord>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: "Baby's Name",
      cell: ({ row }) => row.original.name || 'Unnamed Baby',
    },
    {
      accessorKey: 'motherName',
      header: 'Mother',
      cell: ({ row }) => row.original.motherName || patients.find(p => p.id === row.original.motherId)?.name || 'N/A',
    },
    {
      accessorKey: 'birthDate',
      header: 'Birth Date',
      cell: ({ row }) => formatInPHTime_PPP(row.original.birthDate),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Link href={`/patients/${row.original.motherId}/baby-health`}>
          <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" /> View Record</Button>
        </Link>
      ),
    },
  ], [patients]);

  if (doctorActivityLoading && !doctorActivityConsultations.length && !doctorActivityMaternity.length && !doctorActivityBaby.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading your activity log...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="flex items-center text-sm text-primary hover:underline mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold font-headline flex items-center">
        <History className="mr-3 h-8 w-8 text-primary" /> My Activity Log
      </h1>
      <p className="text-muted-foreground">
        A history of consultations, maternity records, and baby health records you have created or managed.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><ClipboardList className="mr-2 h-5 w-5 text-blue-500" />Consultations Logged</CardTitle>
        </CardHeader>
        <CardContent>
          {doctorActivityConsultations.length > 0 ? (
            <DataTable columns={consultationColumns} data={doctorActivityConsultations} filterColumnId="patientName" filterPlaceholder="Filter by patient..."/>
          ) : (
            <Alert>
              <ClipboardList className="h-4 w-4" />
              <AlertTitle>No Consultations Logged</AlertTitle>
              <AlertDescription>You have not logged any consultations yet.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Baby className="mr-2 h-5 w-5 text-pink-500" />Maternity Records Logged</CardTitle>
        </CardHeader>
        <CardContent>
          {doctorActivityMaternity.length > 0 ? (
            <DataTable columns={maternityColumns} data={doctorActivityMaternity} filterColumnId="patientName" filterPlaceholder="Filter by patient..."/>
          ) : (
            <Alert>
              <Baby className="h-4 w-4" />
              <AlertTitle>No Maternity Records Logged</AlertTitle>
              <AlertDescription>You have not logged any maternity records yet.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><HeartPulse className="mr-2 h-5 w-5 text-red-500" />Baby Health Records Logged</CardTitle>
        </CardHeader>
        <CardContent>
          {doctorActivityBaby.length > 0 ? (
            <DataTable columns={babyColumns} data={doctorActivityBaby} filterColumnId="motherName" filterPlaceholder="Filter by mother or baby name..."/>
          ) : (
            <Alert>
              <HeartPulse className="h-4 w-4" />
              <AlertTitle>No Baby Health Records Logged</AlertTitle>
              <AlertDescription>You have not logged any baby health records yet.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

