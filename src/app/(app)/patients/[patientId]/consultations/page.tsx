
'use client';

import React, { useState, useMemo, useEffect, use } from 'react';
import type { ConsultationRecord, Patient, Appointment } from '@/types';
import { useMockDb } from '@/hooks/use-mock-db';
import { useAuth } from '@/hooks/use-auth-hook';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, PlusCircle, Trash2, Edit, Loader2, ClipboardList, AlertTriangle, UserMdIcon, Stethoscope, Archive, MessageSquarePlus } from 'lucide-react';
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
import { PatientConsultationForm } from '@/components/forms/patient-consultation-form';
import { toast } from '@/hooks/use-toast';
import { parseISO } from 'date-fns';
import { database } from '@/lib/firebase-config';
import { ref as dbRef, onValue } from 'firebase/database';
import Link from 'next/link';


const PH_TIMEZONE = 'Asia/Manila';

function formatInPHTime_PPP(date: Date | string | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, year: 'numeric', month: 'short', day: 'numeric' }).format(d);
  } catch(e) {
    return 'Invalid Date';
  }
}

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
  
  const [patientName, setPatientName] = useState<string>(''); 
  const [isDoctorFormOpen, setIsDoctorFormOpen] = useState(false);
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  const [editingConsultation, setEditingConsultation] = useState<ConsultationRecord | undefined>(undefined);
  const [consultationToArchive, setConsultationToArchive] = useState<ConsultationRecord | null>(null);
  
  useEffect(() => {
    const patientRecordRef = dbRef(database, `patients/${patientId}/name`);
    const unsubName = onValue(patientRecordRef, (snapshot) => {
        setPatientName(snapshot.val() || 'Patient');
    });
    const unsubscribeConsultations = getConsultationsByPatientId(patientId);
    return () => {
        unsubName();
        if (unsubscribeConsultations) unsubscribeConsultations();
    };
  }, [patientId, getConsultationsByPatientId]);

  const handlePatientFormSubmit = async (data: { date: string; notes: string; }) => {
    if (user?.role !== 'patient' || user.id !== patientId) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'You can only add notes to your own record.' });
      return;
    }
    const consultationPayload: Omit<ConsultationRecord, 'id'> = {
      ...data,
      patientId: user.id,
      doctorName: "Patient Entry", // Special designation for patient entries
      subjectType: 'mother', // Patient can only submit notes for themselves for now.
    };

    try {
      await addConsultation(consultationPayload);
      toast({ title: "Health Notes Added", description: "Your notes have been saved to your record." });
      setIsPatientFormOpen(false);
    } catch (error) {
       console.error("Error submitting patient consultation form:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save your notes." });
    }
  };

  const handleDoctorFormSubmit = async (data: Omit<ConsultationRecord, 'id' | 'patientId' | 'doctorId' | 'doctorName'>) => {
    if (user?.role !== 'doctor') {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only doctors can add or edit consultations.' });
      return;
    }
    
    const consultationBaseData = { ...data, patientId };
    let fullConsultationData: Omit<ConsultationRecord, 'id'> = { ...consultationBaseData };

    if (user && user.role === 'doctor') {
      fullConsultationData = {
        ...fullConsultationData,
        doctorId: user.id,
        doctorName: user.name,
      };
    }
    
    try {
      if (editingConsultation) {
        await updateConsultation(editingConsultation.id, fullConsultationData);
        toast({ title: "Consultation Updated", description: `Record for ${formatInPHTime_PPP(data.date)} updated.` });
      } else {
        await addConsultation(fullConsultationData);
        toast({ title: "Consultation Added", description: `New record for ${formatInPHTime_PPP(data.date)} added.` });
      }
      setIsDoctorFormOpen(false);
      setEditingConsultation(undefined);
    } catch (error) {
      console.error("Error submitting consultation form:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save consultation." });
    }
  };

  const openEditForm = (consultation: ConsultationRecord) => {
    setEditingConsultation(consultation);
    setIsDoctorFormOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (consultationToArchive) {
      if (user?.role !== 'doctor' && user?.role !== 'admin') {
         toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only doctors or admins can archive consultations.' });
         setConsultationToArchive(null);
        return;
      }
      try {
        await deleteConsultation(consultationToArchive.id);
        toast({ title: "Consultation Archived", description: `Record from ${consultationToArchive.date ? formatInPHTime_PPP(consultationToArchive.date) : 'this record'} archived.` });
        setConsultationToArchive(null);
      } catch (error) {
        console.error("Error archiving consultation:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to archive consultation." });
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
        const dateVal = row.getValue("date") as string | undefined;
        return dateVal ? formatInPHTime_PPP(dateVal) : 'N/A';
      }
    },
    {
      accessorKey: 'doctorName',
      header: 'Recorded By',
      cell: ({ row }) => {
        const recordedBy = row.original.doctorName || 'N/A';
        const isPatientEntry = recordedBy === 'Patient Entry';
        return (
          <span className={isPatientEntry ? 'italic text-muted-foreground' : ''}>
            {recordedBy}
          </span>
        );
      },
    },
    {
      accessorKey: 'notes',
      header: 'Patient Concern',
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
        const isPatientEntry = consultation.doctorName === "Patient Entry";
        const canEditOwn = user?.role === 'doctor' && user.id === consultation.doctorId;
        const canRespondToPatient = user?.role === 'doctor' && isPatientEntry;
        const canArchive = user?.role === 'admin' || canEditOwn;

        if (!canArchive && !canEditOwn && !canRespondToPatient) return null;

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
              {canRespondToPatient && (
                <Link href={`/patients/${patientId}/consultations/${consultation.id}/respond`} passHref>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <MessageSquarePlus className="mr-2 h-4 w-4" /> Respond
                  </DropdownMenuItem>
                </Link>
              )}
               {canEditOwn && (
                <DropdownMenuItem onClick={() => openEditForm(consultation)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {canArchive && (canEditOwn || canRespondToPatient) && <DropdownMenuSeparator />}
              {canArchive && (
                <DropdownMenuItem onClick={() => setConsultationToArchive(consultation)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <Archive className="mr-2 h-4 w-4" /> Archive
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [user?.role, user?.id, openEditForm, setConsultationToArchive, patientId]);


  if (user?.role === 'midwife/nurse') {
    return (
       <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You do not have permission to manage consultation records. This section is for Doctors only.
        </AlertDescription>
      </Alert>
    );
  }


  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Consultation History</h2>
        {user?.role === 'doctor' && (
          <Button onClick={() => { setEditingConsultation(undefined); setIsDoctorFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Consultation
          </Button>
        )}
        {user?.role === 'patient' && user.id === patientId && (
          <Button onClick={() => setIsPatientFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add My Health Notes
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
                There are no consultation records available for {patientName} yet.
                {(user?.role === 'doctor' || (user?.role === 'patient' && user.id === patientId)) && " You can add a new one."}
            </AlertDescription>
        </Alert>
      ) : (
        <DataTable
            columns={columns}
            data={consultations}
            filterColumnId="doctorName" 
            filterPlaceholder="Filter by recorded by, notes..."
        />
      )}

      {/* Dialog for Doctor's Form (for NEW consultations) */}
      <Dialog open={isDoctorFormOpen} onOpenChange={setIsDoctorFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
                {editingConsultation 
                    ? 'Edit Consultation' 
                    : 'Add New Consultation'}
            </DialogTitle>
            <DialogDescription>
              Manage consultation records for {patientName}.
              {user?.role === 'doctor' && !editingConsultation && ` This record will be attributed to you, Dr. ${user.name}.`}
            </DialogDescription>
          </DialogHeader>
          <ConsultationForm
            consultation={editingConsultation}
            onSubmit={handleDoctorFormSubmit}
            onCancel={() => setIsDoctorFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Dialog for Patient's Form */}
      <Dialog open={isPatientFormOpen} onOpenChange={setIsPatientFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Your Health Notes</DialogTitle>
            <DialogDescription>
              Describe your symptoms or concerns. This will be saved to your health record for your doctor to review.
            </DialogDescription>
          </DialogHeader>
          <PatientConsultationForm
            onSubmit={handlePatientFormSubmit}
            onCancel={() => setIsPatientFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

       {consultationToArchive && (
        <AlertDialog open={!!consultationToArchive} onOpenChange={() => setConsultationToArchive(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will archive the consultation record from {consultationToArchive.date ? formatInPHTime_PPP(consultationToArchive.date) : 'this record'}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConsultationToArchive(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchiveConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Archive</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
