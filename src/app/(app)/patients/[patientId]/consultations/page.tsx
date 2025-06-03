
'use client';

import React, { useState, useMemo, useEffect, use } from 'react'; // Import `use`
import type { ConsultationRecord, Patient } from '@/types';
import { useMockDb } from '@/hooks/use-mock-db';
import { useAuth } from '@/hooks/use-auth-hook';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, PlusCircle, Trash2, Edit, ChevronLeft, Loader2 } from 'lucide-react';
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
import { ConsultationForm } from '@/components/forms/consultation-form';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

interface ResolvedPageParams {
  patientId: string;
}

interface ConsultationsPageProps {
  params: Promise<ResolvedPageParams>; // params is a Promise
}

export default function PatientConsultationsPage({ params: paramsPromise }: ConsultationsPageProps) {
  const actualParams = use(paramsPromise); // Unwrap the Promise
  const { patientId } = actualParams; // Destructure from resolved params

  const { user } = useAuth();
  const { 
    getPatientById, 
    consultations,
    consultationsLoading,
    getConsultationsByPatientId, 
    addConsultation, 
    updateConsultation, 
    deleteConsultation 
  } = useMockDb();

  const [patient, setPatient] = useState<Patient | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConsultation, setEditingConsultation] = useState<ConsultationRecord | undefined>(undefined);
  const [consultationToDelete, setConsultationToDelete] useState<ConsultationRecord | null>(null);

  useEffect(() => {
    const fetchedPatient = getPatientById(patientId); 
    setPatient(fetchedPatient); 

    const unsubscribe = getConsultationsByPatientId(patientId);
    return () => {
      if (unsubscribe) unsubscribe(); 
    };
  }, [patientId, getPatientById, getConsultationsByPatientId]);


  if (user?.role === 'patient' && user.id !== patientId) {
     return (
      <div className="space-y-6">
        <Link href="/dashboard" className="flex items-center text-sm text-primary hover:underline mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
        <p>You can only view your own consultation records.</p>
      </div>
    );
  }


  const handleFormSubmit = async (data: Omit<ConsultationRecord, 'id' | 'patientId'>) => {
    const consultationData = { ...data, patientId };
    try {
      if (editingConsultation) {
        await updateConsultation(editingConsultation.id, consultationData);
        toast({ title: "Consultation Updated", description: `Record for ${new Date(data.date).toLocaleDateString()} updated.` });
      } else {
        await addConsultation(consultationData);
        toast({ title: "Consultation Added", description: `New record for ${new Date(data.date).toLocaleDateString()} added.` });
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
        toast({ title: "Consultation Deleted", description: `Record from ${new Date(consultationToDelete.date).toLocaleDateString()} deleted.` });
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
      cell: ({ row }) => new Date(row.getValue("date")).toLocaleDateString(),
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ row }) => <p className="truncate max-w-xs">{row.getValue("notes")}</p>,
    },
    {
      accessorKey: 'diagnosis',
      header: 'Diagnosis',
    },
    {
      accessorKey: 'treatmentPlan',
      header: 'Treatment Plan',
       cell: ({ row }) => <p className="truncate max-w-xs">{row.getValue("treatmentPlan")}</p>,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const consultation = row.original;
        if (user?.role === 'patient') return null;
        
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

  if (!patient && consultationsLoading) { 
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading patient data...</p>
        </div>
    );
  }
  if (!patient) {
      return <div>Patient not found.</div>
  }

  return (
    <div className="space-y-6">
      <Link href="/patients" className="flex items-center text-sm text-primary hover:underline mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Patients List
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
                This action cannot be undone. This will permanently delete the consultation record from {new Date(consultationToDelete.date).toLocaleDateString()}.
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
