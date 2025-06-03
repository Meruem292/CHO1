'use client';

import React, { useState, useMemo } from 'react';
import type { Patient, UserRole } from '@/types';
import { useMockDb } from '@/hooks/use-mock-db';
import { useAuth } from '@/hooks/use-auth-hook';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, PlusCircle, Trash2, Edit, Eye } from 'lucide-react';
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
  DialogTrigger,
  DialogFooter,
  DialogClose,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PatientForm } from '@/components/forms/patient-form';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function PatientsPage() {
  const { user } = useAuth();
  const { getPatients, addPatient, updatePatient, deletePatient } = useMockDb();
  const [patients, setPatientsState] = useState<Patient[]>(getPatients());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | undefined>(undefined);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);


  React.useEffect(() => {
    setPatientsState(getPatients());
  }, [getPatients]);

  const handleFormSubmit = (data: Omit<Patient, 'id'>) => {
    if (editingPatient) {
      updatePatient(editingPatient.id, data);
      toast({ title: "Patient Updated", description: `${data.name} has been updated.` });
    } else {
      addPatient(data);
      toast({ title: "Patient Added", description: `${data.name} has been added.` });
    }
    setPatientsState(getPatients()); // Refresh local state
    setIsFormOpen(false);
    setEditingPatient(undefined);
  };

  const openEditForm = (patient: Patient) => {
    setEditingPatient(patient);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (patientToDelete) {
      deletePatient(patientToDelete.id);
      toast({ title: "Patient Deleted", description: `${patientToDelete.name} has been deleted.` });
      setPatientsState(getPatients()); // Refresh local state
      setPatientToDelete(null);
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
       cell: ({ row }) => new Date(row.getValue("dateOfBirth")).toLocaleDateString(),
    },
    {
      accessorKey: 'contact',
      header: 'Contact',
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
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => openEditForm(patient)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Patient
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Manage Patients</h1>
        {(user?.role === 'admin' || user?.role === 'doctor') && (
          <Button onClick={() => { setEditingPatient(undefined); setIsFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Patient
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={patients}
        filterColumnId="name"
        filterPlaceholder="Filter by name..."
      />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingPatient ? 'Edit Patient' : 'Add New Patient'}</DialogTitle>
            <DialogDescription>
              {editingPatient ? `Update details for ${editingPatient.name}.` : 'Fill in the details to add a new patient.'}
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
                "{patientToDelete.name}" and all their associated records.
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
