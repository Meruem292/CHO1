'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { MaternityRecord, Patient } from '@/types';
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
import { MaternityHistoryForm } from '@/components/forms/maternity-history-form';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

interface MaternityHistoryPageProps {
  params: { patientId: string };
}

export default function PatientMaternityHistoryPage({ params }: MaternityHistoryPageProps) {
  const { patientId } = params;
  const { user } = useAuth();
  const { 
    getPatientById, 
    getMaternityHistoryByPatientId, 
    addMaternityRecord, 
    updateMaternityRecord, 
    deleteMaternityRecord 
  } = useMockDb();

  const [patient, setPatient] = useState<Patient | undefined>(undefined);
  const [records, setRecordsState] = useState<MaternityRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaternityRecord | undefined>(undefined);
  const [recordToDelete, setRecordToDelete] = useState<MaternityRecord | null>(null);

  useEffect(() => {
    setPatient(getPatientById(patientId));
    setRecordsState(getMaternityHistoryByPatientId(patientId));
  }, [patientId, getPatientById, getMaternityHistoryByPatientId]);

  if (user?.role === 'patient' && user.id !== patientId) {
    return (
     <div className="space-y-6">
       <Link href="/dashboard" className="flex items-center text-sm text-primary hover:underline mb-4">
         <ChevronLeft className="h-4 w-4 mr-1" />
         Back to Dashboard
       </Link>
       <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
       <p>You can only view your own maternity records.</p>
     </div>
   );
 }

  const handleFormSubmit = (data: Omit<MaternityRecord, 'id' | 'patientId'>) => {
    const recordData = { ...data, patientId };
    if (editingRecord) {
      updateMaternityRecord(editingRecord.id, recordData);
      toast({ title: "Maternity Record Updated", description: `Pregnancy #${data.pregnancyNumber} record updated.` });
    } else {
      addMaternityRecord(recordData);
      toast({ title: "Maternity Record Added", description: `Pregnancy #${data.pregnancyNumber} record added.` });
    }
    setRecordsState(getMaternityHistoryByPatientId(patientId));
    setIsFormOpen(false);
    setEditingRecord(undefined);
  };

  const openEditForm = (record: MaternityRecord) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (recordToDelete) {
      deleteMaternityRecord(recordToDelete.id);
      toast({ title: "Maternity Record Deleted", description: `Pregnancy #${recordToDelete.pregnancyNumber} record deleted.` });
      setRecordsState(getMaternityHistoryByPatientId(patientId));
      setRecordToDelete(null);
    }
  };
  
  const columns: ColumnDef<MaternityRecord>[] = useMemo(() => [
    {
      accessorKey: 'pregnancyNumber',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Pregnancy #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'deliveryDate',
      header: 'Delivery Date',
      cell: ({ row }) => {
        const dateVal = row.getValue("deliveryDate") as string;
        return dateVal ? new Date(dateVal).toLocaleDateString() : 'N/A';
      }
    },
    {
      accessorKey: 'outcome',
      header: 'Outcome',
    },
    {
      accessorKey: 'complications',
      header: 'Complications',
      cell: ({ row }) => <p className="truncate max-w-xs">{row.getValue("complications") || 'None'}</p>,
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

  if (!patient) {
    return <div>Loading patient data or patient not found...</div>;
  }

  return (
    <div className="space-y-6">
       <Link href="/patients" className="flex items-center text-sm text-primary hover:underline mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Patients List
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Maternity History for {patient.name}</h1>
         {(user?.role === 'admin' || user?.role === 'doctor') && (
            <Button onClick={() => { setEditingRecord(undefined); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Maternity Record
            </Button>
         )}
      </div>

      <DataTable
        columns={columns}
        data={records}
        filterColumnId="outcome"
        filterPlaceholder="Filter by outcome..."
      />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Maternity Record' : 'Add New Maternity Record'}</DialogTitle>
            <DialogDescription>
              Manage maternity history for {patient.name}.
            </DialogDescription>
          </DialogHeader>
          <MaternityHistoryForm
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
                This action cannot be undone. This will permanently delete the maternity record for Pregnancy #{recordToDelete.pregnancyNumber}.
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
