
'use client';

import React, { useState, useMemo, useEffect, use } from 'react';
import type { MaternityRecord, Patient, Appointment, BabyRecord } from '@/types';
import { useMockDb } from '@/hooks/use-mock-db';
import { useAuth } from '@/hooks/use-auth-hook';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, PlusCircle, Trash2, Edit, Loader2, Baby, AlertTriangle, UserMdIcon, HeartPulse } from 'lucide-react'; 
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
import { MaternityHistoryForm } from '@/components/forms/maternity-history-form';
import { BabyHealthForm } from '@/components/forms/baby-health-form'; // Import BabyHealthForm
import type { babyHealthSchema as babyHealthFormSchemaType } from '@/zod-schemas'; // For BabyHealthForm submit type
import type * as z from 'zod'; // For BabyHealthForm submit type
import { toast } from '@/hooks/use-toast';
import { database } from '@/lib/firebase-config';
import { ref as dbRef, onValue } from 'firebase/database';
import { parseISO } from 'date-fns';

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

interface MaternityHistoryPageProps {
  params: Promise<ResolvedPageParams>;
}

export default function PatientMaternityHistoryPage({ params: paramsPromise }: MaternityHistoryPageProps) {
  const actualParams = use(paramsPromise);
  const { patientId } = actualParams; 

  const { user } = useAuth();
  const { 
    maternityRecords,
    maternityRecordsLoading,
    getMaternityHistoryByPatientId, 
    addMaternityRecord, 
    updateMaternityRecord, 
    deleteMaternityRecord,
    addBabyRecord // For registering a new baby
  } = useMockDb();

  const [patientName, setPatientName] = useState<string>('');
  const [isMaternityFormOpen, setIsMaternityFormOpen] = useState(false);
  const [editingMaternityRecord, setEditingMaternityRecord] = useState<MaternityRecord | undefined>(undefined);
  const [maternityRecordToDelete, setMaternityRecordToDelete] = useState<MaternityRecord | null>(null);

  // State for Baby Registration Dialog
  const [isRegisterBabyFormOpen, setIsRegisterBabyFormOpen] = useState(false);


  useEffect(() => {
    const patientRecordRef = dbRef(database, `patients/${patientId}/name`);
    const unsubName = onValue(patientRecordRef, (snapshot) => {
        setPatientName(snapshot.val() || 'Patient');
    });
    const unsubscribeMaternity = getMaternityHistoryByPatientId(patientId);
    return () => {
      unsubName();
      if (unsubscribeMaternity) unsubscribeMaternity();
    };
  }, [patientId, getMaternityHistoryByPatientId]);


  const handleMaternityFormSubmit = async (data: Omit<MaternityRecord, 'id' | 'patientId' | 'doctorId' | 'doctorName'>) => {
    const recordBaseData = { ...data, patientId };
    let fullRecordData: Omit<MaternityRecord, 'id'> = { ...recordBaseData };

    if (user && (user.role === 'doctor' || user.role === 'midwife/nurse')) {
      fullRecordData = {
        ...fullRecordData,
        doctorId: user.id,
        doctorName: user.name,
      };
    }

    try {
      if (editingMaternityRecord) {
        await updateMaternityRecord(editingMaternityRecord.id, fullRecordData);
        toast({ title: "Maternity Record Updated", description: `Pregnancy #${data.pregnancyNumber} record updated.` });
      } else {
        await addMaternityRecord(fullRecordData);
        toast({ title: "Maternity Record Added", description: `Pregnancy #${data.pregnancyNumber} record added.` });
      }
      setIsMaternityFormOpen(false);
      setEditingMaternityRecord(undefined);
    } catch (error) {
      console.error("Error submitting maternity record:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save maternity record." });
    }
  };

  const openEditMaternityForm = (record: MaternityRecord) => {
    setEditingMaternityRecord(record);
    setIsMaternityFormOpen(true);
  };

  const handleDeleteMaternityConfirm = async () => {
    if (maternityRecordToDelete) {
      try {
        await deleteMaternityRecord(maternityRecordToDelete.id);
        toast({ title: "Maternity Record Deleted", description: `Pregnancy #${maternityRecordToDelete.pregnancyNumber} record deleted.` });
        setMaternityRecordToDelete(null);
      } catch (error) {
        console.error("Error deleting maternity record:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete maternity record." });
      }
    }
  };

  const handleRegisterBabySubmit = async (babyData: Omit<z.infer<typeof babyHealthFormSchemaType>, 'id' | 'motherId'>) => {
    const recordBaseData = { ...babyData, motherId: patientId }; // motherId is the current patientId
    let fullRecordData: Omit<BabyRecord, 'id'> = { ...recordBaseData };

    if (user && (user.role === 'doctor' || user.role === 'midwife/nurse')) {
        fullRecordData = {
            ...fullRecordData,
            doctorId: user.id,
            doctorName: user.name,
        };
    }
    
    try {
      await addBabyRecord(fullRecordData);
      toast({ title: "Baby Registered Successfully", description: `New record for ${babyData.name || 'baby'} added.` });
      setIsRegisterBabyFormOpen(false);
    } catch (error) {
      console.error("Error registering baby:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to register baby." });
    }
  };
  
  const maternityColumns: ColumnDef<MaternityRecord>[] = useMemo(() => [
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
        const dateVal = row.getValue("deliveryDate") as string | undefined;
        return dateVal ? formatInPHTime_PPP(dateVal) : 'N/A';
      }
    },
    {
      accessorKey: 'outcome',
      header: 'Outcome',
      cell: ({ row }) => row.getValue("outcome")?.toString() || 'N/A',
    },
    {
      accessorKey: 'complications',
      header: 'Complications',
      cell: ({ row }) => <p className="truncate max-w-xs">{row.getValue("complications")?.toString() || 'None'}</p>,
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
              <DropdownMenuItem onClick={() => openEditMaternityForm(record)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setMaternityRecordToDelete(record)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [user?.role, user?.id, openEditMaternityForm, setMaternityRecordToDelete]);

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Maternity History</h2>
         <div className="flex space-x-2">
            {(user?.role === 'admin' || user?.role === 'doctor' || user?.role === 'midwife/nurse') && (
                <Button onClick={() => { setEditingMaternityRecord(undefined); setIsMaternityFormOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Maternity Record
                </Button>
            )}
            {(user?.role === 'admin' || user?.role === 'doctor' || user?.role === 'midwife/nurse') && (
                <Button variant="secondary" onClick={() => setIsRegisterBabyFormOpen(true)}>
                    <HeartPulse className="mr-2 h-4 w-4" /> Register Baby
                </Button>
            )}
         </div>
      </div>

      {maternityRecordsLoading && maternityRecords.length === 0 ? (
        <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="ml-2">Loading maternity records...</p>
        </div>
      ) : !maternityRecordsLoading && maternityRecords.length === 0 ? (
        <Alert>
            <Baby className="h-4 w-4" />
            <AlertTitle>No Maternity History</AlertTitle>
            <AlertDescription>
                There are no maternity history records available for {patientName} yet.
                {(user?.role === 'admin' || user?.role === 'doctor' || user?.role === 'midwife/nurse') && " You can add a new one or register a baby."}
            </AlertDescription>
        </Alert>
      ) : (
        <DataTable
            columns={maternityColumns}
            data={maternityRecords}
            filterColumnId="outcome" 
            filterPlaceholder="Filter by outcome, doctor..."
        />
      )}

      <Dialog open={isMaternityFormOpen} onOpenChange={setIsMaternityFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMaternityRecord ? 'Edit Maternity Record' : 'Add New Maternity Record'}</DialogTitle>
            <DialogDescription>
              Manage maternity history for {patientName}.
              {(user?.role === 'doctor' || user?.role === 'midwife/nurse') && !editingMaternityRecord && ` This record will be attributed to you, ${user.name}.`}
              {(user?.role === 'doctor' || user?.role === 'midwife/nurse') && editingMaternityRecord && editingMaternityRecord.doctorId === user.id && ` You are editing your entry.`}
              {(user?.role === 'doctor' || user?.role === 'midwife/nurse') && editingMaternityRecord && editingMaternityRecord.doctorId !== user.id && ` You are editing an entry made by ${editingMaternityRecord.doctorName || 'another provider'}.`}
            </DialogDescription>
          </DialogHeader>
          <MaternityHistoryForm
            record={editingMaternityRecord}
            onSubmit={handleMaternityFormSubmit}
            onCancel={() => setIsMaternityFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {maternityRecordToDelete && (
        <AlertDialog open={!!maternityRecordToDelete} onOpenChange={() => setMaternityRecordToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the maternity record for Pregnancy #{maternityRecordToDelete.pregnancyNumber}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setMaternityRecordToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteMaternityConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Dialog for Registering a Baby */}
      <Dialog open={isRegisterBabyFormOpen} onOpenChange={setIsRegisterBabyFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Register New Baby for {patientName}</DialogTitle>
            <DialogDescription>
              Fill in the details for the new baby.
              {(user?.role === 'doctor' || user?.role === 'midwife/nurse') && ` This record will be attributed to you, ${user.name}.`}
            </DialogDescription>
          </DialogHeader>
          <BabyHealthForm
            // record prop is undefined for new baby
            onSubmit={handleRegisterBabySubmit}
            onCancel={() => setIsRegisterBabyFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

    </div>
  );
}
