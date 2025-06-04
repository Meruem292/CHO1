
'use client';

import React, { useState, useMemo, useEffect, use } from 'react';
import type { ConsultationRecord, Patient, Appointment } from '@/types';
import { useMockDb } from '@/hooks/use-mock-db';
import { useAuth } from '@/hooks/use-auth-hook';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, PlusCircle, Trash2, Edit, ChevronLeft, Loader2, ClipboardList, AlertTriangle, ShieldAlert } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ConsultationForm } from '@/components/forms/consultation-form';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { database } from '@/lib/firebase-config';
import { ref as dbRef, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { parseISO } from 'date-fns';

const PH_TIMEZONE = 'Asia/Manila';

function formatInPHTime_PPP(date: Date | string): string {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, year: 'numeric', month: 'short', day: 'numeric' }).format(d);
  } catch(e) {
    return 'Invalid Date';
  }
}

const snapshotToArray = <T extends { id: string }>(snapshot: any): T[] => {
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  if (data === null || typeof data !== 'object') return [];
  return Object.keys(data).map(key => ({ ...data[key], id: key } as T));
};

interface ResolvedPageParams {
  patientId: string;
}

interface ConsultationsPageProps {
  params: Promise<ResolvedPageParams>;
}

export default function PatientConsultationsPage({ params: paramsPromise }: ConsultationsPageProps) {
  const actualParams = use(paramsPromise);
  const { patientId } = actualParams;

  const { user } = useAuth();
  const {
    consultations,
    consultationsLoading,
    getConsultationsByPatientId,
    addConsultation,
    updateConsultation,
    deleteConsultation
  } = useMockDb();

  const [patient, setPatient] = useState<Patient | undefined>(undefined);
  const [patientLoading, setPatientLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConsultation, setEditingConsultation] = useState<ConsultationRecord | undefined>(undefined);
  const [consultationToDelete, setConsultationToDelete] = useState<ConsultationRecord | null>(null);
  
  const [hasAccess, setHasAccess] = useState(false);
  const [isAccessChecking, setIsAccessChecking] = useState(true);

  useEffect(() => {
    if (patientId) {
      setPatientLoading(true);
      const patientRecordRef = dbRef(database, `patients/${patientId}`);
      const unsubscribePatient = onValue(patientRecordRef, (snapshot) => {
        if (snapshot.exists()) {
          setPatient({ id: snapshot.key!, ...snapshot.val() } as Patient);
        } else {
          setPatient(undefined);
        }
        setPatientLoading(false);
      }, (error) => {
        console.error("Error fetching patient data:", error);
        setPatient(undefined);
        setPatientLoading(false);
      });

      const unsubscribeConsultations = getConsultationsByPatientId(patientId);

      return () => {
        unsubscribePatient();
        if (unsubscribeConsultations) unsubscribeConsultations();
      };
    }
  }, [patientId, getConsultationsByPatientId]);

  useEffect(() => {
    let unsubAppointments: (() => void) | undefined;
    if (!user || !patientId) {
      setIsAccessChecking(false);
      setHasAccess(false);
      return;
    }

    if (user.role === 'admin') {
      setHasAccess(true);
      setIsAccessChecking(false);
    } else if (user.role === 'patient') {
      setHasAccess(user.id === patientId);
      setIsAccessChecking(false);
    } else if (user.role === 'doctor') {
      setIsAccessChecking(true);
      const doctorAppointmentsQuery = query(dbRef(database, 'appointments'), orderByChild('doctorId'), equalTo(user.id));
      unsubAppointments = onValue(doctorAppointmentsQuery, (snapshot) => {
        const appointments = snapshotToArray<Appointment>(snapshot);
        const foundAppointment = appointments.some(app => app.patientId === patientId);
        setHasAccess(foundAppointment);
        setIsAccessChecking(false);
      }, (error) => {
        console.error("Error checking doctor-patient relationship:", error);
        setHasAccess(false);
        setIsAccessChecking(false);
      });
    } else {
        setIsAccessChecking(false);
        setHasAccess(false);
    }
    return () => {
      if (unsubAppointments) unsubAppointments();
    };
  }, [user, patientId]);


  const handleFormSubmit = async (data: Omit<ConsultationRecord, 'id' | 'patientId'>) => {
    const consultationData = { ...data, patientId };
    try {
      if (editingConsultation) {
        await updateConsultation(editingConsultation.id, consultationData);
        toast({ title: "Consultation Updated", description: `Record for ${formatInPHTime_PPP(data.date)} updated.` });
      } else {
        await addConsultation(consultationData);
        toast({ title: "Consultation Added", description: `New record for ${formatInPHTime_PPP(data.date)} added.` });
      }
      setIsFormOpen(false);
      setEditingConsultation(undefined);
    } catch (error) {
      console.error("Error submitting consultation form:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save consultation." });
    }
  };

  const openEditForm = (consultation: ConsultationRecord) => {
    setEditingConsultation(consultation);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (consultationToDelete) {
      try {
        await deleteConsultation(consultationToDelete.id);
        toast({ title: "Consultation Deleted", description: `Record from ${consultationToDelete.date ? formatInPHTime_PPP(consultationToDelete.date) : 'this record'} deleted.` });
        setConsultationToDelete(null);
      } catch (error) {
        console.error("Error deleting consultation:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete consultation." });
      }
    }
  };

  const columns: ColumnDef<ConsultationRecord>[] = useMemo(() => [
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const dateVal = row.getValue("date") as string;
        return dateVal ? formatInPHTime_PPP(dateVal) : 'N/A';
      }
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ row }) => <p className="truncate max-w-xs">{row.getValue("notes")?.toString() || 'N/A'}</p>,
    },
    {
      accessorKey: 'diagnosis',
      header: 'Diagnosis',
      cell: ({ row }) => row.getValue("diagnosis")?.toString() || 'N/A',
    },
    {
      accessorKey: 'treatmentPlan',
      header: 'Treatment Plan',
       cell: ({ row }) => <p className="truncate max-w-xs">{row.getValue("treatmentPlan")?.toString() || 'N/A'}</p>,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const consultation = row.original;
        if (user?.role === 'patient') return null; // Patients cannot edit/delete

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openEditForm(consultation)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setConsultationToDelete(consultation)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [user?.role, openEditForm, setConsultationToDelete]);

  if (patientLoading || isAccessChecking) {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading patient data and verifying access...</p>
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
          <AlertDescription>You do not have permission to view these records.</AlertDescription>
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
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Patient Not Found</AlertTitle>
          <AlertDescription>
            The patient with ID '{patientId}' could not be found. They may have been removed or the ID is incorrect.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href={user?.role === 'patient' ? "/dashboard" : "/patients"} className="flex items-center text-sm text-primary hover:underline mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to {user?.role === 'patient' ? "Dashboard" : "Patients List"}
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Consultations for {patient.name}</h1>
        {(user?.role === 'admin' || user?.role === 'doctor') && (
          <Button onClick={() => { setEditingConsultation(undefined); setIsFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Consultation
          </Button>
        )}
      </div>

      {consultationsLoading && consultations.length === 0 ? (
        <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="ml-2">Loading consultations...</p>
        </div>
      ) : !consultationsLoading && consultations.length === 0 ? (
         <Alert>
            <ClipboardList className="h-4 w-4" />
            <AlertTitle>No Consultation Records</AlertTitle>
            <AlertDescription>
                There are no consultation records available for {patient.name} yet.
                {(user?.role === 'admin' || user?.role === 'doctor') && " You can add a new one."}
            </AlertDescription>
        </Alert>
      ) : (
        <DataTable
            columns={columns}
            data={consultations}
            filterColumnId="date" 
            filterPlaceholder="Filter by notes or diagnosis..."
        />
      )}


      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingConsultation ? 'Edit Consultation' : 'Add New Consultation'}</DialogTitle>
            <DialogDescription>
              Manage consultation records for {patient.name}.
            </DialogDescription>
          </DialogHeader>
          <ConsultationForm
            consultation={editingConsultation}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

       {consultationToDelete && (
        <AlertDialog open={!!consultationToDelete} onOpenChange={() => setConsultationToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the consultation record from {consultationToDelete.date ? formatInPHTime_PPP(consultationToDelete.date) : 'this record'}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConsultationToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

    