
'use client';

import React, { useState, useMemo, useEffect, use } from 'react';
import type { BabyRecord, Patient, Appointment } from '@/types';
import { useMockDb } from '@/hooks/use-mock-db';
import { useAuth } from '@/hooks/use-auth-hook';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, PlusCircle, Trash2, Edit, ChevronLeft, Loader2, HeartPulse, ShieldAlert, AlertTriangle } from 'lucide-react';
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
import { BabyHealthForm } from '@/components/forms/baby-health-form';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { parseISO } from 'date-fns';
import { database } from '@/lib/firebase-config';
import { ref as dbRef, onValue, query, orderByChild, equalTo } from 'firebase/database';

const PH_TIMEZONE = 'Asia/Manila';

function formatInPHTime_PPP(date: Date | string): string {
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

interface ResolvedPageParams {
  patientId: string; 
}

interface BabyHealthPageProps {
  params: Promise<ResolvedPageParams>; 
}

export default function PatientBabyHealthPage({ params: paramsPromise }: BabyHealthPageProps) {
  const actualParams = use(paramsPromise); 
  const { patientId: motherId } = actualParams; 

  const { user } = useAuth();
  const { 
    babyRecords,
    babyRecordsLoading,
    getBabyRecordsByMotherId, 
    addBabyRecord, 
    updateBabyRecord, 
    deleteBabyRecord 
  } = useMockDb();

  const [mother, setMother] = useState<Patient | undefined>(undefined);
  const [motherLoading, setMotherLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BabyRecord | undefined>(undefined);
  const [recordToDelete, setRecordToDelete] = useState<BabyRecord | null>(null);

  const [hasAccess, setHasAccess] = useState(false);
  const [isAccessChecking, setIsAccessChecking] = useState(true);


  useEffect(() => {
    if (motherId) {
      setMotherLoading(true);
      const motherRecordRef = dbRef(database, `patients/${motherId}`);
      const unsubscribeMother = onValue(motherRecordRef, (snapshot) => {
        if (snapshot.exists()) {
          setMother({ id: snapshot.key!, ...snapshot.val() } as Patient);
        } else {
          setMother(undefined);
        }
        setMotherLoading(false);
      }, (error) => {
        console.error("Error fetching mother's data:", error);
        setMother(undefined);
        setMotherLoading(false);
      });
      
      const unsubscribeBabyRecords = getBabyRecordsByMotherId(motherId);
      return () => {
        unsubscribeMother();
        if (unsubscribeBabyRecords) unsubscribeBabyRecords();
      };
    }
  }, [motherId, getBabyRecordsByMotherId]);

  useEffect(() => {
    let unsubAppointments: (() => void) | undefined;
    if (!user || !motherId) {
      setIsAccessChecking(false);
      setHasAccess(false);
      return;
    }

    if (user.role === 'admin') {
      setHasAccess(true);
      setIsAccessChecking(false);
    } else if (user.role === 'patient') {
      setHasAccess(user.id === motherId); // Patient can only see their own baby's records
      setIsAccessChecking(false);
    } else if (user.role === 'doctor') {
      setIsAccessChecking(true);
      const doctorAppointmentsQuery = query(dbRef(database, 'appointments'), orderByChild('doctorId'), equalTo(user.id));
      unsubAppointments = onValue(doctorAppointmentsQuery, (snapshot) => {
        const appointments = snapshotToArray<Appointment>(snapshot);
        const foundAppointment = appointments.some(app => app.patientId === motherId); // Check if doctor has appointment with the mother
        setHasAccess(foundAppointment);
        setIsAccessChecking(false);
      }, (error) => {
        console.error("Error checking doctor-mother relationship:", error);
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
  }, [user, motherId]);


  const handleFormSubmit = async (data: Omit<BabyRecord, 'id' | 'motherId'>) => {
    const recordData = { ...data, motherId };
    try {
      if (editingRecord) {
        await updateBabyRecord(editingRecord.id, recordData);
        toast({ title: "Baby Record Updated", description: `Record for ${data.name || 'baby'} updated.` });
      } else {
        await addBabyRecord(recordData);
        toast({ title: "Baby Record Added", description: `New record for ${data.name || 'baby'} added.` });
      }
      setIsFormOpen(false);
      setEditingRecord(undefined);
    } catch (error) {
      console.error("Error submitting baby health record:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save baby health record." });
    }
  };

  const openEditForm = (record: BabyRecord) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (recordToDelete) {
      try {
        await deleteBabyRecord(recordToDelete.id);
        toast({ title: "Baby Record Deleted", description: `Record for ${recordToDelete.name || 'baby'} deleted.` });
        setRecordToDelete(null);
      } catch (error) {
        console.error("Error deleting baby health record:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete baby health record." });
      }
    }
  };
  
  const columns: ColumnDef<BabyRecord>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Baby\'s Name',
      cell: ({ row }) => row.getValue("name")?.toString() || 'N/A',
    },
    {
      accessorKey: 'birthDate',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Birth Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const dateVal = row.getValue("birthDate") as string;
        return dateVal ? formatInPHTime_PPP(dateVal) : 'N/A';
      }
    },
    {
      accessorKey: 'birthWeight',
      header: 'Birth Weight',
      cell: ({ row }) => row.getValue("birthWeight")?.toString() || 'N/A',
    },
    {
      accessorKey: 'birthLength',
      header: 'Birth Length',
      cell: ({ row }) => row.getValue("birthLength")?.toString() || 'N/A',
    },
    {
      accessorKey: 'apgarScore',
      header: 'APGAR Score',
      cell: ({ row }) => row.getValue("apgarScore")?.toString() || 'N/A',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const record = row.original;
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
              <DropdownMenuItem onClick={() => openEditForm(record)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRecordToDelete(record)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [user?.role]); // Removed openEditForm, setRecordToDelete as they don't change

  if (motherLoading || isAccessChecking) {
     return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading mother's data and verifying access...</p>
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

  if (!mother) {
    return (
     <div className="space-y-6">
        <Link href="/patients" className="flex items-center text-sm text-primary hover:underline mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Patients List
        </Link>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Mother Not Found</AlertTitle>
          <AlertDescription>
            The mother with ID '{motherId}' could not be found. They may have been removed or the ID is incorrect.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href={user?.role === 'patient' ? "/dashboard" : `/patients/${motherId}/consultations`} className="flex items-center text-sm text-primary hover:underline mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to {user?.role === 'patient' ? "Dashboard" : `${mother.name}'s Records`}
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Baby Health Records for {mother.name}'s Child(ren)</h1>
        {(user?.role === 'admin' || user?.role === 'doctor') && (
            <Button onClick={() => { setEditingRecord(undefined); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Baby Record
            </Button>
        )}
      </div>

      {babyRecordsLoading && babyRecords.length === 0 ? (
         <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="ml-2">Loading baby records...</p>
        </div>
      ) : !babyRecordsLoading && babyRecords.length === 0 ? (
        <Alert>
            <HeartPulse className="h-4 w-4" />
            <AlertTitle>No Baby Health Records</AlertTitle>
            <AlertDescription>
                There are no baby health records available for {mother.name}'s children yet.
                {(user?.role === 'admin' || user?.role === 'doctor') && " You can add a new one."}
            </AlertDescription>
        </Alert>
      ): (
        <DataTable
            columns={columns}
            data={babyRecords}
            filterColumnId="name"
            filterPlaceholder="Filter by baby's name..."
        />
      )}


      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Baby Record' : 'Add New Baby Record'}</DialogTitle>
            <DialogDescription>
              Manage baby health records for {mother.name}'s child.
            </DialogDescription>
          </DialogHeader>
          <BabyHealthForm
            record={editingRecord}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {recordToDelete && (
        <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the baby health record for {recordToDelete.name || 'this baby'}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRecordToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

    