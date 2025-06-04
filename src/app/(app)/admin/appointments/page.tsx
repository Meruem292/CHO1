
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Appointment, Patient, UserRole, AppointmentStatus } from '@/types';
import { useMockDb } from '@/hooks/use-mock-db';
import { useAuth } from '@/hooks/use-auth-hook';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, Loader2, CalendarX2, ShieldAlert, CircleSlash, CheckCircle, CalendarClock } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format, parseISO, isFuture } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as dateFnsTz from 'date-fns-tz';

const PH_TIMEZONE = 'Asia/Manila';

function formatInPHTime_Combined(dateString: string): string {
  if (!dateString) return "Invalid Date";
  try {
    const d = parseISO(dateString);
    const datePart = new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, year: 'numeric', month: 'short', day: 'numeric' }).format(d);
    const timePart = new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
    return `${datePart} at ${timePart}`;
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return "Invalid Date";
  }
}

export default function AdminManageAppointmentsPage() {
  const { user: currentUser } = useAuth();
  const {
    allAppointmentsForAdmin,
    allAppointmentsLoading,
    getAllAppointments,
    updateAppointmentStatus,
  } = useMockDb();

  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  useEffect(() => {
    const unsubscribe = getAllAppointments();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [getAllAppointments]);

  const handleCancelConfirm = async () => {
    if (!appointmentToCancel || !currentUser) return;
    const reason = cancellationReason.trim() || 'Cancelled by admin';
    try {
      await updateAppointmentStatus(appointmentToCancel.id, 'cancelledByAdmin', 'admin', reason);
      toast({ title: "Appointment Cancelled", description: `The appointment has been cancelled.` });
      setAppointmentToCancel(null);
      setCancellationReason('');
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to cancel appointment." });
    }
  };

  const columns: ColumnDef<Appointment>[] = useMemo(() => [
    {
      id: 'dateTime',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Date & Time <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const dateTime = row.original?.appointmentDateTimeStart;
        return dateTime ? formatInPHTime_Combined(dateTime) : 'Invalid Date';
      },
      accessorFn: (row) => row.original?.appointmentDateTimeStart || '',
      sortingFn: 'datetime',
    },
    {
      accessorKey: 'patientName',
      header: 'Patient',
      cell: ({ row }: { row: { original?: Appointment } }) => row.original?.patientName || 'N/A',
    },
    {
      accessorKey: 'doctorName',
      header: 'Doctor',
      cell: ({ row }: { row: { original?: Appointment } }) => row.original?.doctorName || 'N/A',
    },
    {
      accessorKey: 'reasonForVisit',
      header: 'Reason',
      cell: ({ row }) => <p className="truncate max-w-xs">{row.original?.reasonForVisit || 'N/A'}</p>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original?.status;
        if (!status) return 'N/A';
        let icon = <CalendarClock className="mr-2 h-4 w-4 text-blue-500" />;
        if (status === 'completed') icon = <CheckCircle className="mr-2 h-4 w-4 text-green-500" />;
        else if (status.startsWith('cancelled')) icon = <CircleSlash className="mr-2 h-4 w-4 text-red-500" />;
         return <span className={`flex items-center px-2 py-1 text-xs font-medium rounded-full bg-opacity-20 ${
            status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
            status === 'completed' ? 'bg-green-100 text-green-700' :
            status.startsWith('cancelled') ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
        }`}>{icon}{status.charAt(0).toUpperCase() + status.slice(1).replace(/([A-Z])/g, ' $1')}</span>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const appointment = row.original;
        if (!appointment || !appointment.appointmentDateTimeStart) {
            return null;
        }
        if (currentUser?.role !== 'admin' || appointment.status !== 'scheduled' || !isFuture(parseISO(appointment.appointmentDateTimeStart))) {
          return null;
        }
        return (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive/90 border-destructive/50 hover:border-destructive/90" onClick={() => setAppointmentToCancel(appointment)}>
                <CalendarX2 className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </AlertDialogTrigger>
          </AlertDialog>
        );
      },
    },
  ], [currentUser, setAppointmentToCancel]);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You do not have permission to view this page.</AlertDescription>
        </Alert>
        <Link href="/dashboard" className="text-primary hover:underline">Go to Dashboard</Link>
      </div>
    );
  }

  if (allAppointmentsLoading && allAppointmentsForAdmin.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading all appointments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="flex items-center text-sm text-primary hover:underline mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <CalendarClock className="mr-3 h-8 w-8 text-primary" /> Manage All Appointments
        </h1>
      </div>
      <p className="text-muted-foreground">
        View, cancel, or assist in rescheduling appointments for all users.
      </p>

      {allAppointmentsForAdmin.length === 0 && !allAppointmentsLoading ? (
        <Alert>
          <CalendarClock className="h-4 w-4" />
          <AlertTitle>No Appointments Found</AlertTitle>
          <AlertDescription>There are no appointments in the system yet.</AlertDescription>
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          data={allAppointmentsForAdmin}
          filterColumnId="status"
          filterPlaceholder="Filter by status, patient, doctor..."
        />
      )}

      {appointmentToCancel && (
        <AlertDialog open={!!appointmentToCancel} onOpenChange={(open) => { if(!open) {setAppointmentToCancel(null); setCancellationReason('');} }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
              <AlertDialogDescription>
                Admin: Cancel appointment for {appointmentToCancel.patientName} with Dr. {appointmentToCancel.doctorName} on {formatInPHTime_Combined(appointmentToCancel.appointmentDateTimeStart)}?
                Please provide a reason for cancellation.
              </AlertDialogDescription>
            </AlertDialogHeader>
             <div className="py-4">
              <Label htmlFor="cancellationReasonAdmin" className="mb-2 block">Reason for Cancellation</Label>
              <Input
                id="cancellationReasonAdmin"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Reason (e.g., Clinic closed, Emergency)"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {setAppointmentToCancel(null); setCancellationReason('');}}>Keep Appointment</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Confirm Cancellation</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

    
