'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { BabyRecord, Patient } from '@/types';
import { useMockDb } from '@/hooks/use-mock-db';
import { useAuth } from '@/hooks/use-auth-hook';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, PlusCircle, Trash2, Edit, ChevronLeft } from 'lucide-react';
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

interface BabyHealthPageProps {
  params: { patientId: string }; // This is the mother's ID
}

export default function PatientBabyHealthPage({ params }: BabyHealthPageProps) {
  const { patientId: motherId } = params;
  const { user } = useAuth();
  const { 
    getPatientById, // To get mother's name
    getBabyRecordsByMotherId, 
    addBabyRecord, 
    updateBabyRecord, 
    deleteBabyRecord 
  } = useMockDb();

  const [mother, setMother] = useState<Patient | undefined>(undefined);
  const [records, setRecordsState] = useState<BabyRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BabyRecord | undefined>(undefined);
  const [recordToDelete, setRecordToDelete] = useState<BabyRecord | null>(null);

  useEffect(() => {
    setMother(getPatientById(motherId));
    setRecordsState(getBabyRecordsByMotherId(motherId));
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


  const handleFormSubmit = (data: Omit<BabyRecord, 'id' | 'motherId'>) => {
    const recordData = { ...data, motherId };
    if (editingRecord) {
      updateBabyRecord(editingRecord.id, recordData);
      toast({ title: "Baby Record Updated", description: `Record for ${data.name || 'baby'} updated.` });
    } else {
      addBabyRecord(recordData);
      toast({ title: "Baby Record Added", description: `New record for ${data.name || 'baby'} added.` });
    }
    setRecordsState(getBabyRecordsByMotherId(motherId));
    setIsFormOpen(false);
    setEditingRecord(undefined);
  };

  const openEditForm = (record: BabyRecord) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (recordToDelete) {
      deleteBabyRecord(recordToDelete.id);
      toast({ title: "Baby Record Deleted", description: `Record for ${recordToDelete.name || 'baby'} deleted.` });
      setRecordsState(getBabyRecordsByMotherId(motherId));
      setRecordToDelete(null);
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
  ], [user?.role]);

  if (!mother) {
    return <div>Loading mother's data or mother not found...</div>;
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

      <DataTable
        columns={columns}
        data={records}
        filterColumnId="name"
        filterPlaceholder="Filter by baby's name..."
      />

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
