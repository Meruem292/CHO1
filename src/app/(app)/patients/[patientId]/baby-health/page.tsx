
'use client';

import React, { useState, useMemo, useEffect, use } from 'react'; // Import `use`
import type { BabyRecord, Patient } from '@/types';
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
import { BabyHealthForm } from '@/components/forms/baby-health-form';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

interface ResolvedPageParams {
  patientId: string; // This is the mother's ID
}

interface BabyHealthPageProps {
  params: Promise<ResolvedPageParams>; // params is a Promise
}

export default function PatientBabyHealthPage({ params: paramsPromise }: BabyHealthPageProps) {
  const actualParams = use(paramsPromise); // Unwrap the Promise
  const { patientId: motherId } = actualParams; // Destructure from resolved params, rename to motherId for clarity

  const { user } = useAuth();
  const { 
    getPatientById, 
    babyRecords,
    babyRecordsLoading,
    getBabyRecordsByMotherId, 
    addBabyRecord, 
    updateBabyRecord, 
    deleteBabyRecord 
  } = useMockDb();

  const [mother, setMother] = useState<Patient | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BabyRecord | undefined>(undefined);
  const [recordToDelete, setRecordToDelete] = useState<BabyRecord | null>(null);

  useEffect(() => {
    const fetchedMother = getPatientById(motherId); 
    setMother(fetchedMother);

    const unsubscribe = getBabyRecordsByMotherId(motherId);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [motherId, getPatientById, getBabyRecordsByMotherId]);


  if (user?.role === 'patient' && user.id !== motherId) {
     return (
      <div className="space-y-6">
        <Link href="/dashboard" className="flex items-center text-sm text-primary hover:underline mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
        <p>You can only view your own baby's health records.</p>
      </div>
    );
  }


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
      cell: ({ row }) => row.getValue("name") || 'N/A',
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
      cell: ({ row }) => new Date(row.getValue("birthDate")).toLocaleDateString(),
    },
    {
      accessorKey: 'birthWeight',
      header: 'Birth Weight',
    },
    {
      accessorKey: 'birthLength',
      header: 'Birth Length',
    },
    {
      accessorKey: 'apgarScore',
      header: 'APGAR Score',
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
  ], [user?.role, openEditForm, setRecordToDelete]);

  if (!mother && babyRecordsLoading) {
     return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading mother's data...</p>
        </div>
    );
  }
  if (!mother) {
    return <div>Mother's data not found...</div>;
  }

  return (
    <div className="space-y-6">
      <Link href="/patients" className="flex items-center text-sm text-primary hover:underline mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Patients List
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
      ) : (
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
