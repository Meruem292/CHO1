
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { Patient } from '@/types';
import { useMockDb } from '@/hooks/use-mock-db';
import { useAuth } from '@/hooks/use-auth-hook';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, PlusCircle, Trash2, Edit, Eye, Loader2 } from 'lucide-react';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { PatientForm } from '@/components/forms/patient-form';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function PatientsPage() {
  const { user } = useAuth();
  const { patients, patientsLoading, addPatient, updatePatient, deletePatient } = useMockDb();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | undefined>(undefined);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  const displayedPatients = useMemo(() => {
    return patients.filter(p => p.role === 'patient');
  }, [patients]);

  const handleFormSubmit = async (data: Omit<Patient, 'id' | 'role'>) => {
    // When admin adds via "Manage Patients", role should default to 'patient'
    const patientDataWithRole: Omit<Patient, 'id'> = { ...data, role: 'patient' };
    try {
      if (editingPatient) {
        await updatePatient(editingPatient.id, patientDataWithRole);
        toast({ title: "Patient Updated", description: `${data.name} has been updated.` });
      } else {
        await addPatient(patientDataWithRole);
        toast({ title: "Patient Added", description: `${data.name} has been added.` });
      }
      setIsFormOpen(false);
      setEditingPatient(undefined);
    } catch (error) {
      console.error("Error submitting patient form:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save patient data." });
    }
  };

  const openEditForm = (patient: Patient) => {
    setEditingPatient(patient);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (patientToDelete) {
      try {
        await deletePatient(patientToDelete.id);
        toast({ title: "Patient Deleted", description: `${patientToDelete.name} has been deleted.` });
        setPatientToDelete(null);
      } catch (error) {
        console.error("Error deleting patient:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete patient." });
      }
    }
  };

  const columns: ColumnDef<Patient>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'dateOfBirth',
      header: 'Date of Birth',
       cell: ({ row }) => {
        const dob = row.getValue("dateOfBirth") as string;
        return dob ? new Date(dob).toLocaleDateString() : 'N/A';
       }
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'phoneNumber',
      header: 'Phone Number',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const patient = row.original;
        return (
          <div className="flex items-center space-x-2">
             <Link href={`/patients/${patient.id}/consultations`}>
              <Button variant="outline" size="sm">
                <Eye className="mr-2 h-4 w-4" /> View Records
              </Button>
            </Link>
            {(user?.role === 'admin') && ( 
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Admin Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => openEditForm(patient)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Patient Info
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setPatientToDelete(patient)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Patient
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      },
    },
  ], [user?.role]);


  if (user?.role === 'patient') {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4 font-headline">Access Denied</h1>
        <p>This page is for administrative staff only.</p>
      </div>
    );
  }

  if (patientsLoading && displayedPatients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading patients...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Manage Patients</h1>
        {(user?.role === 'admin') && ( // Only admin can add patients
          <Button onClick={() => { setEditingPatient(undefined); setIsFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Patient
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={displayedPatients} // Use the filtered list
        filterColumnId="name"
        filterPlaceholder="Filter by name..."
      />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingPatient ? 'Edit Patient' : 'Add New Patient'}</DialogTitle>
            <DialogDescription>
              {editingPatient ? `Update details for ${editingPatient.name}.` : 'Fill in the details to add a new patient. This will create a user with the "patient" role.'}
            </DialogDescription>
          </DialogHeader>
          <PatientForm
            patient={editingPatient}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {patientToDelete && (
        <AlertDialog open={!!patientToDelete} onOpenChange={() => setPatientToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the patient 
                "{patientToDelete.name}" and all their associated records (consultations, maternity, baby health).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPatientToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
