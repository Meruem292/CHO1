
'use client';

import React, { useState, useMemo, useEffect, use } from 'react';
import type { BabyRecord, Patient, Appointment } from '@/types';
import { useMockDb } from '@/hooks/use-mock-db';
import { useAuth } from '@/hooks/use-auth-hook';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, PlusCircle, Trash2, Edit, Loader2, HeartPulse, AlertTriangle, UserMdIcon, Archive } from 'lucide-react';
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
import { parseISO } from 'date-fns';
import { database } from '@/lib/firebase-config';
import { ref as dbRef, onValue } from 'firebase/database';

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

  const [motherName, setMotherName] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BabyRecord | undefined>(undefined);
  const [recordToArchive, setRecordToArchive] = useState<BabyRecord | null>(null);

  useEffect(() => {
    const motherRecordRef = dbRef(database, `patients/${motherId}/name`);
    const unsubName = onValue(motherRecordRef, (snapshot) => {
        setMotherName(snapshot.val() || 'Mother');
    });
    const unsubscribeBabyRecords = getBabyRecordsByMotherId(motherId);
    return () => {
      unsubName();
      if (unsubscribeBabyRecords) unsubscribeBabyRecords();
    };
  }, [motherId, getBabyRecordsByMotherId]);


  const handleFormSubmit = async (data: Omit<BabyRecord, 'id' | 'motherId' | 'doctorId' | 'doctorName'>) => {
    const recordBaseData = { ...data, motherId };
    let fullRecordData: Omit<BabyRecord, 'id'> = { ...recordBaseData };

    if (user && (user.role === 'doctor' || user.role === 'midwife/nurse')) {
        fullRecordData = {
            ...fullRecordData,
            doctorId: user.id,
            doctorName: user.name,
        };
    }
    
    try {
      if (editingRecord) {
        await updateBabyRecord(editingRecord.id, fullRecordData);
        toast({ title: "Baby Record Updated", description: `Record for ${data.name || 'baby'} updated.` });
      } else {
        await addBabyRecord(fullRecordData);
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

  const handleArchiveConfirm = async () => {
    if (recordToArchive) {
      try {
        await deleteBabyRecord(recordToArchive.id);
        toast({ title: "Baby Record Archived", description: `Record for ${recordToArchive.name || 'baby'} archived.` });
        setRecordToArchive(null);
      } catch (error) {
        console.error("Error archiving baby health record:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to archive baby health record." });
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
        const dateVal = row.getValue("birthDate") as string | undefined;
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
      accessorKey: 'doctorName',
      header: 'Recorded By',
      cell: ({ row }) => row.original.doctorName || 'N/A',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const record = row.original;
        const canEdit = user?.role === 'admin' || ((user?.role === 'doctor' || user?.role === 'midwife/nurse') && user.id === record.doctorId);
        if (!canEdit && user?.role !== 'patient') return null;
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
              <DropdownMenuItem onClick={() => setRecordToArchive(record)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Archive className="mr-2 h-4 w-4" /> Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [user?.role, user?.id]); 

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Baby Health Records for {motherName}'s Child(ren)</h2>
        {(user?.role === 'admin' || user?.role === 'doctor' || user?.role === 'midwife/nurse') && (
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
                There are no baby health records available for {motherName}'s children yet.
                {(user?.role === 'admin' || user?.role === 'doctor' || user?.role === 'midwife/nurse') && " You can add a new one."}
            </AlertDescription>
        </Alert>
      ): (
        <DataTable
            columns={columns}
            data={babyRecords}
            filterColumnId="name"
            filterPlaceholder="Filter by baby's name, doctor..."
        />
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Baby Record' : 'Add New Baby Record'}</DialogTitle>
            <DialogDescription>
              Manage baby health records for {motherName}'s child.
              {(user?.role === 'doctor' || user?.role === 'midwife/nurse') && !editingRecord && ` This record will be attributed to you, ${user.name}.`}
              {(user?.role === 'doctor' || user?.role === 'midwife/nurse') && editingRecord && editingRecord.doctorId === user.id && ` You are editing your entry.`}
              {(user?.role === 'doctor' || user?.role === 'midwife/nurse') && editingRecord && editingRecord.doctorId !== user.id && ` You are editing an entry made by ${editingRecord.doctorName || 'another provider'}.`}
            </DialogDescription>
          </DialogHeader>
          <BabyHealthForm
            record={editingRecord}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {recordToArchive && (
        <AlertDialog open={!!recordToArchive} onOpenChange={() => setRecordToArchive(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will archive the baby health record for {recordToArchive.name || 'this baby'}. You can restore it later from the archive page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRecordToArchive(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchiveConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Archive</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
