
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { Patient, Appointment } from '@/types';
import { useMockDb } from '@/hooks/use-mock-db';
import { useAuth } from '@/hooks/use-auth-hook';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, PlusCircle, Archive, Edit, Eye, Loader2, Users } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PatientForm } from '@/components/forms/patient-form';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { parseISO } from 'date-fns';
import { database } from '@/lib/firebase-config';
import { ref as dbRef, query, orderByChild, equalTo, onValue } from 'firebase/database';

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

const snapshotToArray = <T extends { id: string }>(snapshot: any): T[] => {
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  if (data === null || typeof data !== 'object') return [];
  return Object.keys(data).map(key => ({ ...data[key], id: key } as T));
};

export default function PatientsPage() {
  const { user } = useAuth();
  const { 
    patients: allPatientsFromHook, 
    patientsLoading, 
    addPatient, 
    updatePatient, 
    deletePatient 
  } = useMockDb();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | undefined>(undefined);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  const [doctorAppointments, setDoctorAppointments] = useState<Appointment[]>([]);
  const [doctorAppointmentsLoading, setDoctorAppointmentsLoading] = useState(user?.role === 'doctor');

  useEffect(() => {
    let unsubAppointments: (() => void) | undefined;
    if (user?.role === 'doctor' && user.id) {
      setDoctorAppointmentsLoading(true);
      const appointmentsQuery = query(dbRef(database, 'appointments'), orderByChild('doctorId'), equalTo(user.id));
      unsubAppointments = onValue(appointmentsQuery, (snapshot) => {
        setDoctorAppointments(snapshotToArray<Appointment>(snapshot));
        setDoctorAppointmentsLoading(false);
      }, (error) => {
        console.error("Error fetching doctor's appointments:", error);
        setDoctorAppointmentsLoading(false);
      });
    }
    return () => {
      if (unsubAppointments) unsubAppointments();
    };
  }, [user]);

  const displayedPatients = useMemo(() => {
    if (user?.role === 'admin') {
      return allPatientsFromHook.filter(p => p.role === 'patient');
    }
    if (user?.role === 'doctor') {
      if (doctorAppointmentsLoading) return [];
      const patientIdsForDoctor = new Set(doctorAppointments.map(app => app.patientId));
      return allPatientsFromHook.filter(p => p.role === 'patient' && patientIdsForDoctor.has(p.id));
    }
    return []; 
  }, [allPatientsFromHook, user, doctorAppointments, doctorAppointmentsLoading]);

  const handleFormSubmit = async (data: Omit<Patient, 'id' | 'role'>) => {
    const patientDataWithRole: Omit<Patient, 'id'> = { ...data, role: 'patient' };
    try {
      if (editingPatient) {
        await updatePatient(editingPatient.id, patientDataWithRole);
        toast({ title: "Patient Updated", description: `${data.firstName} ${data.lastName} has been updated.` });
      } else {
        const constructedName = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ');
        await addPatient({ ...patientDataWithRole, name: constructedName, firstName: data.firstName, lastName: data.lastName, middleName: data.middleName });
        toast({ title: "Patient Added", description: `${constructedName} has been added.` });
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
        toast({ title: "Patient Archived", description: `${patientToDelete.name} has been archived.` });
        setPatientToDelete(null);
      } catch (error) {
        console.error("Error deleting patient:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to archive patient." });
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
        const dob = row.getValue("dateOfBirth") as string | undefined;
        return dob ? formatInPHTime_PPP(dob) : 'N/A';
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
             <Link href={`/patients/${patient.id}/profile`}>
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
                    <Archive className="mr-2 h-4 w-4" /> Archive Patient
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
      <div className="space-y-6">
        <Alert variant="destructive">
            <Users className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>This page is for administrative staff and doctors only.</AlertDescription>
        </Alert>
         <Link href="/dashboard" className="text-primary hover:underline">
            Go to Dashboard
        </Link>
      </div>
    );
  }

  const overallLoading = patientsLoading || (user?.role === 'doctor' && doctorAppointmentsLoading);

  if (overallLoading && displayedPatients.length === 0) {
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
        <h1 className="text-3xl font-bold font-headline">
          {user?.role === 'admin' ? 'Manage All Patients' : 'My Associated Patients'}
        </h1>
        {(user?.role === 'admin') && ( 
          <Button onClick={() => { setEditingPatient(undefined); setIsFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Patient
          </Button>
        )}
      </div>

      {(!overallLoading && displayedPatients.length === 0) ? (
         <Alert>
            <Users className="h-4 w-4" />
            <AlertTitle>No Patients Found</AlertTitle>
            <AlertDescription>
                {user?.role === 'admin' ? "There are no patients in the system yet. You can add one using the 'Add Patient' button." : "You do not have any patients associated with your appointments yet."}
            </AlertDescription>
        </Alert>
      ) : (
        <DataTable
            columns={columns}
            data={displayedPatients} 
            filterColumnId="name"
            filterPlaceholder="Filter by name..."
        />
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
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
                This action cannot be undone. This will permanently archive the patient 
                "{patientToDelete.name}" and all their associated records (consultations, maternity, baby health).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPatientToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
