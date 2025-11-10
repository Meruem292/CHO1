
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Patient, ConsultationRecord, MaternityRecord, BabyRecord } from '@/types';
import { useMockDb } from '@/hooks/use-mock-db';
import { useAuth } from '@/hooks/use-auth-hook';
import Link from 'next/link';
import { ChevronLeft, ShieldAlert, Loader2, User, ClipboardList, Baby, HeartPulse, Archive, History, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from '@/hooks/use-toast';

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

type ArchiveDataType = 'patients' | 'consultations' | 'maternityRecords' | 'babyRecords';

export default function ArchivePage() {
  const { user } = useAuth();
  const {
    archivedPatients, archivedPatientsLoading,
    archivedConsultations, archivedConsultationsLoading,
    archivedMaternityRecords, archivedMaternityRecordsLoading,
    archivedBabyRecords, archivedBabyRecordsLoading,
    getArchivedData,
    restoreArchivedRecord,
    permanentlyDeleteRecord,
  } = useMockDb();

  const [activeTab, setActiveTab] = useState<ArchiveDataType>('patients');
  const [recordToRestore, setRecordToRestore] = useState<{ type: ArchiveDataType; id: string; name: string } | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<{ type: ArchiveDataType; id: string; name: string } | null>(null);


  useEffect(() => {
    if (user?.role === 'admin') {
      const unsub = getArchivedData(activeTab);
      return () => unsub();
    }
  }, [user, activeTab, getArchivedData]);

  const handleRestore = async () => {
    if (!recordToRestore) return;
    try {
      await restoreArchivedRecord(recordToRestore.type, recordToRestore.id);
      toast({ title: 'Record Restored', description: `${recordToRestore.name} has been restored.` });
      setRecordToRestore(null);
    } catch (error) {
      console.error("Error restoring record:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to restore record.' });
    }
  };

  const handlePermanentDelete = async () => {
    if (!recordToDelete) return;
    try {
      await permanentlyDeleteRecord(recordToDelete.type, recordToDelete.id);
      toast({ title: 'Record Permanently Deleted', description: `${recordToDelete.name} has been permanently deleted.` });
      setRecordToDelete(null);
    } catch (error) {
      console.error("Error deleting record:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to permanently delete record.' });
    }
  };
  
  const getActionsCell = (type: ArchiveDataType, nameAccessor: (row: any) => string) => ({
      id: 'actions',
      cell: ({ row }: { row: { original: any } }) => (
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => setRecordToRestore({ type, id: row.original.id, name: nameAccessor(row.original) })}>
            <History className="mr-2 h-4 w-4" /> Restore
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setRecordToDelete({ type, id: row.original.id, name: nameAccessor(row.original) })}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
          </Button>
        </div>
      ),
  });

  const patientColumns: ColumnDef<Patient>[] = useMemo(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'role', header: 'Role' },
    getActionsCell('patients', (row) => row.name),
  ], []);

  const consultationColumns: ColumnDef<ConsultationRecord>[] = useMemo(() => [
    { accessorKey: 'patientName', header: 'Patient' },
    { accessorKey: 'doctorName', header: 'Doctor' },
    { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatInPHTime_PPP(row.original.date) },
    getActionsCell('consultations', (row) => `Consultation for ${row.patientName}`),
  ], []);

  const maternityColumns: ColumnDef<MaternityRecord>[] = useMemo(() => [
    { accessorKey: 'patientName', header: 'Patient' },
    { accessorKey: 'pregnancyNumber', header: 'Pregnancy #' },
    { accessorKey: 'deliveryDate', header: 'Delivery Date', cell: ({ row }) => formatInPHTime_PPP(row.original.deliveryDate) },
    getActionsCell('maternityRecords', (row) => `Pregnancy #${row.pregnancyNumber} for ${row.patientName}`),
  ], []);

  const babyColumns: ColumnDef<BabyRecord>[] = useMemo(() => [
    { accessorKey: 'name', header: 'Baby Name' },
    { accessorKey: 'motherName', header: 'Mother' },
    { accessorKey: 'birthDate', header: 'Birth Date', cell: ({ row }) => formatInPHTime_PPP(row.original.birthDate) },
    getActionsCell('babyRecords', (row) => row.name || `Baby of ${row.motherName}`),
  ], []);


  if (!user || user.role !== 'admin') {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You do not have permission to view this page.</AlertDescription>
        </Alert>
        <Link href="/dashboard" className="text-primary hover:underline">Go to Dashboard</Link>
      </div>
    );
  }

  const isLoading = archivedPatientsLoading || archivedConsultationsLoading || archivedMaternityRecordsLoading || archivedBabyRecordsLoading;
  
  return (
     <div className="space-y-6">
      <Link href="/dashboard" className="flex items-center text-sm text-primary hover:underline mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <Archive className="mr-3 h-8 w-8 text-primary" /> Archived Data
        </h1>
      </div>
      <p className="text-muted-foreground">
        View and manage archived records. Records can be restored to their original location or permanently deleted.
      </p>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ArchiveDataType)} className="w-full">
        <TabsList>
          <TabsTrigger value="patients"><User className="mr-2 h-4 w-4" /> Patients</TabsTrigger>
          <TabsTrigger value="consultations"><ClipboardList className="mr-2 h-4 w-4" /> Consultations</TabsTrigger>
          <TabsTrigger value="maternityRecords"><Baby className="mr-2 h-4 w-4" /> Maternity</TabsTrigger>
          <TabsTrigger value="babyRecords"><HeartPulse className="mr-2 h-4 w-4" /> Baby Records</TabsTrigger>
        </TabsList>
        <TabsContent value="patients" className="mt-4">
          {archivedPatientsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
            archivedPatients.length > 0 ? <DataTable columns={patientColumns} data={archivedPatients} filterColumnId="name" filterPlaceholder="Filter by name..." /> : <NoDataAlert type="patients" />
          )}
        </TabsContent>
        <TabsContent value="consultations" className="mt-4">
            {archivedConsultationsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
            archivedConsultations.length > 0 ? <DataTable columns={consultationColumns} data={archivedConsultations} filterColumnId="patientName" filterPlaceholder="Filter by patient..." /> : <NoDataAlert type="consultations" />
          )}
        </TabsContent>
        <TabsContent value="maternityRecords" className="mt-4">
             {archivedMaternityRecordsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
            archivedMaternityRecords.length > 0 ? <DataTable columns={maternityColumns} data={archivedMaternityRecords} filterColumnId="patientName" filterPlaceholder="Filter by patient..." /> : <NoDataAlert type="maternity records" />
          )}
        </TabsContent>
        <TabsContent value="babyRecords" className="mt-4">
            {archivedBabyRecordsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
            archivedBabyRecords.length > 0 ? <DataTable columns={babyColumns} data={archivedBabyRecords} filterColumnId="name" filterPlaceholder="Filter by name..." /> : <NoDataAlert type="baby records" />
          )}
        </TabsContent>
      </Tabs>
      
      {recordToRestore && (
        <AlertDialog open={!!recordToRestore} onOpenChange={() => setRecordToRestore(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restore Record?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to restore the record for "{recordToRestore.name}"? This will make it active in the application again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRestore}>Restore</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {recordToDelete && (
        <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently Delete Record?</AlertDialogTitle>
              <AlertDialogDescription>
                This action is irreversible. Are you sure you want to permanently delete the record for "{recordToDelete.name}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePermanentDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete Permanently</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function NoDataAlert({ type }: { type: string }) {
    return (
        <Alert>
            <Archive className="h-4 w-4" />
            <AlertTitle>No Archived Data</AlertTitle>
            <AlertDescription>
                There are no archived {type} to display.
            </AlertDescription>
        </Alert>
    );
}

